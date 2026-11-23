
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Literal


class UserRegister(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    stakeholder_type: Literal["residential", "solar_farm", "industrial"]

class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    stakeholder_type: str

    model_config = ConfigDict(from_attributes=True)
