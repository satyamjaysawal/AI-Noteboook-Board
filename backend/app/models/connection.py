import uuid
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Connection(Base):
    __tablename__ = "connections"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    source: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("notes.id"), nullable=False
    )
    target: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("notes.id"), nullable=False
    )
    source_handle: Mapped[Optional[str]] = mapped_column("sourceHandle", String, nullable=True)
    target_handle: Mapped[Optional[str]] = mapped_column("targetHandle", String, nullable=True)
    label: Mapped[str] = mapped_column(String, default="")
    created_at: Mapped[datetime] = mapped_column(
        "createdAt", DateTime(timezone=True), default=func.now(), server_default=func.now()
    )