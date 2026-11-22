import random
from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from shared.database import records_collection, grievances_collection
from shared.rule_engine import get_record_by_khasra, evaluate_entitlements_and_flags

router = APIRouter()


class RegisterFarmerRequest(BaseModel):
    khasra_no: str
    owner_name: str
    father_name: str = "S/o Kisan"
    aadhaar_last4: str = "5521"
    mobile: str
    village: str
    block: str
    district: str
    area_hectares: float
    actual_irrigation: str = "Irrigated"
    bank_recorded_irrigation: str = "Unirrigated"
    quintals_sold: float = 35
    msp_received: int = 108500
    kcc_loan_amount: int = 90000
    interest_charged_pct: float = 7.0
    repaid_on_time: bool = True
    crop_loss_pct: int = 45
    pmfby_claim_received: int = 18000


class SelfAuditRequest(BaseModel):
    khasra_no: str
    owner_name: str = "Farmer"
    village: str = "Kurud"
    district: str = "Dhamtari"
    area_hectares: float
    actual_irrigation: str
    bank_recorded_irrigation: str
    quintals_sold: float
    msp_received: int
    interest_charged_pct: float
    repaid_on_time: bool
    crop_loss_pct: int
    pmfby_claim_received: int


class GrievanceRequest(BaseModel):
    khasra_no: str
    language: str = "hi"


@router.post("/register")
def register_farmer(req: RegisterFarmerRequest):
    if records_collection.find_one({"khasra_no": req.khasra_no}):
        raise HTTPException(status_code=400, detail="Khasra number already exists")
    doc = req.dict()
    doc["farmer_id"] = f"CG-AGRI-{random.randint(10000, 99999)}"
    doc["bhuiyan_slip_uploaded"] = True
    doc["crop"] = "Paddy (Kharif)"
    doc["pmfby_premium_deducted"] = True
    doc["pmfby_portal_uploaded"] = False
    doc["active_mortgages"] = [
        {"bank": "Chhattisgarh Rajya Gramin Bank", "amount": req.kcc_loan_amount, "status": "Active"}
    ]
    doc["audit_status"] = "Discrepancy Flagged"
    records_collection.insert_one(doc)
    return {"message": "Farmer registered in MongoDB", "khasra_no": req.khasra_no}


@router.get("/check/{khasra_no:path}")
def check_farmer(khasra_no: str):
    rec = get_record_by_khasra(khasra_no)
    if not rec:
        raise HTTPException(status_code=404, detail="Khasra number not found")
    return evaluate_entitlements_and_flags(rec)


@router.post("/verify-bhuiyan-slip/{khasra_no:path}")
def simulate_bhuiyan_ocr(khasra_no: str):
    """Marks Bhuiyan B1/P-II slip as uploaded & returns OCR vs Bank comparison."""
    rec = get_record_by_khasra(khasra_no)
    if not rec:
        raise HTTPException(status_code=404, detail="Khasra not found")
    records_collection.update_one({"khasra_no": khasra_no}, {"$set": {"bhuiyan_slip_uploaded": True}})
    evaluated = evaluate_entitlements_and_flags(rec)
    return {
        "ocr_extracted": {
            "khasra_no": evaluated["khasra_no"],
            "owner": evaluated["owner_name"],
            "area_hectares": evaluated["area_hectares"],
            "bhuiyan_irrigation": evaluated["actual_irrigation"],
        },
        "bank_recorded_irrigation": evaluated["bank_recorded_irrigation"],
        "mismatch_detected": evaluated["actual_irrigation"] != evaluated["bank_recorded_irrigation"],
    }


@router.post("/self-calculate")
def self_calculate(req: SelfAuditRequest):
    return evaluate_entitlements_and_flags(req.dict())


@router.post("/grievance")
def submit_grievance(req: GrievanceRequest):
    rec = get_record_by_khasra(req.khasra_no)
    if not rec:
        raise HTTPException(status_code=404, detail="Khasra not found")
    data = evaluate_entitlements_and_flags(rec)
    ticket_id = f"CG-GRV-{random.randint(1000, 9999)}"
    today = datetime.now().strftime("%d-%m-%Y")
    issue_label = (
        "Irrigation & PMFBY Mismatch"
        if "IRRIGATION_MISMATCH" in data["flags"]
        else (
            "KCC Subvention / Calamity Relief"
            if data["calamity_restructuring_eligible"]
            else "Scheme Payout Discrepancy"
        )
    )
    letter = f"""सेवा में,

अध्यक्ष, जिला स्तरीय शिकायत निवारण समिति (DLGRC) / जिला कलेक्टर,

एवं शाखा प्रबंधक, जिला - {data['district']} (ब्लॉक: {data['block']}), छत्तीसगढ़

(प्रतिलिपि: कृषि रक्षक पोर्टल एवं हेल्पलाइन - 14447)

विषय: खसरा क्रमांक {data['khasra_no']} (ग्राम {data['village']}) के भुइयां B1 रिकॉर्ड सुधार, लंबित राशि भुगतान एवं RBI ऋण राहत बाबत।

महोदय,

मैं {data['owner_name']} ({data['father_name']}), ग्राम {data['village']}, खसरा क्रमांक {data['khasra_no']} का कृषक हूँ। नियम-आधारित ऑडिट में निम्न त्रुटियाँ पाई गई हैं:

1. धान खरीदी (MSP ₹3100/क्विंटल): अपेक्षित ₹{data['expected_msp']:,} | प्राप्त ₹{data['actual_msp']:,} | अंतर: ₹{data['msp_gap']:,}

2. फसल बीमा (PMFBY नियम 17.2): भुइयां सिंचित क्षेत्र ({data['area_hectares']} Ha) अनुसार अपेक्षित ₹{data['expected_pmfby']:,} | प्राप्त ₹{data['actual_pmfby']:,} | अंतर: ₹{data['pmfby_gap']:,}

3. KCC ब्याज एवं आपदा सुरक्षा (RBI दिशा-निर्देश): फसल क्षति {data['crop_loss_pct']}% | पात्र ब्याज दर {data['expected_interest_pct']}% (वर्तमान प्रभारित: {data['actual_interest_pct']}%) | ₹2 लाख तक बिना गारंटी ऋण पात्रता: {'हाँ' if data['collateral_free_eligible'] else 'नहीं'}

• त्रुटि कोड: {', '.join(data['flags'])}

अतः माननीय DLGRC समिति एवं बैंक अधिकारी से अनुरोध है कि भुइयां B1 रिकॉर्ड से मिलान कर लंबित ₹{data['total_shortfall']:,} का शीघ्र भुगतान एवं रिकॉर्ड सुधार करें।

दिनांक: {today} | टिकट आईडी: {ticket_id}"""

    grievance_doc = {
        "ticket_id": ticket_id,
        "khasra_no": data["khasra_no"],
        "owner_name": data["owner_name"],
        "village": data["village"],
        "block": data["block"],
        "district": data["district"],
        "issue_type": issue_label,
        "flags": data["flags"],
        "rupee_gap": data["total_shortfall"],
        "step": 1,  # Step 1: Filed by Farmer -> Bank updates to Step 2 & Step 3
        "status": "Pending Bank Audit",
        "created_at": today,
        "letter": letter,
    }

    grievances_collection.insert_one(grievance_doc)
    grievance_doc.pop("_id", None)
    return grievance_doc


@router.get("/grievances/{khasra_no:path}")
def get_farmer_grievances(khasra_no: str):
    return list(grievances_collection.find({"khasra_no": khasra_no}, {"_id": 0}))
