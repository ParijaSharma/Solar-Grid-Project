
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from database import get_database
from auth_routes import get_current_user

router = APIRouter(
    prefix="/api/dashboard",
    tags=["Dashboard"]
)

db = get_database()


@router.get("/{installation_id}")
def get_dashboard(
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

    now = datetime.now(timezone.utc)
    start_of_day = now.replace(
        hour=0, minute=0, second=0, microsecond=0
    )

    readings = list(db.telemetry.find({
        "installation_id": installation_id,
        "user_id": str(user["_id"]),
        "timestamp": {"$gte": start_of_day}
    }).sort("timestamp", -1))

    if not readings:
        return {
            "installation_id": installation_id,
            "current_power_kw": 0,
            "today_energy_kwh": 0,
            "average_irradiance": 0,
            "peak_power_kw": 0,
            "total_readings": 0,
            "latest_timestamp": None
        }

    current_power = readings[0]["power_kw"]

    today_energy = round(
        sum(r["energy_kwh"] for r in readings), 3
    )

    average_irradiance = round(
        sum(r["irradiance"] for r in readings) / len(readings), 2
    )

    peak_power = max(
        r["power_kw"] for r in readings
    )

    return {
        "installation_id": installation_id,
        "current_power_kw": current_power,
        "today_energy_kwh": today_energy,
        "average_irradiance": average_irradiance,
        "peak_power_kw": peak_power,
        "total_readings": len(readings),
        "latest_timestamp": readings[0]["timestamp"].isoformat()
    }
