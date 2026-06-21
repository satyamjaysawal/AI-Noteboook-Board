import re
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.connection import Connection
from app.models.note import Note
from app.schemas.note import NoteCreate, NoteUpdate
from app.utils.serializers import serialize_note

router = APIRouter(prefix="/api", tags=["notes"])

UUID_REGEX = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
    re.IGNORECASE,
)


def validate_uuid(note_id: str) -> UUID:
    if not UUID_REGEX.match(note_id):
        raise HTTPException(status_code=400, detail="Invalid note ID")
    return UUID(note_id)


@router.get("/notes")
def list_notes(
    tag: str | None = None,
    pinned: str | None = None,
    search: str | None = None,
    sortBy: str = Query("createdAt"),
    order: str = Query("desc"),
    db: Session = Depends(get_db),
):
    query = db.query(Note)

    if tag:
        query = query.filter(Note.tags.contains([tag]))
    if pinned is not None:
        query = query.filter(Note.is_pinned == (pinned == "true"))
    if search:
        pattern = f"%{search}%"
        query = query.filter(or_(Note.title.ilike(pattern), Note.content.ilike(pattern)))

    sort_field = Note.updated_at if sortBy == "updatedAt" else Note.created_at
    query = query.order_by(sort_field.desc() if order == "desc" else sort_field.asc())

    return [serialize_note(note) for note in query.all()]


@router.get("/notes/{note_id}")
def get_note(note_id: str, db: Session = Depends(get_db)):
    uid = validate_uuid(note_id)
    note = db.get(Note, uid)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return serialize_note(note)


@router.post("/notes", status_code=201)
async def create_note(payload: NoteCreate, request: Request, db: Session = Depends(get_db)):
    note = Note(
        title=payload.title,
        content=payload.content,
        position=payload.position.model_dump(),
        styling=payload.styling.model_dump(),
        image_url=payload.imageUrl,
        tags=payload.tags,
        is_pinned=payload.isPinned,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    db.add(note)
    db.commit()
    db.refresh(note)

    data = serialize_note(note)
    sio = request.app.state.sio
    await sio.emit("note-added", data)
    return data


@router.put("/notes/{note_id}")
async def update_note(
    note_id: str,
    payload: NoteUpdate,
    request: Request,
    db: Session = Depends(get_db),
):

    uid = validate_uuid(note_id)
    note = db.get(Note, uid)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    note.title = payload.title or "Untitled"
    note.content = payload.content
    note.position = payload.position.model_dump()
    note.styling = payload.styling.model_dump()
    note.image_url = payload.imageUrl
    note.tags = payload.tags if isinstance(payload.tags, list) else []
    note.is_pinned = payload.isPinned

    db.commit()
    db.refresh(note)

    data = serialize_note(note)
    sio = request.app.state.sio
    await sio.emit("note-updated", data)
    return data


@router.delete("/notes/{note_id}")
async def delete_note(note_id: str, request: Request, db: Session = Depends(get_db)):
    uid = validate_uuid(note_id)
    note = db.get(Note, uid)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    db.query(Connection).filter(
        or_(Connection.source == uid, Connection.target == uid)
    ).delete(synchronize_session=False)
    db.delete(note)
    db.commit()

    sio = request.app.state.sio
    await sio.emit("note-deleted", note_id)
    await sio.emit("connection-deleted", {"noteId": note_id})

    return {"message": "Note and associated connections deleted"}


@router.patch("/notes/{note_id}/pin")
async def toggle_pin(note_id: str, request: Request, db: Session = Depends(get_db)):
    uid = validate_uuid(note_id)
    note = db.get(Note, uid)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    note.is_pinned = not note.is_pinned
    db.commit()
    db.refresh(note)

    data = serialize_note(note)
    sio = request.app.state.sio
    await sio.emit("note-updated", data)
    return data