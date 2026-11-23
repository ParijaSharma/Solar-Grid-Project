
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pymongo.errors import DuplicateKeyError
from database import get_database
from model.user import UserRegister, UserLogin
from auth import hash_password, verify_password, create_access_token
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from bson import ObjectId
from auth import decode_access_token

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
db = get_database()

@router.post("/register")
def register_user(user: UserRegister):
    email = user.email.strip().lower()

    if len(user.password.encode("utf-8")) > 72:
        raise HTTPException(
            status_code=400,
            detail="Password must not exceed 72 bytes"
        )

    existing_user = db.users.find_one({"email": email})

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="Email is already registered"
        )

    user_data = {
        "name": user.name.strip(),
        "email": email,
        "password": hash_password(user.password),
        "stakeholder_type": user.stakeholder_type,
        "created_at": datetime.now(timezone.utc)
    }

    try:
        result = db.users.insert_one(user_data)
    except DuplicateKeyError:
        raise HTTPException(
            status_code=409,
            detail="Email is already registered"
        )

    return {
        "message": "Registration successful",
        "user": {
            "id": str(result.inserted_id),
            "name": user_data["name"],
            "email": email,
            "stakeholder_type": user_data["stakeholder_type"]
        }
    }


@router.post("/login")
def login_user(user: UserLogin):
    email = user.email.strip().lower()

    existing_user = db.users.find_one({"email": email})

    if not existing_user or not verify_password(
        user.password,
        existing_user["password"]
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    token = create_access_token(str(existing_user["_id"]))

    return {
        "message": "Login successful",
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(existing_user["_id"]),
            "name": existing_user["name"],
            "email": existing_user["email"],
            "stakeholder_type": existing_user["stakeholder_type"]
        }
    }


security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials
    user_id = decode_access_token(token)

    if not user_id or not ObjectId.is_valid(user_id):
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )

    user = db.users.find_one({"_id": ObjectId(user_id)})

    if not user:
        raise HTTPException(
            status_code=401,
            detail="User not found"
        )

    return user

@router.get("/me")
def get_my_profile(user: dict = Depends(get_current_user)):
    return {
        "id": str(user["_id"]),
        "name": user["name"],
        "email": user["email"],
        "stakeholder_type": user["stakeholder_type"]
    }
