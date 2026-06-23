from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.drawing import Drawing
from app.schemas.drawing import DrawingCreate
from app.utils.serializers import serialize_drawing

router = APIRouter(prefix="/api", tags=["drawings"])


@router.get("/drawings")
def list_drawings(db: Session = Depends(get_db)):
    return [serialize_drawing(d) for d in db.query(Drawing).order_by(Drawing.created_at.asc()).all()]


@router.post("/drawings", status_code=201)
async def create_drawing(
    payload: DrawingCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    drawing = Drawing(
        path=payload.path,
        color=payload.color,
        width=payload.width,
        created_at=datetime.now(timezone.utc)
    )
    db.add(drawing)
    db.commit()
    db.refresh(drawing)

    data = serialize_drawing(drawing)
    sio = request.app.state.sio
    await sio.emit("drawing-added", data)
    return data


@router.delete("/drawings")
async def clear_drawings(request: Request, db: Session = Depends(get_db)):
    db.query(Drawing).delete(synchronize_session=False)
    db.commit()

    sio = request.app.state.sio
    await sio.emit("drawings-cleared", {})
    return {"message": "All drawings cleared"}


@router.delete("/drawings/{drawing_id}")
async def delete_drawing(
    drawing_id: str,
    request: Request,
    db: Session = Depends(get_db),
):
    from uuid import UUID
    try:
        uuid_obj = UUID(drawing_id)
    except ValueError:
        return {"message": "Invalid UUID format"}, 400

    drawing = db.query(Drawing).filter(Drawing.id == uuid_obj).first()
    if not drawing:
        return {"message": "Drawing not found"}, 404

    db.delete(drawing)
    db.commit()

    sio = request.app.state.sio
    await sio.emit("drawing-deleted", {"id": drawing_id})
    return {"message": "Drawing deleted"}

