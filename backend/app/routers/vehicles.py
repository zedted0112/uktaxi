from fastapi import APIRouter, HTTPException
from ..models.vehicle import VEHICLES

router = APIRouter(prefix="/vehicles", tags=["vehicles"])


@router.get("")
async def list_vehicles():
    return list(VEHICLES.values())


@router.get("/{vehicle_id}")
async def get_vehicle(vehicle_id: str):
    v = VEHICLES.get(vehicle_id)
    if not v:
        raise HTTPException(status_code=404, detail="Unknown vehicle")
    return v
