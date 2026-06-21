import uuid
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import Boolean, DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Note(Base):
    __tablename__ = "notes"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    title: Mapped[str] = mapped_column(String, nullable=False, default="Untitled")
    content: Mapped[str] = mapped_column(Text, nullable=False)
    position: Mapped[dict] = mapped_column(
        JSONB, nullable=False, default=lambda: {"x": 100, "y": 100}
    )
    styling: Mapped[dict] = mapped_column(
        JSONB, nullable=False, default=lambda: {"backgroundColor": "#ffffff", "fontSize": 16}
    )
    image_url: Mapped[str] = mapped_column("imageUrl", String, default="")
    user_id: Mapped[Optional[UUID]] = mapped_column("userId", PG_UUID(as_uuid=True), nullable=True)
    tags: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    is_pinned: Mapped[bool] = mapped_column("isPinned", Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        "createdAt", DateTime(timezone=True), default=func.now(), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        "updatedAt", DateTime(timezone=True), default=func.now(), server_default=func.now(), onupdate=func.now()
    )