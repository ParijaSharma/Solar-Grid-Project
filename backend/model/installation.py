from pydantic import BaseModel, Field
from typing import Literal, Optional

class InstallationCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    location: str = Field(min_length=2, max_length=200)
    capacity_kw: float = Field(gt=0)
    installation_type: Literal[
        "rooftop",
        "ground_mounted",
        "industrial"
    ]
    panel_count: Optional[int] = Field(default=None, gt=0)

class InstallationResponse(BaseModel):
    id: str
    name: str
    location: str
    capacity_kw: float
    installation_type: str
    panel_count: Optional[int] = None
