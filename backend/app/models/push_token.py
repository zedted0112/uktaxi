import uuid
from datetime import datetime, timezone
from typing import Literal
from pydantic import BaseModel, Field


class PushToken(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    phone: str
    token: str
    platform: Literal["android", "ios", "web", "unknown"] = "unknown"
    app_version: str | None = None
    enabled: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class PushRegisterIn(BaseModel):
    token: str
    platform: Literal["android", "ios", "web", "unknown"] = "unknown"
    app_version: str | None = None


class PushUnregisterIn(BaseModel):
    token: str
