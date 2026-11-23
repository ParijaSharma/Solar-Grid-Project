import json
from datetime import datetime
from pathlib import Path
import joblib
import numpy as np
import pandas as pd


base_dir = Path(__file__).resolve().parent
model_dir = base_dir / "models"

model = joblib.load(model_dir / "farm_random_forest.joblib")

with open(model_dir / "farm_features.json", "r") as file:
    feature_names = json.load(file)

def build_features(
    timestamp,
    irradiation,
    ambient_temperature,
    module_temperature
):
    if isinstance(timestamp, str):
        timestamp = datetime.fromisoformat(
            timestamp.replace("Z", "+00:00")
        )

    minutes = timestamp.hour * 60 + timestamp.minute
    temp_diff = module_temperature - ambient_temperature

    values = {
        "IRRADIATION": irradiation,
        "AMBIENT_TEMPERATURE": ambient_temperature,
        "MODULE_TEMPERATURE": module_temperature,
        "TIME_SIN": np.sin(2 * np.pi * minutes / 1440),
        "TIME_COS": np.cos(2 * np.pi * minutes / 1440),
        "TEMP_DIFF": temp_diff,
        "IRR_TEMP_INTERACTION": irradiation * module_temperature,
        "IRR_TEMP_DIFF": irradiation * temp_diff
    }

    return pd.DataFrame(
        [[values[name] for name in feature_names]],
        columns=feature_names
    )

def predict_farm_power(
    timestamp,
    irradiation,
    ambient_temperature,
    module_temperature
):
    if irradiation < 0 or irradiation > 1.5:
        raise ValueError(
            "Irradiation must be in the training data scale (0 to 1.5)."
        )

    input_data = build_features(
        timestamp,
        irradiation,
        ambient_temperature,
        module_temperature
    )

    prediction = float(model.predict(input_data)[0])
    return max(0.0, prediction)
