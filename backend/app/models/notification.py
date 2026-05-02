import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class Notification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    recipient_phone: str
    title: str
    body: str
    type: str                          # e.g. new_request, booking_confirmed
    data: Dict[str, Any] = Field(default_factory=dict)
    read: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
