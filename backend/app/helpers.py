import uuid
from datetime import datetime, timedelta


def ride_public(r: dict) -> dict:
    """Attach seats_left and strip the MongoDB _id field."""
    booked = r.get("booked_seats", [])
    out = {**r, "seats_left": r["total_seats"] - len(booked)}
    out.pop("_id", None)
    return out


def parse_depart(date: str, depart: str) -> datetime:
    return datetime.strptime(f"{date} {depart}", "%Y-%m-%d %I:%M %p")


def can_cancel(date: str, depart: str) -> bool:
    """Returns True when departure is more than 30 minutes away (IST)."""
    now = datetime.utcnow() + timedelta(hours=5, minutes=30)
    cutoff = parse_depart(date, depart) - timedelta(minutes=30)
    return now < cutoff


def generate_ref() -> str:
    return "UTK-" + uuid.uuid4().hex[:8].upper()
