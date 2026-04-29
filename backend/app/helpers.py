import uuid
from datetime import datetime, timedelta


def ride_public(r: dict) -> dict:
    """Return a client-safe ride payload with computed seat availability."""
    booked = r.get("booked_seats", [])
    out = {**r, "seats_left": r["total_seats"] - len(booked)}
    out.pop("_id", None)
    return out


def parse_depart(date: str, depart: str) -> datetime:
    """Convert date + 12-hour departure text into a comparable datetime."""
    return datetime.strptime(f"{date} {depart}", "%Y-%m-%d %I:%M %p")


def can_cancel(date: str, depart: str) -> bool:
    """Return True when cancellation is allowed by the 30-minute cutoff rule."""
    # The service uses IST business time for transport cutoffs.
    now = datetime.utcnow() + timedelta(hours=5, minutes=30)
    cutoff = parse_depart(date, depart) - timedelta(minutes=30)
    return now < cutoff


def generate_ref() -> str:
    """Generate a short human-readable booking reference."""
    return "UTK-" + uuid.uuid4().hex[:8].upper()
