import React, { useEffect, useState } from 'react';
import { X, RefreshCw, CheckCircle, Ban, AlertOctagon, PauseCircle, ShieldCheck, Volume2 } from 'lucide-react';
import { bankApi } from '../../services/bankApi';

export default function ComparisonDrawer({ khasraNo, onClose, onUpdated }) {
  const [record, setRecord] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    bankApi.verifyKhasra(khasraNo).then(setRecord);
  }, [khasraNo]);

  if (!record) return null;

  const ownerMismatch      = record.bhuiyan.owner !== record.bank_entry.owner;
  const irrigationMismatch = record.bhuiyan.irrigation !== record.bank_entry.irrigation;
  const areaMismatch       = record.bhuiyan.area_ha !== record.bank_entry.area_ha;
  const interestMismatch   = record.actual_interest_pct > record.expected_interest_pct;
  const hasShortfall       = (record.total_shortfall || 0) > 0;
  const hasDuplicateLoan   = record.cross_bank_loans.length > 0;
  const hasFixableError    = irrigationMismatch || areaMismatch || interestMismatch || hasShortfall;
  const hasAnyRedFlag      = ownerMismatch || hasFixableError || hasDuplicateLoan;

  const handleSync = async () => {
    setBusy(true);
    const updated = await bankApi.syncLandRecord(khasraNo);
    setRecord({ ...updated });
    setBusy(false);
    onUpdated(`Synced ${khasraNo} with Bhuiyan & updated Farmer Grievance to Step 3.`);
  };

  const handleDecision = async (decision) => {
    setBusy(true);
    await bankApi.submitDecision(khasraNo, decision, reason.trim());
    setBusy(false);
    onUpdated(`Application ${khasraNo} marked as ${decision}.`);
    onClose();
  };

  const counterScript = hasFixableError
    ? `राम-राम ${record.farmer_name} जी! भुइयां रिकॉर्ड म तुंहर जमीन '${record.bhuiyan.irrigation}' हे, फेर बैंक पोर्टल म '${record.bank_entry.irrigation}' दर्ज होय के कारण ₹${(record.total_shortfall || 0).toLocaleString('en-IN')} के अंतर आइस। नीचे बटन दबाके अभी सुधार करत हन।`
    : `राम-राम ${record.farmer_name} जी! तुंहर खसरा ${record.khasra_no} के भुइयां रिकॉर्ड, बीमा अऊ ब्याज छूट जम्मो मिलान हो चुके हे।`;

  const speakCounter = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(counterScript);
    u.lang = 'hi-IN'; u.rate = 0.92;
    window.speechSynthesis.speak(u);
  };

  const inr = (n = 0) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex justify-end">
      <div className="bg-white w-full max-w-5xl h-full flex flex-col shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold">
              <span>AGRISTACK ID: {record.farmer_id}</span>
              <span>•</span><span>AADHAAR: XXXX-XXXX-{record.aadhaar_last4}</span>
              <span>•</span><span>MOBILE: {record.mobile || 'N/A'}</span>
            </div>
            <h2 className="text-lg font-bold mt-0.5">Farmer 360° Audit: {record.farmer_name} ({record.father_name}) — Khasra {record.khasra_no}</h2>
            <p className="text-xs text-slate-300">Village: {record.village} • Block: {record.block} • District: {record.district}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {record.grievance && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase text-blue-800">Active Grievance: {record.grievance.ticket_id}</span>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">{record.grievance.issue_type} • Claimed Gap: {inr(record.grievance.rupee_gap)}</p>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold">
                <span className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-800">1. Filed ✓</span>
                <span>→</span>
                <span className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-800">2. Bank Audit ✓</span>
                <span>→</span>
                <span className={`px-2.5 py-1 rounded ${record.grievance.step === 3 ? 'bg-emerald-600 text-white' : 'bg-amber-100 text-amber-800'}`}>
                  {record.grievance.step === 3 ? '3. Synced & Resolved ✓' : '3. Pending Sync'}
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-emerald-200 bg-emerald-50/40 rounded-xl p-4 space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800">1. Official Land Registry (Bhuiyan B1)</h3>
              <Field label="Recorded Owner" value={record.bhuiyan.owner} />
              <Field label="Exact Area (Rakba)" value={`${record.bhuiyan.area_ha} ha`} />
              <Field label="Irrigation Status" value={record.bhuiyan.irrigation} />
              <Field label="Rule Eligible KCC Limit" value={inr(record.eligible_kcc_limit)} />
            </div>

            <div className="border border-slate-200 bg-white rounded-xl p-4 space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">2. Bank & PMFBY Portal Entry</h3>
              <Field label="Applicant Name" value={record.bank_entry.owner} error={ownerMismatch ? 'OWNERSHIP_MUTATION_PENDING' : null} />
              <Field label="Irrigation Status" value={record.bank_entry.irrigation} error={irrigationMismatch ? 'Mismatch vs Bhuiyan' : null} />
              <Field label="KCC Interest Charged" value={`${record.actual_interest_pct}% (Eligible: ${record.expected_interest_pct}%)`} error={interestMismatch ? '3% Subvention Missing' : null} />
              <Field label="PMFBY Insurance Payout" value={`Paid ${inr(record.actual_pmfby)} / Expected ${inr(record.expected_pmfby)}`} error={(record.pmfby_gap || 0) > 0 ? `Shortfall ${inr(record.pmfby_gap)}` : null} />
            </div>

            <div className="border border-slate-200 bg-slate-50 rounded-xl p-4 space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">3. Cross-Bank Liens & RBI Norms</h3>
              {hasDuplicateLoan ? record.cross_bank_loans.map((loan, i) => (
                <div key={i} className="p-3 bg-red-50 border border-red-300 rounded-lg text-red-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs uppercase"><AlertOctagon className="w-4 h-4 text-red-600" /> Duplicate Financing Trap</div>
                  <p className="text-sm font-semibold">{inr(loan.amount)} active {loan.type}</p>
                  <p className="text-xs text-red-700">Found at: <strong>{loan.bank}</strong> ({loan.status})</p>
                </div>
              )) : (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-medium">✓ No duplicate mortgages found across Cooperative or Commercial banks.</div>
              )}
              <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs space-y-1">
                <p className="font-bold text-slate-700 flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> RBI Protection Status</p>
                <p>• Collateral-Free (≤₹2L): {record.collateral_free_eligible ? 'Yes ✓' : 'No'}</p>
                <p>• Calamity Relief (≥33% loss): {record.calamity_restructuring_eligible ? 'Eligible ✓' : 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-xs font-bold text-slate-600 mb-1">Counter Explanation for Farmer (छत्तीसगढ़ी / हिंदी):</p>
            <p className="text-sm text-slate-800 leading-relaxed">{counterScript}</p>
            <button onClick={speakCounter} className="mt-2 flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:underline"><Volume2 className="w-4 h-4" /> Play Audio</button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-xs font-bold text-blue-800 mb-1 uppercase tracking-wide">Official Audit Summary (English — shown to farmer in their language)</p>
            <p className="text-sm text-slate-800 leading-relaxed">
              {typeof record.auto_gov_remark === 'object'
                ? record.auto_gov_remark.en
                : record.bank_remark?.en || 'Audit pending.'}
            </p>
          </div>
        </div>

        <div className="p-5 border-t border-slate-200 bg-slate-50 space-y-3">
          <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Officer audit remarks / sanction notes..." className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white" />
          <div className="flex flex-wrap items-center justify-between gap-3">
            {hasFixableError && (
              <button disabled={busy} onClick={handleSync} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg">
                <RefreshCw className="w-4 h-4" /> Sync with Bhuiyan & Resolve Shortfall
              </button>
            )}
            <div className="flex flex-wrap gap-2 ml-auto">
              <button disabled={busy} onClick={() => handleDecision('HOLD_FOR_CORRECTION')} className="flex items-center gap-1.5 px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 text-sm font-semibold rounded-lg"><PauseCircle className="w-4 h-4" /> Hold for Correction</button>
              {hasDuplicateLoan && (
                <button disabled={busy} onClick={() => handleDecision('REJECT_DUPLICATE')} className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg"><Ban className="w-4 h-4" /> Flag & Reject Duplicate</button>
              )}
              <button disabled={busy || hasAnyRedFlag} title={hasAnyRedFlag ? 'Sync Bhuiyan errors and clear duplicate loans before approving' : 'Approve KCC loan and release claim'} onClick={() => handleDecision('APPROVE')} className={`flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-lg ${hasAnyRedFlag ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow'}`}>
                <CheckCircle className="w-4 h-4" /> Approve Loan / Release Claim
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, error }) {
  return (
    <div className={`p-2.5 rounded-lg border ${error ? 'bg-red-50 border-red-300' : 'bg-white border-slate-100'}`}>
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className={`text-sm font-semibold ${error ? 'text-red-700' : 'text-slate-900'}`}>{value}</div>
      {error && <span className="inline-block mt-1 px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-800 rounded">{error}</span>}
    </div>
  );
}
