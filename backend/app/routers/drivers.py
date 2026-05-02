from fastapi import APIRouter, HTTPException
from ..database import get_db
from ..models.user import User, UpdateDriverVehicleIn
from ..models.vehicle import VEHICLES

router = APIRouter(prefix="/drivers", tags=["drivers"])


@router.post("/{phone}/vehicle", response_model=User)
async def update_vehicle(phone: str, payload: UpdateDriverVehicleIn):
    # Driver vehicle updates normalize incoming preset IDs against the canonical
    # VEHICLES catalog before writing profile fields.
    db = get_db()
    u = await db.users.find_one({"phone": phone, "role": "driver"}, {"_id": 0})
    if not u:
        raise HTTPException(status_code=404, detail="Driver not found")
    preset = VEHICLES.get(payload.vehicle_preset)
    if not preset:
        raise HTTPException(status_code=400, detail="Invalid vehicle preset")
    update = {
        "vehicle_preset": preset["id"],
        "vehicle_type": preset["name"],
        "vehicle_number": payload.vehicle_number,
        "total_seats": preset["total_seats"],
        "seat_layout": preset["seat_layout"],
    }
    # The profile document is updated in-place so future ride publishes inherit
    # the new vehicle metadata automatically.
    await db.users.update_one({"phone": phone}, {"$set": update})
    u.update(update)
    return User(**u)
