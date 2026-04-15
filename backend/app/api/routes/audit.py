from app.models.audit import AuditEvent
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select

from app.api.deps import CurrentUser
from app.core.db import get_db

router = APIRouter(prefix="/audit", tags=["audit"])


@router.post("/events")
def get_events(
        _current_user: CurrentUser,
        start: int = 0,
        limit: Annotated[int, Query(le=100)] = 100,
        db: Session = Depends(get_db),
) -> list[AuditEvent]:
    return db.exec(select(AuditEvent).offset(start).limit(limit)).all()
