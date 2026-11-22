from shared.database import records_collection


def get_record_by_khasra(khasra_no: str):
    return records_collection.find_one({"khasra_no": khasra_no}, {"_id": 0})


def load_all_records():
    """All farmer records (MongoDB-backed). Used by the bank view endpoints so
    routes/bank_routes.py keeps working after the move from the JSON mock_db."""
    return list(records_collection.find({}, {"_id": 0}))


def evaluate_entitlements_and_flags(record: dict) -> dict:
    area = float(record.get("area_hectares", 0))
    actual_irr = record.get("actual_irrigation", "Irrigated")
    bank_irr = record.get("bank_recorded_irrigation", actual_irr)
    crop_loss = int(record.get("crop_loss_pct", 0))

    # 1. MSP Calculation (CG Krishak Unnati Paddy Rate = Rs 3,100/qtl)
    expected_msp = int(record.get("quintals_sold", 0) * 3100)
    actual_msp = int(record.get("msp_received", 0))
    msp_gap = max(0, expected_msp - actual_msp)

    # 2. KCC Scale of Finance Limit (Irrigated: Rs 50,000/ha | Unirrigated: Rs 35,000/ha)
    sof_rate = 50000 if actual_irr == "Irrigated" else 35000
    eligible_kcc_limit = int(area * sof_rate)
    collateral_free_eligible = eligible_kcc_limit <= 200000  # RBI Rs 2 Lakh Collateral-Free Rule

    # 3. RBI Calamity Loan Restructuring Check (>= 33% crop loss)
    calamity_restructuring_eligible = crop_loss >= 33

    # 4. KCC Interest Subvention (4% if repaid on time OR >= 33% calamity protection)
    repaid_on_time = record.get("repaid_on_time", True)
    expected_interest = 4.0 if (repaid_on_time or calamity_restructuring_eligible) else 7.0
    actual_interest = float(record.get("interest_charged_pct", 4.0))
    subvention_missing = actual_interest > expected_interest
    penal_interest_violation = calamity_restructuring_eligible and actual_interest > 7.0

    # 5. PMFBY Crop Insurance (Irrigated: Rs 66,000/ha | Unirrigated: Rs 45,000/ha)
    sum_insured_per_ha = 66000 if actual_irr == "Irrigated" else 45000
    expected_pmfby = int(area * sum_insured_per_ha * (crop_loss / 100))
    actual_pmfby = int(record.get("pmfby_claim_received", 0))
    pmfby_gap = max(0, expected_pmfby - actual_pmfby)

    # 6. Bank Portal Upload Negligence (PMFBY Rule 17.2)
    bank_upload_negligence = record.get("pmfby_premium_deducted", True) and not record.get("pmfby_portal_uploaded", True)

    # 7. Cross-Bank Duplicate Mortgage Check
    mortgages = record.get("active_mortgages", [])
    total_existing_debt = sum(m.get("amount", 0) for m in mortgages)
    duplicate_mortgage = len(mortgages) > 1

    # 8. Deterministic Flags
    flags = []
    if actual_irr != bank_irr:
        flags.append("IRRIGATION_MISMATCH")
    if subvention_missing:
        flags.append("KCC_SUBVENTION_MISSING")
    if penal_interest_violation:
        flags.append("CALAMITY_RESTRUCTURING_DENIED")
    if pmfby_gap > 0:
        flags.append("PMFBY_UNDERPAYMENT")
    if bank_upload_negligence:
        flags.append("BANK_PORTAL_UPLOAD_NEGLIGENCE")
    if duplicate_mortgage:
        flags.append("DUPLICATE_MORTGAGE_DETECTED")

    return {
        "khasra_no": record["khasra_no"],
        "farmer_id": record.get("farmer_id", "CG-AGRI-00000"),
        "owner_name": record["owner_name"],
        "father_name": record.get("father_name", "S/o Village Farmer"),
        "aadhaar_last4": record.get("aadhaar_last4", "0000"),
        "mobile": record.get("mobile", ""),
        "village": record["village"],
        "block": record.get("block", record["village"]),
        "district": record["district"],
        "area_hectares": area,
        "actual_irrigation": actual_irr,
        "bank_recorded_irrigation": bank_irr,
        "bhuiyan_slip_uploaded": record.get("bhuiyan_slip_uploaded", True),
        "crop_loss_pct": crop_loss,
        "eligible_kcc_limit": eligible_kcc_limit,
        "collateral_free_eligible": collateral_free_eligible,
        "calamity_restructuring_eligible": calamity_restructuring_eligible,
        "expected_msp": expected_msp,
        "actual_msp": actual_msp,
        "msp_gap": msp_gap,
        "expected_interest_pct": expected_interest,
        "actual_interest_pct": actual_interest,
        "expected_pmfby": expected_pmfby,
        "actual_pmfby": actual_pmfby,
        "pmfby_gap": pmfby_gap,
        "bank_upload_negligence": bank_upload_negligence,
        "active_mortgages": mortgages,
        "total_existing_debt": total_existing_debt,
        "duplicate_mortgage": duplicate_mortgage,
        "flags": flags,
        "total_shortfall": msp_gap + pmfby_gap,
        "audit_status": "Verified & Synced" if not flags else record.get("audit_status", "Discrepancy Flagged"),
    }
