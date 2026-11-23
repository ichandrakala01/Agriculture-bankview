import datetime
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

    result = {
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
    result["auto_gov_remark"] = build_simple_gov_remark(result)
    saved_remark = record.get("bank_remark")
    result["bank_remark"] = saved_remark if isinstance(saved_remark, dict) else result["auto_gov_remark"]
    return result


def build_simple_gov_remark(e: dict, action: str = None) -> dict:
    name     = e["owner_name"]
    ref_no   = e.get("farmer_id", f"CG-{e['khasra_no']}")
    today    = datetime.date.today().strftime("%d/%m/%Y")
    branch   = f"{e['village']} Branch, {e['district']}"
    mortgages = e.get("active_mortgages", [])
    bank_name = mortgages[0]["bank"] if mortgages else "Chhattisgarh Rajya Gramin Bank"
    helpline  = "14447 / 1800-180-1551"
    flags     = e.get("flags", [])

    en_reasons, hi_reasons, cg_reasons = [], [], []

    if "DUPLICATE_MORTGAGE_DETECTED" in flags:
        en_reasons.append(f"existing active loan on Khasra {e['khasra_no']} at another bank")
        hi_reasons.append(f"खसरा {e['khasra_no']} पर दूसरे बैंक से पहले से सक्रिय ऋण होना")
        cg_reasons.append(f"खसरा {e['khasra_no']} म दूसर बैंक ले पहिली ले करजा चलत हे")

    if "IRRIGATION_MISMATCH" in flags:
        en_reasons.append(f"mismatch between Bhuiyan ({e['actual_irrigation']}) and Bank ({e['bank_recorded_irrigation']}) land records")
        hi_reasons.append(f"भुइयां ({e['actual_irrigation']}) और बैंक ({e['bank_recorded_irrigation']}) भूमि रिकॉर्ड में अंतर")
        cg_reasons.append(f"भुइयां ({e['actual_irrigation']}) अऊ बैंक ({e['bank_recorded_irrigation']}) जमीन रिकॉर्ड म अंतर")

    if "PMFBY_UNDERPAYMENT" in flags:
        en_reasons.append(f"PMFBY crop insurance shortfall of ₹{e['pmfby_gap']:,}")
        hi_reasons.append(f"फसल बीमा (PMFBY) में ₹{e['pmfby_gap']:,} का कम भुगतान")
        cg_reasons.append(f"फसल बीमा (PMFBY) म ₹{e['pmfby_gap']:,} के कम भुगतान")

    if e.get("msp_gap", 0) > 0:
        en_reasons.append(f"paddy MSP payout shortfall of ₹{e['msp_gap']:,}")
        hi_reasons.append(f"धान खरीदी (MSP) में ₹{e['msp_gap']:,} का अंतर")
        cg_reasons.append(f"धान खरीदी (MSP) म ₹{e['msp_gap']:,} के अंतर")

    if "KCC_SUBVENTION_MISSING" in flags or "CALAMITY_RESTRUCTURING_DENIED" in flags:
        en_reasons.append(f"3% KCC interest subvention not applied (charged {e['actual_interest_pct']}% vs {e['expected_interest_pct']}%)")
        hi_reasons.append(f"3% KCC ब्याज छूट लागू न होना ({e['expected_interest_pct']}% की जगह {e['actual_interest_pct']}%)")
        cg_reasons.append(f"3% KCC ब्याज छूट नइ लगे हे ({e['expected_interest_pct']}% के जगह {e['actual_interest_pct']}%)")

    if "BANK_PORTAL_UPLOAD_NEGLIGENCE" in flags:
        en_reasons.append("incomplete portal upload of insured land data by branch")
        hi_reasons.append("शाखा द्वारा बीमा पोर्टल पर अधूरा डेटा अपलोड")
        cg_reasons.append("शाखा द्वारा बीमा पोर्टल म अधूरा जानकारी चढ़ाय गे हे")

    en_r = ", ".join(en_reasons) if en_reasons else "all land, KYC, and scheme records verified"
    hi_r = ", ".join(hi_reasons) if hi_reasons else "सभी भूमि, केवाईसी और योजना रिकॉर्ड सही पाए गए"
    cg_r = ", ".join(cg_reasons) if cg_reasons else "सबो जमीन, केवाईसी अऊ योजना रिकॉर्ड सही पाए गे हे"

    if action == "REJECT_DUPLICATE":
        return {
            "en": f"Dear {name}, your Kisan Credit Card (KCC) / subsidy application (Ref No: {ref_no}) dated {today} has been declined due to {en_r}. For details or re-application, please visit your home branch ({branch}) or call {helpline}. - {bank_name}",
            "hi": f"प्रिय {name}, आपका किसान क्रेडिट कार्ड (KCC) / सब्सिडी आवेदन (संदर्भ क्र.: {ref_no}) दिनांक {today} को {hi_r} के कारण अस्वीकृत (Declined) कर दिया गया है। अधिक जानकारी या पुनः आवेदन के लिए कृपया अपनी गृह शाखा ({branch}) में जाएं या {helpline} पर कॉल करें। - {bank_name}",
            "cg": f"राम-राम {name} जी, आप के किसान क्रेडिट कार्ड (KCC) / सब्सिडी आवेदन (नंबर: {ref_no}) तारीख {today} ल {cg_r} के कारण अस्वीकृत (रद्द) कर दे गे हे। ज्यादा जानकारी या फेर से आवेदन बर अपन शाखा ({branch}) म जावव या {helpline} म फोन करव। - {bank_name}",
        }

    if action == "HOLD_FOR_CORRECTION":
        return {
            "en": f"Dear {name}, your KCC / subsidy application (Ref No: {ref_no}) dated {today} has been placed ON HOLD due to {en_r}. For record correction, please visit your home branch ({branch}) or call {helpline}. - {bank_name}",
            "hi": f"प्रिय {name}, आपका KCC / सब्सिडी आवेदन (संदर्भ क्र.: {ref_no}) दिनांक {today} को {hi_r} के कारण सुधार हेतु अस्थायी रूप से रोका (Hold) गया है। विवरण सुधार के लिए अपनी शाखा ({branch}) में संपर्क करें या {helpline} पर कॉल करें। - {bank_name}",
            "cg": f"राम-राम {name} जी, आप के KCC / सब्सिडी आवेदन (नंबर: {ref_no}) तारीख {today} ल {cg_r} के कारण सुधार बर अभी रोके (Hold) गे हे। रिकॉर्ड सुधारे बर अपन शाखा ({branch}) म जावव या {helpline} म फोन करव। - {bank_name}",
        }

    if action in ("APPROVE", "SYNCED"):
        return {
            "en": f"Dear {name}, your KCC / subsidy claim (Ref No: {ref_no}) dated {today} has been APPROVED and synced with Bhuiyan land records. Pending entitlements will be credited to your account. For queries, visit {branch} or call {helpline}. - {bank_name}",
            "hi": f"प्रिय {name}, आपका KCC / सब्सिडी दावा (संदर्भ क्र.: {ref_no}) दिनांक {today} को स्वीकृत (Approved) कर भुइयां रिकॉर्ड से मिलान कर दिया गया है। बकाया राशि शीघ्र आपके खाते में जमा होगी। सहायता हेतु {branch} जाएं या {helpline} पर कॉल करें। - {bank_name}",
            "cg": f"राम-राम {name} जी, आप के KCC / सब्सिडी दावा (नंबर: {ref_no}) तारीख {today} ल पास (Approved) करके भुइयां रिकॉर्ड ले मिलान कर दे गे हे। बकाया पइसा जल्द ही तुंहर खाता म आ जही। जानकारी बर {branch} जावव या {helpline} म फोन करव। - {bank_name}",
        }

    # Default: audit notice before officer action
    status_en = "under audit due to " + en_r if en_reasons else "verified and compliant with all rules"
    status_hi = hi_r + " के कारण जांच में है" if hi_reasons else "सत्यापित और सभी नियमों के अनुरूप है"
    status_cg = cg_r + " के कारण जांच म हे" if cg_reasons else "सत्यापित अऊ सबो नियम के अनुसार सही हे"

    return {
        "en": f"Dear {name}, your KCC / scheme record (Ref No: {ref_no}) dated {today} is currently {status_en}. For assistance, visit your home branch ({branch}) or call {helpline}. - {bank_name}",
        "hi": f"प्रिय {name}, आपका KCC / योजना रिकॉर्ड (संदर्भ क्र.: {ref_no}) दिनांक {today} को वर्तमान में {status_hi}। सहायता के लिए अपनी शाखा ({branch}) में जाएं या {helpline} पर कॉल करें। - {bank_name}",
        "cg": f"राम-राम {name} जी, आप के KCC / योजना रिकॉर्ड (नंबर: {ref_no}) तारीख {today} ल अभी {status_cg}। मदद बर अपन शाखा ({branch}) म जावव या {helpline} म फोन करव। - {bank_name}",
    }