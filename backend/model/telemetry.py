from pydantic import BaseModel, Field
from datetime import datetime

class TelemetryRecord(BaseModel):
    installation_id: str
    timestamp: datetime
    power_kw: float = Field(ge=0)
    energy_kwh: float = Field(ge=0)
    irradiance: float = Field(ge=0)
    ambient_temperature: float
    module_temperature: float
    source: str = "simulated"
