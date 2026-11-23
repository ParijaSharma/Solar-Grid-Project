import json
from pathlib import Path
from datetime import datetime
import pandas as pd
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from farm_model_service import predict_farm_power

router = APIRouter(
    prefix="/api/farm",
    tags=["Solar Farm ML"]
)

base_dir = Path(__file__).resolve().parent
model_dir = base_dir / "models"
data_dir = base_dir / "data"


class FarmPredictionRequest(BaseModel):
    timestamp: datetime
    irradiation: float = Field(ge=0, le=1.5)
    ambient_temperature: float
    module_temperature: float


def load_generation_data(plant: int):
    path = data_dir / f"Plant_{plant}_Generation_Data.csv"

    if not path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Generation dataset for Plant {plant} was not found."
        )

    df = pd.read_csv(path)

    required = [
        "DATE_TIME",
        "SOURCE_KEY",
        "AC_POWER",
        "DC_POWER",
        "DAILY_YIELD",
        "TOTAL_YIELD"
    ]

    missing = set(required) - set(df.columns)

    if missing:
        raise HTTPException(
            status_code=500,
            detail=f"Dataset is missing columns: {sorted(missing)}"
        )

    df["DATE_TIME"] = pd.to_datetime(
        df["DATE_TIME"],
        dayfirst=True,
        errors="coerce"
    )

    for column in [
        "AC_POWER",
        "DC_POWER",
        "DAILY_YIELD",
        "TOTAL_YIELD"
    ]:
        df[column] = pd.to_numeric(
            df[column],
            errors="coerce"
        )

    df = df.dropna(
        subset=["DATE_TIME", "SOURCE_KEY", "AC_POWER"]
    )

    return df


@router.get("/metrics")
def get_farm_metrics():
    path = model_dir / "farm_metrics.json"

    if not path.exists():
        raise HTTPException(
            status_code=503,
            detail="Farm model has not been trained yet."
        )

    with open(path, "r") as file:
        return json.load(file)


@router.get("/inverters")
def get_farm_inverters(
    plant: int = Query(1, ge=1, le=2)
):
    df = load_generation_data(plant)

    if df.empty:
        raise HTTPException(
            status_code=404,
            detail="No inverter generation records were found."
        )

    latest_timestamp = df["DATE_TIME"].max()

    latest_records = df[
        df["DATE_TIME"] == latest_timestamp
    ].copy()

    if latest_records.empty:
        raise HTTPException(
            status_code=404,
            detail="No records found at the latest timestamp."
        )

    peer_median = float(
        latest_records["AC_POWER"].median()
    )

    inverters = []

    for source_key, group in df.groupby("SOURCE_KEY"):
        group = group.sort_values("DATE_TIME")
        latest = group.iloc[-1]

        latest_power = float(latest["AC_POWER"])

        if latest_power < peer_median:
            peer_status = "Below peer median"
        elif latest_power > peer_median:
            peer_status = "Above peer median"
        else:
            peer_status = "At peer median"

        inverters.append({
            "inverter_id": str(source_key),
            "latest_timestamp": latest["DATE_TIME"].isoformat(),
            "latest_ac_power": round(latest_power, 3),
            "peak_ac_power": round(
                float(group["AC_POWER"].max()), 3
            ),
            "latest_dc_power": round(
                float(latest["DC_POWER"]), 3
            ) if pd.notna(latest["DC_POWER"]) else None,
            "daily_yield": round(
                float(latest["DAILY_YIELD"]), 3
            ) if pd.notna(latest["DAILY_YIELD"]) else None,
            "total_yield": round(
                float(latest["TOTAL_YIELD"]), 3
            ) if pd.notna(latest["TOTAL_YIELD"]) else None,
            "peer_status": peer_status,
            "records": int(len(group))
        })

    inverters.sort(
        key=lambda item: item["latest_ac_power"],
        reverse=True
    )

    return {
        "plant": plant,
        "source": "historical_csv",
        "latest_timestamp": latest_timestamp.isoformat(),
        "inverter_count": len(inverters),
        "peer_median_ac_power": round(peer_median, 3),
        "unit": "AC_POWER dataset units",
        "inverters": inverters
    }


@router.get("/history")
def get_farm_history(
    plant: int = Query(1, ge=1, le=2),
    limit: int = Query(200, ge=1, le=1000)
):
    filename = (
        "farm_test_results.csv"
        if plant == 1
        else "farm_plant2_results.csv"
    )

    path = model_dir / filename

    if not path.exists():
        raise HTTPException(
            status_code=503,
            detail="Farm evaluation results not found. Train the model first."
        )

    df = pd.read_csv(path)
    df = df.tail(limit)

    df["DATE_TIME"] = pd.to_datetime(df["DATE_TIME"])

    records = []

    for _, row in df.iterrows():
        records.append({
            "timestamp": row["DATE_TIME"].isoformat(),
            "actual_ac_power": round(float(row["AC_POWER"]), 3),
            "predicted_ac_power": round(float(row["EXPECTED_POWER"]), 3),
            "residual": round(float(row["RESIDUAL"]), 3)
        })

    return {
        "plant": plant,
        "mode": "historical_model_evaluation",
        "unit": "AC_POWER dataset units",
        "count": len(records),
        "records": records
    }


@router.post("/predict")
def predict_farm(payload: FarmPredictionRequest):
    try:
        prediction = predict_farm_power(
            timestamp=payload.timestamp,
            irradiation=payload.irradiation,
            ambient_temperature=payload.ambient_temperature,
            module_temperature=payload.module_temperature
        )

        return {
            "predicted_ac_power": round(prediction, 3),
            "timestamp": payload.timestamp.isoformat(),
            "unit": "AC_POWER dataset units",
            "model": "Farm-level Random Forest"
        }

    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc)
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Farm prediction failed: {exc}"
        )
