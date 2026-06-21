from uuid import UUID

from pydantic import BaseModel


class ConnectionCreate(BaseModel):
    source: UUID
    target: UUID
    sourceHandle: str | None = None
    targetHandle: str | None = None
    label: str = ""