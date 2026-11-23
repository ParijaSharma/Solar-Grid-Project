from pymongo import ASCENDING, DESCENDING
from database import get_database

db = get_database()

db.users.create_index(
    [("email", ASCENDING)],
    unique=True
)
db.installations.create_index(
    [("user_id", ASCENDING), ("created_at", DESCENDING)]
)
db.devices.create_index(
    [("installation_id", ASCENDING)]
)
db.telemetry.create_index(
    [("installation_id", ASCENDING), ("timestamp", DESCENDING)]
)
db.predictions.create_index(
    [("installation_id", ASCENDING), ("created_at", DESCENDING)]
)
db.alerts.create_index(
    [("installation_id", ASCENDING), ("status", ASCENDING)]
)

print("All SolarHub AI indexes created successfully!")
