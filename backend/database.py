import os
from pymongo import MongoClient
from dotenv import load_dotenv
load_dotenv()
mongodb_uri = os.getenv("MONGODB_URI")
database_name = os.getenv("MONGODB_DATABASE", "solarhub")

if not mongodb_uri:
    raise ValueError("MONGODB_URI is missing from .env")
client = MongoClient(
    mongodb_uri,
    serverSelectionTimeoutMS=5000
)
db = client[database_name]
def get_database():
    return db

def check_database_connection():
    try:
        client.admin.command("ping")
        return True
    except Exception as e:
        print("MongoDB connection error:", e)
        return False
