import os

from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

client = MongoClient(os.getenv("MONGO_URI"))
db = client[os.getenv("DB_NAME", "cg_agri_transparency")]

records_collection = db["farmers_records"]
grievances_collection = db["grievances"]
sanctions_collection = db["kcc_sanctions"]
