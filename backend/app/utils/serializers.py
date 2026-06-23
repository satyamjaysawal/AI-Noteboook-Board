from app.models.connection import Connection
from app.models.drawing import Drawing
from app.models.note import Note


def serialize_drawing(drawing: Drawing) -> dict:
    draw_id = str(drawing.id)
    return {
        "id": draw_id,
        "_id": draw_id,
        "path": drawing.path,
        "color": drawing.color,
        "width": drawing.width,
        "createdAt": drawing.created_at.isoformat() if drawing.created_at else None,
    }


def serialize_note(note: Note) -> dict:
    note_id = str(note.id)
    return {
        "id": note_id,
        "_id": note_id,
        "title": note.title,
        "content": note.content,
        "position": note.position,
        "styling": note.styling,
        "imageUrl": note.image_url,
        "userId": str(note.user_id) if note.user_id else None,
        "tags": note.tags or [],
        "isPinned": note.is_pinned,
        "createdAt": note.created_at.isoformat() if note.created_at else None,
        "updatedAt": note.updated_at.isoformat() if note.updated_at else None,
    }


def serialize_connection(connection: Connection) -> dict:
    conn_id = str(connection.id)
    return {
        "id": conn_id,
        "_id": conn_id,
        "source": str(connection.source),
        "target": str(connection.target),
        "sourceHandle": connection.source_handle,
        "targetHandle": connection.target_handle,
        "label": connection.label,
        "createdAt": connection.created_at.isoformat() if connection.created_at else None,
    }