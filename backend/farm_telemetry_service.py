from pathlib import Path
import pandas as pd
from farm_model_service import predict_farm_power

base_dir = Path(__file__).resolve().parent
model_dir = base_dir / "models"


def build_farm_replay(plant=1, limit=200):
    if plant != 1:
        raise ValueError(
            "Farm-level replay is currently supported for Plant 1 only. "
            "Plant 2 is reserved for cross-plant evaluation."
        )

    path = model_dir / "farm_test_results.csv"

    if not path.exists():
        raise FileNotFoundError(
            "Farm test results not found. Train the farm model first."
        )

    df = pd.read_csv(path)
    required = [
        "DATE_TIME",
        "AC_POWER",
        "IRRADIATION",
        "AMBIENT_TEMPERATURE",
        "MODULE_TEMPERATURE"
    ]

    missing = set(required) - set(df.columns)
    if missing:
        raise ValueError(f"Missing columns in farm test results: {missing}")

    df["DATE_TIME"] = pd.to_datetime(df["DATE_TIME"])
    df = df.dropna(subset=required)
    df = df.sort_values("DATE_TIME").tail(limit)

    records = []

    for _, row in df.iterrows():
        timestamp = row["DATE_TIME"].to_pydatetime()

        irradiation = float(row["IRRADIATION"])
        ambient = float(row["AMBIENT_TEMPERATURE"])
        module = float(row["MODULE_TEMPERATURE"])
        actual = float(row["AC_POWER"])

        predicted = predict_farm_power(
            timestamp=timestamp,
            irradiation=irradiation,
            ambient_temperature=ambient,
            module_temperature=module
        )

        records.append({
            "timestamp": timestamp,
            "actual_ac_power": round(actual, 3),
            "predicted_ac_power": round(predicted, 3),
            "irradiation": round(irradiation, 5),
            "ambient_temperature": round(ambient, 3),
            "module_temperature": round(module, 3),
            "absolute_error": round(abs(actual - predicted), 3),
            "source": "historical_csv_replay",
            "plant": 1
        })

    return records
