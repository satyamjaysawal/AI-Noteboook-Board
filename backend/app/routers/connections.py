from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.connection import Connection
from app.models.note import Note
from app.schemas.connection import ConnectionCreate
from app.utils.serializers import serialize_connection

router = APIRouter(prefix="/api", tags=["connections"])


@router.get("/connections")
def list_connections(db: Session = Depends(get_db)):
    return [serialize_connection(conn) for conn in db.query(Connection).all()]


@router.post("/connections", status_code=201)
async def create_connection(
    payload: ConnectionCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    source = db.get(Note, payload.source)
    target = db.get(Note, payload.target)

    if not source or not target:
        raise HTTPException(status_code=400, detail="Source or target note does not exist")

    connection = Connection(
        source=payload.source,
        target=payload.target,
        source_handle=payload.sourceHandle,
        target_handle=payload.targetHandle,
        label=payload.label,
        created_at=datetime.now(timezone.utc)
    )
    db.add(connection)
    db.commit()
    db.refresh(connection)

    data = serialize_connection(connection)
    sio = request.app.state.sio
    await sio.emit("connection-added", data)
    return data


@router.delete("/connections/{connection_id}")
async def delete_connection(
    connection_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
):
    connection = db.get(Connection, connection_id)
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")

    conn_id = str(connection.id)
    db.delete(connection)
    db.commit()

    sio = request.app.state.sio
    await sio.emit("connection-deleted", conn_id)
    return {"message": "Connection deleted"}