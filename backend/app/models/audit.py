from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy import Column, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel

from app.models.email import utcnow


class AuditEvent(SQLModel, table=True):
    __tablename__ = "audit_events"

    event_id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)
    acting_user_id: uuid.UUID = Field(foreign_key="user.id")

    time: Optional[datetime] = Field(
        default_factory=utcnow,
        sa_column=Column(DateTime(timezone=True), nullable=True, index=True),
    )

    action: str = Field(index=True)

    data: Dict[str, Any] = Field(sa_column=Column(JSONB, nullable=False))
