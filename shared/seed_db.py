"""Seed the MongoDB `cg_agri_transparency.farmers_records` collection with the two
demo farmers (101/1 Suresh Verma, 102/4 Rameshwar Sahu).

Run from the backend root with MONGO_URI set in .env:
    python -m shared.seed_db
"""

from shared.database import db, records_collection

FARMERS = [
    {
        "khasra_no": "101/1",
        "farmer_id": "CG-AGRI-10001",
        "owner_name": "Suresh Verma",
        "father_name": "Late Ramkumar Verma",
        "aadhaar_last4": "3344",
        "mobile": "9826100001",
        "village": "Abhanpur",
        "block": "Abhanpur",
        "district": "Raipur",
        "area_hectares": 1.5,
        "actual_irrigation": "Irrigated",
        "bank_recorded_irrigation": "Irrigated",
        "bhuiyan_slip_uploaded": True,
        "crop": "Paddy (Kharif)",
        "quintals_sold": 30,
        "msp_received": 93000,
        "kcc_loan_amount": 80000,
        "interest_charged_pct": 4.0,
        "repaid_on_time": True,
        "pmfby_premium_deducted": True,
        "pmfby_portal_uploaded": True,
        "pmfby_claim_received": 0,
        "crop_loss_pct": 0,
        "active_mortgages": [
            {"bank": "State Bank of India", "amount": 80000, "status": "Active"}
        ],
        "audit_status": "Verified & Synced",
    },
    {
        "khasra_no": "102/4",
        "farmer_id": "CG-AGRI-88211",
        "owner_name": "Rameshwar Sahu",
        "father_name": "Late Dukalu Ram Sahu",
        "aadhaar_last4": "4821",
        "mobile": "9826100002",
        "village": "Kurud",
        "block": "Kurud",
        "district": "Dhamtari",
        "area_hectares": 2.0,
        "actual_irrigation": "Irrigated",
        "bank_recorded_irrigation": "Unirrigated",
        "bhuiyan_slip_uploaded": True,
        "crop": "Paddy (Kharif)",
        "quintals_sold": 40,
        "msp_received": 124000,
        "kcc_loan_amount": 100000,
        "interest_charged_pct": 7.0,
        "repaid_on_time": True,
        "pmfby_premium_deducted": True,
        "pmfby_portal_uploaded": False,
        "pmfby_claim_received": 25000,
        "crop_loss_pct": 50,
        "active_mortgages": [
            {"bank": "Chhattisgarh Rajya Gramin Bank", "amount": 100000, "status": "Active"},
            {"bank": "District Cooperative Bank", "amount": 120000, "status": "Active"},
        ],
        "audit_status": "Discrepancy Flagged",
    },
]


def seed():
    records_collection.delete_many({})
    records_collection.insert_many(FARMERS)
    print(f"Seeded {len(FARMERS)} farmer records into {db.name}.farmers_records")
    for farmer in FARMERS:
        print(f"  - {farmer['khasra_no']}  {farmer['owner_name']}  ({farmer['district']})")


if __name__ == "__main__":
    seed()
