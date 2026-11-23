from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from database import get_database
from auth_routes import get_current_user
from model.installation import InstallationCreate
from pymongo.errors import DuplicateKeyError

router = APIRouter(
    prefix="/api/installations",
    tags=["Installations"]
)
db = get_database()


@router.post("/")
def create_installation(
    installation: InstallationCreate,
    user: dict = Depends(get_current_user)
):
    installation_data = installation.model_dump()

    installation_data.update({
        "user_id": str(user["_id"]),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    })

    try:
        result = db.installations.insert_one(installation_data)
    except DuplicateKeyError:
        raise HTTPException(
            status_code=409,
            detail="An installation with this name already exists"
        )

    return {
        "message": "Installation created successfully",
        "installation": {
            "id": str(result.inserted_id),
            "name": installation_data["name"],
            "location": installation_data["location"],
            "capacity_kw": installation_data["capacity_kw"],
            "installation_type": installation_data["installation_type"],
            "panel_count": installation_data["panel_count"],
            "user_id": installation_data["user_id"],
            "created_at": installation_data["created_at"].isoformat(),
            "updated_at": installation_data["updated_at"].isoformat()
        }
    }

@router.get("/")
def get_installations(
    user: dict = Depends(get_current_user)
):
    installations = db.installations.find({
        "user_id": str(user["_id"])
    }).sort("created_at", -1)
    result = []
    for installation in installations:
        installation["id"] = str(installation.pop("_id"))
        result.append(installation)
    return {
        "count": len(result),
        "installations": result
    }

@router.get("/{installation_id}")
def get_installation(
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
    installation["id"] = str(installation.pop("_id"))
    return installation
