from fastapi import APIRouter
from ..database import get_db
from ..models.user import User

router = APIRouter(prefix="/demo", tags=["demo"])

# Fixed order keeps quick-login cards stable across app restarts.
DEMO_PHONES = [
    "+91 98765 43210",
    "+91 98123 45678",
    "+91 99887 76655",
    "+91 98765 00001",
    "+91 98765 00002",
]


@router.get("/accounts")
async def demo_accounts():
    """Return all seeded demo accounts in a fixed display order."""
    db = get_db()
    items = await db.users.find({"phone": {"$in": DEMO_PHONES}}, {"_id": 0}).to_list(100)
    users = [User(**u).dict() for u in items]
    by_phone = {u["phone"]: u for u in users}
    # Response preserves DEMO_PHONES ordering so frontend does not need sorting logic.
    return [by_phone[p] for p in DEMO_PHONES if p in by_phone]
