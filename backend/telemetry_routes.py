from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from database import get_database
from auth_routes import get_current_user
from telemetry_service import (
    generate_telemetry,
    generate_day_telemetry
)
router = APIRouter(
    prefix="/api/telemetry",
    tags=["Telemetry"]
)
db = get_database()

@router.post("/generate/{installation_id}")
def generate_installation_telemetry(
    installation_id: str,
    user: dict = Depends(get_current_user)
):
    if not ObjectId.is_valid(installation_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid installation ID"
        )
    installation = db.installations.find_one({
        "_id": ObjectId(installation_id),
        "user_id": str(user["_id"])
    })

    if not installation:
        raise HTTPException(
            status_code=404,
            detail="Installation not found"
        )
    reading = generate_telemetry(
        installation["capacity_kw"]
    )
    reading["installation_id"] = installation_id
    reading["user_id"] = str(user["_id"])
    result = db.telemetry.insert_one(reading)

    response_data = {
        "id": str(result.inserted_id),
        "installation_id": reading["installation_id"],
        "user_id": reading["user_id"],
        "timestamp": reading["timestamp"].isoformat(),
        "power_kw": reading["power_kw"],
        "energy_kwh": reading["energy_kwh"],
        "irradiance": reading["irradiance"],
        "ambient_temperature": reading["ambient_temperature"],
        "module_temperature": reading["module_temperature"],
        "source": reading["source"]
    }

    return {
        "message": "Telemetry generated successfully",
        "telemetry": response_data
    }

@router.get("/{installation_id}")
def get_installation_telemetry(
    installation_id: str,
    limit: int = 100,
    user: dict = Depends(get_current_user)
):
    if not ObjectId.is_valid(installation_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid installation ID"
        )

    if not 1 <= limit <= 1000:
        raise HTTPException(
            status_code=400,
            detail="Limit must be between 1 and 1000"
        )

    installation = db.installations.find_one({
        "_id": ObjectId(installation_id),
        "user_id": str(user["_id"])
    })

    if not installation:
        raise HTTPException(
            status_code=404,
            detail="Installation not found"
        )

    readings = db.telemetry.find({
        "installation_id": installation_id,
        "user_id": str(user["_id"])
    }).sort("timestamp", -1).limit(limit)

    result = []

    for reading in readings:
        reading["id"] = str(reading.pop("_id"))
        reading["timestamp"] = reading["timestamp"].isoformat()
        result.append(reading)
    return {
        "count": len(result),
        "telemetry": result
    }


@router.post("/simulate-day/{installation_id}")
def simulate_installation_day(
    installation_id: str,
    user: dict = Depends(get_current_user)
):
    if not ObjectId.is_valid(installation_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid installation ID"
        )

    installation = db.installations.find_one({
        "_id": ObjectId(installation_id),
        "user_id": str(user["_id"])
    })

    if not installation:
        raise HTTPException(
            status_code=404,
            detail="Installation not found"
        )

    readings = generate_day_telemetry(
        installation["capacity_kw"],
        installation_id,
        str(user["_id"])
    )

    result = db.telemetry.insert_many(readings)

    return {
        "message": "Full day simulated successfully",
        "installation_id": installation_id,
        "readings_generated": len(result.inserted_ids),
        "source": "simulated"
    }
