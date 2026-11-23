import datetime
import fastapi
import pydantic

from shared.database import records_collection, sanctions_collection, grievances_collection
from shared.rule_engine import load_all_records, evaluate_entitlements_and_flags

router = fastapi.APIRouter()


@router.get("/verify-all")
def verify_all_applications():
    records = load_all_records()
    return [evaluate_entitlements_and_flags(r) for r in records]


@router.get("/grievances")
def list_all_grievances():
    return list(grievances_collection.find({}, {"_id": 0}))


@router.get("/queue")
def get_queue():
    records = load_all_records()
    evaluated = [evaluate_entitlements_and_flags(r) for r in records]
    all_grievances = list(grievances_collection.find({}, {"_id": 0}))
    grv_by_khasra = {}
    for g in all_grievances:
        grv_by_khasra[g["khasra_no"]] = g

    def _row(e, r):
        is_dup = e["duplicate_mortgage"]
        active_grv = grv_by_khasra.get(e["khasra_no"])
        return {
            "khasra_no": e["khasra_no"], "farmer_name": e["owner_name"],
            "father_name": e["father_name"], "aadhaar_last4": e["aadhaar_last4"],
            "mobile": e["mobile"], "village": e["village"], "block": e["block"],
            "district": e["district"], "requested_amount": r.get("kcc_loan_amount", 0),
            "eligible_kcc_limit": e["eligible_kcc_limit"],
            "total_shortfall": e["total_shortfall"],
            "flags": e["flags"], "status": e["audit_status"], "grievance": active_grv,
            "bhuiyan": {"owner": e["owner_name"], "area_ha": e["area_hectares"], "irrigation": e["actual_irrigation"]},
            "bank_entry": {"owner": e["owner_name"], "area_ha": e["area_hectares"], "irrigation": e["bank_recorded_irrigation"], "crop": r.get("crop", "Paddy (Kharif)")},
            "cross_bank_loans": [{"bank": m["bank"], "type": "KCC Loan", "amount": m["amount"], "status": m.get("status", "Active")} for m in e["active_mortgages"]] if is_dup else [],
        }

    queue = sorted(
        [_row(e, r) for e, r in zip(evaluated, records)],
        key=lambda x: (1 if x["grievance"] and x["grievance"].get("step", 1) < 3 else 0, len(x["flags"])),
        reverse=True,
    )
    flagged = [e for e in evaluated if e["flags"]]
    dup = [e for e in evaluated if e["duplicate_mortgage"]]
    pending_grv = [g for g in all_grievances if g.get("step", 1) < 3]
    return {
        "kpis": {
            "total_applications": len(records), "flagged_count": len(flagged),
            "duplicate_mortgages": len(dup), "pending_grievances": len(pending_grv),
            "total_exposure_amount": sum(r.get("kcc_loan_amount", 0) for r in records),
        },
        "records": queue,
    }


@router.get("/verify/{khasra_no:path}")
def verify_khasra(khasra_no: str):
    records = load_all_records()
    record = next((r for r in records if r["khasra_no"] == khasra_no), None)
    if record is None:
        raise fastapi.HTTPException(status_code=404, detail="Khasra number not found")

    # Advance Step 1 grievances to Step 2 when Bank Officer opens the case
    grievances_collection.update_many(
        {"khasra_no": khasra_no, "step": 1},
        {"$set": {"step": 2, "status": "Under Bank Officer Audit"}},
    )

    e = evaluate_entitlements_and_flags(record)
    is_dup = e["duplicate_mortgage"]

    # Always fetch the LATEST grievance ticket for this Khasra
    latest_list = list(grievances_collection.find({"khasra_no": khasra_no}, {"_id": 0}))
    grievance = latest_list[-1] if latest_list else None

    return {
        "khasra_no": e["khasra_no"], "farmer_id": e["farmer_id"],
        "farmer_name": e["owner_name"], "father_name": e["father_name"],
        "aadhaar_last4": e["aadhaar_last4"], "mobile": e["mobile"],
        "village": e["village"], "block": e["block"], "district": e["district"],
        "requested_amount": record.get("kcc_loan_amount", 0),
        "eligible_kcc_limit": e["eligible_kcc_limit"],
        "collateral_free_eligible": e["collateral_free_eligible"],
        "calamity_restructuring_eligible": e["calamity_restructuring_eligible"],
        "expected_interest_pct": e["expected_interest_pct"],
        "actual_interest_pct": e["actual_interest_pct"],
        "expected_pmfby": e["expected_pmfby"], "actual_pmfby": e["actual_pmfby"],
        "pmfby_gap": e["pmfby_gap"], "msp_gap": e["msp_gap"],
        "total_shortfall": e["total_shortfall"], "grievance": grievance,
        "bhuiyan": {"owner": e["owner_name"], "area_ha": e["area_hectares"], "irrigation": e["actual_irrigation"]},
        "bank_entry": {"owner": e["owner_name"], "area_ha": e["area_hectares"], "irrigation": e["bank_recorded_irrigation"], "crop": record.get("crop", "Paddy (Kharif)")},
        "cross_bank_loans": [{"bank": m["bank"], "type": "KCC Loan", "amount": m["amount"], "status": m.get("status", "Active")} for m in e["active_mortgages"]] if is_dup else [],
        "flags": e["flags"],
    }


@router.post("/sync-land-record/{khasra_no:path}")
def sync_land_record(khasra_no: str):
    record = next((r for r in load_all_records() if r["khasra_no"] == khasra_no), None)
    if record is None:
        raise fastapi.HTTPException(status_code=404, detail="Khasra number not found")

    e_before = evaluate_entitlements_and_flags(record)
    records_collection.update_one(
        {"khasra_no": khasra_no},
        {"$set": {
            "bank_recorded_irrigation": record["actual_irrigation"],
            "interest_charged_pct": e_before["expected_interest_pct"],
            "pmfby_claim_received": e_before["expected_pmfby"],
            "msp_received": e_before["expected_msp"],
            "pmfby_portal_uploaded": True,
            "audit_status": "Synced with Bhuiyan",
        }},
    )
    grievances_collection.update_many(
        {"khasra_no": khasra_no},
        {"$set": {"step": 3, "status": "Bhuiyan Synced & Shortfall Approved"}},
    )
    return verify_khasra(khasra_no)


class DecisionRequest(pydantic.BaseModel):
    khasra_no: str
    decision: str
    reason: str = ""


@router.post("/decision")
def submit_decision(req: DecisionRequest):
    record = next((r for r in load_all_records() if r["khasra_no"] == req.khasra_no), None)
    if record is None:
        raise fastapi.HTTPException(status_code=404, detail="Khasra number not found")
    records_collection.update_one({"khasra_no": req.khasra_no}, {"$set": {"audit_status": req.decision}})
    sanctions_collection.insert_one({
        "khasra_no": req.khasra_no, "decision": req.decision,
        "reason": req.reason, "decided_at": datetime.datetime.now().strftime("%d-%m-%Y %H:%M"),
    })
    if req.decision == "APPROVE":
        grievances_collection.update_many({"khasra_no": req.khasra_no}, {"$set": {"step": 3, "status": "Approved & Disbursed by Bank"}})
    else:
        grievances_collection.update_many({"khasra_no": req.khasra_no}, {"$set": {"step": 2, "status": f"Bank Review: {req.decision}"}})
    return {"khasra_no": req.khasra_no, "decision": req.decision, "status": "recorded"}


@router.get("/policy-analytics")
def policy_analytics():
    records = load_all_records()
    evaluated = [evaluate_entitlements_and_flags(r) for r in records]
    dist_map: dict = {}
    for e in evaluated:
        d = e["district"]
        dist_map.setdefault(d, {"district": d, "discrepancies": 0, "blocked_rupees": 0})
        dist_map[d]["discrepancies"] += len(e["flags"])
        dist_map[d]["blocked_rupees"] += e["total_shortfall"]
    districts = sorted(dist_map.values(), key=lambda x: x["discrepancies"], reverse=True)
    label_map = {
        "IRRIGATION_MISMATCH": "Irrigation Classification Error",
        "KCC_SUBVENTION_MISSING": "Missing KCC Subvention",
        "DUPLICATE_MORTGAGE_DETECTED": "Duplicate Mortgages",
        "PMFBY_UNDERPAYMENT": "PMFBY Underpayment",
        "BANK_PORTAL_UPLOAD_NEGLIGENCE": "Bank Upload Negligence",
        "CALAMITY_RESTRUCTURING_DENIED": "Calamity Restructuring Denied",
    }
    cause_counts: dict = {}
    for e in evaluated:
        for flag in e["flags"]:
            label = label_map.get(flag, flag)
            cause_counts[label] = cause_counts.get(label, 0) + 1
    root_causes = [{"name": k, "value": v} for k, v in cause_counts.items()]
    alerts = []
    irr = sum(1 for e in evaluated if "IRRIGATION_MISMATCH" in e["flags"])
    if irr:
        alerts.append(f"{irr} plot(s) have irrigation mismatches — recommend mandatory Bhuiyan API auto-fetch.")
    dup = sum(1 for e in evaluated if "DUPLICATE_MORTGAGE_DETECTED" in e["flags"])
    if dup:
        alerts.append(f"{dup} case(s) of duplicate KCC mortgages. Enforce cross-bank lien lock before disbursement.")
    pmfby = sum(1 for e in evaluated if "PMFBY_UNDERPAYMENT" in e["flags"])
    if pmfby:
        alerts.append(f"{pmfby} farmer(s) have PMFBY underpayments. Verify crop-loss assessments against Bhuiyan records.")
    if not alerts:
        alerts.append("No critical policy alerts. All records verified.")
    return {"districts": districts, "root_causes": root_causes, "alerts": alerts}