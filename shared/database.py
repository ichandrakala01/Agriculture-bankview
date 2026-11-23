import os
from pathlib import Path

from dotenv import load_dotenv
from pymongo import MongoClient

# Always resolve .env relative to this file's location (d:\bankview\shared\),
# so the path works regardless of what the uvicorn worker sets as cwd.
_ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=_ENV_PATH, override=True)

_MONGO_URI = os.getenv("MONGO_URI", "")
_DB_NAME   = os.getenv("DB_NAME", "cg_agri_transparency")

if not _MONGO_URI:
    raise RuntimeError(
        f"MONGO_URI is not set. Add it to {_ENV_PATH}"
    )

client = MongoClient(_MONGO_URI)
db     = client[_DB_NAME]

records_collection    = db["farmers_records"]
grievances_collection = db["grievances"]
sanctions_collection  = db["kcc_sanctions"]
