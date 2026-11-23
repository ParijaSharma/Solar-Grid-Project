import json
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

base_dir = Path(__file__).resolve().parent
data_dir = base_dir / "data"
model_dir = base_dir / "models"
model_dir.mkdir(exist_ok=True)

features = [
    "IRRADIATION",
    "AMBIENT_TEMPERATURE",
    "MODULE_TEMPERATURE",
    "TIME_SIN",
    "TIME_COS",
    "TEMP_DIFF",
    "IRR_TEMP_INTERACTION",
    "IRR_TEMP_DIFF"
]


def load_farm_data(plant):
    generation_path = data_dir / f"Plant_{plant}_Generation_Data.csv"
    weather_path = data_dir / f"Plant_{plant}_Weather_Sensor_Data.csv"

    generation = pd.read_csv(generation_path)
    weather = pd.read_csv(weather_path)

    if plant == 1:
        generation["DATE_TIME"] = pd.to_datetime(
            generation["DATE_TIME"],
            format="%d-%m-%Y %H:%M"
        )
    else:
        generation["DATE_TIME"] = pd.to_datetime(
            generation["DATE_TIME"],
            format="mixed"
        )

    weather["DATE_TIME"] = pd.to_datetime(
        weather["DATE_TIME"],
        format="mixed"
    )

    farm_generation = (
        generation.groupby("DATE_TIME", as_index=False)
        .agg(AC_POWER=("AC_POWER", "sum"))
    )

    farm_weather = (
        weather.groupby("DATE_TIME", as_index=False)
        .agg(
            IRRADIATION=("IRRADIATION", "mean"),
            AMBIENT_TEMPERATURE=("AMBIENT_TEMPERATURE", "mean"),
            MODULE_TEMPERATURE=("MODULE_TEMPERATURE", "mean")
        )
    )

    merged = pd.merge(
        farm_generation,
        farm_weather,
        on="DATE_TIME",
        how="inner"
    )

    merged = merged.replace([np.inf, -np.inf], np.nan)
    merged = merged.dropna()
    merged = merged.sort_values("DATE_TIME").reset_index(drop=True)

    return merged


def add_features(df):
    df = df.copy()

    minutes = (
        df["DATE_TIME"].dt.hour * 60
        + df["DATE_TIME"].dt.minute
    )

    df["TEMP_DIFF"] = (
        df["MODULE_TEMPERATURE"]
        - df["AMBIENT_TEMPERATURE"]
    )

    df["TIME_SIN"] = np.sin(2 * np.pi * minutes / 1440)
    df["TIME_COS"] = np.cos(2 * np.pi * minutes / 1440)

    df["IRR_TEMP_INTERACTION"] = (
        df["IRRADIATION"] * df["MODULE_TEMPERATURE"]
    )

    df["IRR_TEMP_DIFF"] = (
        df["IRRADIATION"] * df["TEMP_DIFF"]
    )

    return df


plant1 = add_features(load_farm_data(1))
plant2 = add_features(load_farm_data(2))

split_index = int(len(plant1) * 0.8)

train_data = plant1.iloc[:split_index].copy()
test_data = plant1.iloc[split_index:].copy()

x_train = train_data[features]
y_train = train_data["AC_POWER"]

x_test = test_data[features]
y_test = test_data["AC_POWER"]

model = RandomForestRegressor(
    n_estimators=300,
    max_depth=None,
    min_samples_leaf=2,
    random_state=42,
    n_jobs=-1
)

model.fit(x_train, y_train)

predictions = model.predict(x_test)
predictions = np.maximum(predictions, 0)

day_mask = test_data["IRRADIATION"].values > 0.05

metrics = {
    "model": "Farm-level Random Forest",
    "training_plant": 1,
    "training_inverters": 22,
    "training_records": len(train_data),
    "test_records": len(test_data),
    "daylight_records": int(day_mask.sum()),
    "mae": float(mean_absolute_error(y_test, predictions)),
    "rmse": float(np.sqrt(mean_squared_error(y_test, predictions))),
    "r2": float(r2_score(y_test, predictions)),
    "daylight_mae": float(
        mean_absolute_error(y_test.values[day_mask], predictions[day_mask])
    ) if day_mask.any() else None,
    "daylight_rmse": float(
        np.sqrt(mean_squared_error(
            y_test.values[day_mask],
            predictions[day_mask]
        ))
    ) if day_mask.any() else None,
    "plant2_records": len(plant2)
}

test_results = test_data[
    [
        "DATE_TIME",
        "AC_POWER",
        "IRRADIATION",
        "AMBIENT_TEMPERATURE",
        "MODULE_TEMPERATURE"
    ]
].copy()

test_results["EXPECTED_POWER"] = predictions
test_results["RESIDUAL"] = (
    test_results["AC_POWER"] - test_results["EXPECTED_POWER"]
)
test_results["ABS_ERROR"] = test_results["RESIDUAL"].abs()

plant2_predictions = model.predict(plant2[features])
plant2_predictions = np.maximum(plant2_predictions, 0)

plant2_results = plant2[
    [
        "DATE_TIME",
        "AC_POWER",
        "IRRADIATION",
        "AMBIENT_TEMPERATURE",
        "MODULE_TEMPERATURE"
    ]
].copy()

plant2_results["EXPECTED_POWER"] = plant2_predictions
plant2_results["RESIDUAL"] = (
    plant2_results["AC_POWER"] - plant2_results["EXPECTED_POWER"]
)

metrics["plant2_cross_evaluation"] = {
    "mae": float(mean_absolute_error(
        plant2["AC_POWER"], plant2_predictions
    )),
    "rmse": float(np.sqrt(mean_squared_error(
        plant2["AC_POWER"], plant2_predictions
    ))),
    "r2": float(r2_score(
        plant2["AC_POWER"], plant2_predictions
    )),
    "records": len(plant2),
    "note": "Cross-plant evaluation, not independent model validation."
}

joblib.dump(model, model_dir / "farm_random_forest.joblib")

with open(model_dir / "farm_features.json", "w") as file:
    json.dump(features, file, indent=2)

with open(model_dir / "farm_metrics.json", "w") as file:
    json.dump(metrics, file, indent=2)

test_results.to_csv(
    model_dir / "farm_test_results.csv",
    index=False
)

plant2_results.to_csv(
    model_dir / "farm_plant2_results.csv",
    index=False
)

print("\nFARM MODEL TRAINING COMPLETE")
print("--------------------------------")
print("Training rows:", len(train_data))
print("Testing rows:", len(test_data))
print("Plant 1 inverters:", 22)
print("MAE:", round(metrics["mae"], 3))
print("RMSE:", round(metrics["rmse"], 3))
print("R2:", round(metrics["r2"], 4))
print("Daylight MAE:", metrics["daylight_mae"])
print("Daylight RMSE:", metrics["daylight_rmse"])
print("\nPlant 2 cross-evaluation:")
print(metrics["plant2_cross_evaluation"])
print("\nExported files to:", model_dir)
