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


def is_departed(date: str, depart: str) -> bool:
    """Return True when the ride departure time has already passed (IST)."""
    now = datetime.utcnow() + timedelta(hours=5, minutes=30)
    return now >= parse_depart(date, depart)


def is_completed_after_arrival(date: str, arrive: str, grace_minutes: int = 10) -> bool:
    """Return True when ride has crossed arrival time plus grace window (IST)."""
    now = datetime.utcnow() + timedelta(hours=5, minutes=30)
    arrival = datetime.strptime(f"{date} {arrive}", "%Y-%m-%d %I:%M %p")
    return now >= (arrival + timedelta(minutes=grace_minutes))


def generate_ref() -> str:
    """Generate a short human-readable booking reference."""
    return "UTK-" + uuid.uuid4().hex[:8].upper()
