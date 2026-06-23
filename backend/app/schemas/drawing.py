from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class DrawingCreate(BaseModel):
    path: str
    color: str = "#6366f1"
    width: int = 3


class DrawingResponse(BaseModel):
    id: UUID
    path: str
    color: str
    width: int
    createdAt: datetime

    class Config:
        from_attributes = True
