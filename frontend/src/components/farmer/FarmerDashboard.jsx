import React, { useState } from 'react';
import {
  Mic, Volume2, AlertTriangle, CheckCircle, Copy, Check, Printer,
  Upload, ShieldCheck, UserPlus, LogIn, Calculator, Clock, BookOpen, Landmark,
} from 'lucide-react';
import KisanVoiceSaathi from './KisanVoiceSaathi';

const API_BASE = '/api/farmer';

const RULES = [
  { k: 'MSP (Paddy)', v: '₹3,100 per quintal (CG Krishak Unnati)' },
  { k: 'KCC Scale of Finance', v: 'Irrigated ₹50,000/ha • Unirrigated ₹35,000/ha' },
  { k: 'Collateral-Free KCC', v: 'Up to ₹2,00,000 (RBI norm)' },
  { k: 'PMFBY Sum Insured', v: 'Irrigated ₹66,000/ha • Unirrigated ₹45,000/ha' },
  { k: 'RBI Calamity Relief', v: '≥33% crop loss → restructuring + 4% subvention' },
  { k: 'KCC Interest Subvention', v: '4% if repaid on time (else 7%)' },
];

const inr = (n = 0) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function FarmerDashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [loginKhasra, setLoginKhasra] = useState('102/4');
  const [record, setRecord] = useState(null);
  const [grievances, setGrievances] = useState([]);
  const [activeGrievance, setActiveGrievance] = useState(null);
  const [ocrResult, setOcrResult] = useState(null);
  const [calcResult, setCalcResult] = useState(null);
  const [lang, setLang] = useState('cg');
  const [activeTab, setActiveTab] = useState('overview');
  const [listening, setListening] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [regForm, setRegForm] = useState({
    khasra_no: '', owner_name: '', father_name: '', aadhaar_last4: '',
    mobile: '', village: 'Kurud', block: 'Kurud', district: 'Dhamtari',
    area_hectares: 2.0, actual_irrigation: 'Irrigated', bank_recorded_irrigation: 'Unirrigated',
    quintals_sold: 40, msp_received: 124000, kcc_loan_amount: 100000,
    interest_charged_pct: 7.0, repaid_on_time: true, crop_loss_pct: 50, pmfby_claim_received: 25000,
  });

  const [calcInput, setCalcInput] = useState({
    area_hectares: 2.0, actual_irrigation: 'Irrigated', bank_recorded_irrigation: 'Unirrigated',
    quintals_sold: 42, msp_received: 118000, interest_charged_pct: 7.0,
    repaid_on_time: true, crop_loss_pct: 45, pmfby_claim_received: 20000,
  });

  const speak = (text) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === 'en' ? 'en-IN' : 'hi-IN';
    u.rate = 0.92;
    window.speechSynthesis.speak(u);
  };

  const api = async (path, opts) => {
    const res = await fetch(`${API_BASE}${path}`, opts);
    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try { detail = (await res.json()).detail || detail; } catch { /* keep default */ }
      throw new Error(detail);
    }
    return res.json();
  };

  const fetchFarmerData = async (khasraNo) => {
    setLoading(true);
    setError('');
    try {
      const data = await api(`/check/${encodeURIComponent(khasraNo)}`);
      setRecord(data);
      setIsLoggedIn(true);
      try { setGrievances(await api(`/grievances/${encodeURIComponent(khasraNo)}`)); } catch { /* none yet */ }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...regForm,
          area_hectares: parseFloat(regForm.area_hectares),
          quintals_sold: parseFloat(regForm.quintals_sold),
          msp_received: parseInt(regForm.msp_received, 10),
          kcc_loan_amount: parseInt(regForm.kcc_loan_amount, 10),
          interest_charged_pct: parseFloat(regForm.interest_charged_pct),
          crop_loss_pct: parseInt(regForm.crop_loss_pct, 10),
          pmfby_claim_received: parseInt(regForm.pmfby_claim_received, 10),
        }),
      });
      setLoginKhasra(regForm.khasra_no);
      await fetchFarmerData(regForm.khasra_no);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBhuiyanUpload = async () => {
    if (!record) return;
    try {
      setOcrResult(await api(`/verify-bhuiyan-slip/${encodeURIComponent(record.khasra_no)}`, { method: 'POST' }));
    } catch (err) { setError(err.message); }
  };

  const handleRunCalculator = async (e) => {
    e.preventDefault();
    try {
      setCalcResult(await api('/self-calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          khasra_no: record?.khasra_no || 'CUSTOM',
          owner_name: record?.owner_name || 'Farmer',
          village: record?.village || 'Kurud',
          district: record?.district || 'Dhamtari',
          ...calcInput,
          area_hectares: parseFloat(calcInput.area_hectares),
          quintals_sold: parseFloat(calcInput.quintals_sold),
          msp_received: parseInt(calcInput.msp_received, 10),
          interest_charged_pct: parseFloat(calcInput.interest_charged_pct),
          crop_loss_pct: parseInt(calcInput.crop_loss_pct, 10),
          pmfby_claim_received: parseInt(calcInput.pmfby_claim_received, 10),
        }),
      }));
    } catch (err) { setError(err.message); }
  };

  const handleFileGrievance = async () => {
    if (!record) return;
    try {
      const data = await api('/grievance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ khasra_no: record.khasra_no, language: lang }),
      });
      setActiveGrievance(data);
      setGrievances([data, ...grievances]);
      setActiveTab('grievances');
    } catch (err) { setError(err.message); }
  };

  const handleVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Use Google Chrome for voice navigation.'); return; }
    const rec = new SR();
    rec.lang = 'hi-IN';
    setListening(true);
    rec.onresult = (e) => {
      const spoken = e.results[0][0].transcript;
      setListening(false);
      if (spoken.includes('शिकायत')) handleFileGrievance();
      else if (spoken.includes('हिसाब') || spoken.includes('कैलकुलेटर')) setActiveTab('calculator');
      else if (spoken.includes('नियम')) setActiveTab('rules');
      else if (spoken.includes('जमीन')) setActiveTab('overview');
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
  };

  const summary = () => {
    if (!record) return '';
    if (record.total_shortfall === 0 && record.flags.length === 0) {
      return lang === 'en'
        ? `Hello ${record.owner_name}! All MSP, KCC and PMFBY records for Khasra ${record.khasra_no} are verified and accurate.`
        : `राम-राम ${record.owner_name} भैया! तुंहर खसरा ${record.khasra_no} के जम्मो हिसाब अऊ भुइयां रिकॉर्ड बिल्कुल सही हे।`;
    }
    return lang === 'en'
      ? `Alert ${record.owner_name}: shortfall of ₹${record.total_shortfall.toLocaleString()} on Khasra ${record.khasra_no} (${record.flags.join(', ')}).`
      : `राम-राम ${record.owner_name} भैया! तुंहर खसरा ${record.khasra_no} म कुल ₹${record.total_shortfall.toLocaleString()} के कमी मिले हे। भुइयां म जमीन ${record.actual_irrigation} हे फेर बैंक ${record.bank_recorded_irrigation} लिख दे हे।`;
  };

  const copyLetter = () => {
    if (!activeGrievance) return;
    navigator.clipboard.writeText(activeGrievance.letter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const printLetter = () => {
    if (!activeGrievance) return;
    const w = window.open('', '_blank');
    w.document.write(`<pre style="font-family:serif;white-space:pre-wrap">${activeGrievance.letter}</pre>`);
    w.document.close();
    w.print();
  };

  // ---------- SCREEN 0: LOGIN / REGISTER ----------
  if (!isLoggedIn) {
    return (
      <div className="max-w-4xl mx-auto p-6 mt-6">
        <div className="bg-white rounded-3xl shadow-lg border border-stone-200 overflow-hidden grid grid-cols-1 md:grid-cols-12">
          <div className="md:col-span-5 bg-emerald-900 text-white p-8 flex flex-col justify-between">
            <div>
              <span className="bg-amber-400 text-stone-950 text-xs font-bold px-3 py-1 rounded-full">CHHATTISGARH GOV-TECH PORTAL</span>
              <h1 className="text-2xl font-bold mt-4">किसान हक अऊ पारदर्शिता पोर्टल</h1>
              <p className="text-emerald-100 text-sm mt-2 leading-relaxed">Verify Bhuiyan land records, audit MSP &amp; PMFBY payouts, check RBI loan protections, and file DLGRC complaints in Chhattisgarhi &amp; Hindi.</p>
            </div>
            <div className="mt-8 bg-emerald-800/70 p-4 rounded-2xl text-xs space-y-1.5">
              <p className="font-bold text-amber-300">1-Click Demo Logins:</p>
              <button onClick={() => fetchFarmerData('102/4')} className="block w-full text-left py-1 hover:underline">→ Khasra 102/4 (Rameshwar Sahu — Irrigation + Calamity)</button>
              <button onClick={() => fetchFarmerData('101/1')} className="block w-full text-left py-1 hover:underline">→ Khasra 101/1 (Suresh Verma — Clean Verified)</button>
            </div>
          </div>

          <div className="md:col-span-7 p-8">
            <div className="flex gap-2 mb-6 border-b border-stone-200 pb-3">
              <button onClick={() => setAuthMode('login')} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold ${authMode === 'login' ? 'bg-emerald-700 text-white' : 'bg-stone-100 text-stone-700'}`}><LogIn className="w-4 h-4" /> Existing Farmer</button>
              <button onClick={() => setAuthMode('register')} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold ${authMode === 'register' ? 'bg-emerald-700 text-white' : 'bg-stone-100 text-stone-700'}`}><UserPlus className="w-4 h-4" /> New Registration</button>
            </div>

            {error && <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

            {authMode === 'login' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1">Registered Khasra Number</label>
                  <input value={loginKhasra} onChange={(e) => setLoginKhasra(e.target.value)} placeholder="e.g. 102/4" className="w-full px-4 py-3 rounded-xl border border-stone-300 font-semibold" />
                </div>
                <button onClick={() => fetchFarmerData(loginKhasra)} disabled={loading} className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl shadow">{loading ? 'Loading...' : 'Open My Portal →'}</button>
              </div>
            ) : (
              <>
                <KisanVoiceSaathi
                  mode="register"
                  setRegForm={setRegForm}
                  onSubmitRegistration={() => document.getElementById('register-submit-btn')?.click()}
                />

                <form onSubmit={handleRegister} className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <label className="block sm:col-span-2">
                  <span className="block text-xs font-bold text-stone-600 mb-1">Khasra Number *</span>
                  <input required placeholder="e.g. 205/1" value={regForm.khasra_no} onChange={(e) => setRegForm({ ...regForm, khasra_no: e.target.value })} className="w-full px-3 py-2 border border-stone-300 rounded-xl" />
                </label>
                <label className="block">
                  <span className="block text-xs font-bold text-stone-600 mb-1">Farmer Full Name *</span>
                  <input required placeholder="e.g. Dukalu Yadav" value={regForm.owner_name} onChange={(e) => setRegForm({ ...regForm, owner_name: e.target.value })} className="w-full px-3 py-2 border border-stone-300 rounded-xl" />
                </label>
                <label className="block">
                  <span className="block text-xs font-bold text-stone-600 mb-1">Father&apos;s / Husband&apos;s Name</span>
                  <input placeholder="e.g. S/o Ramcharan Yadav" value={regForm.father_name} onChange={(e) => setRegForm({ ...regForm, father_name: e.target.value })} className="w-full px-3 py-2 border border-stone-300 rounded-xl" />
                </label>
                <label className="block">
                  <span className="block text-xs font-bold text-stone-600 mb-1">Mobile Number *</span>
                  <input required placeholder="e.g. 9826112345" value={regForm.mobile} onChange={(e) => setRegForm({ ...regForm, mobile: e.target.value })} className="w-full px-3 py-2 border border-stone-300 rounded-xl" />
                </label>
                <label className="block">
                  <span className="block text-xs font-bold text-stone-600 mb-1">Aadhaar (Last 4 Digits)</span>
                  <input maxLength={4} placeholder="e.g. 5521" value={regForm.aadhaar_last4} onChange={(e) => setRegForm({ ...regForm, aadhaar_last4: e.target.value })} className="w-full px-3 py-2 border border-stone-300 rounded-xl" />
                </label>
                <label className="block">
                  <span className="block text-xs font-bold text-stone-600 mb-1">District</span>
                  <select value={regForm.district} onChange={(e) => setRegForm({ ...regForm, district: e.target.value })} className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white">
                    <option>Dhamtari</option><option>Raipur</option><option>Durg</option><option>Mahasamund</option>
                  </select>
                </label>
                <label className="block">
                  <span className="block text-xs font-bold text-stone-600 mb-1">Village / Block</span>
                  <input placeholder="e.g. Kurud" value={regForm.village} onChange={(e) => setRegForm({ ...regForm, village: e.target.value, block: e.target.value })} className="w-full px-3 py-2 border border-stone-300 rounded-xl" />
                </label>
                <label className="block">
                  <span className="block text-xs font-bold text-stone-600 mb-1">Land Area (Hectares)</span>
                  <input type="number" step="0.1" placeholder="e.g. 2.0" value={regForm.area_hectares} onChange={(e) => setRegForm({ ...regForm, area_hectares: e.target.value })} className="w-full px-3 py-2 border border-stone-300 rounded-xl" />
                </label>
                <label className="block">
                  <span className="block text-xs font-bold text-stone-600 mb-1">Crop Loss % (PMFBY)</span>
                  <input type="number" min="0" max="100" placeholder="e.g. 50" value={regForm.crop_loss_pct} onChange={(e) => setRegForm({ ...regForm, crop_loss_pct: e.target.value })} className="w-full px-3 py-2 border border-stone-300 rounded-xl" />
                </label>
                <label className="block">
                  <span className="block text-xs font-bold text-stone-600 mb-1">KCC Loan Amount (₹)</span>
                  <input type="number" placeholder="e.g. 100000" value={regForm.kcc_loan_amount} onChange={(e) => setRegForm({ ...regForm, kcc_loan_amount: e.target.value })} className="w-full px-3 py-2 border border-stone-300 rounded-xl" />
                </label>
                <label className="block">
                  <span className="block text-xs font-bold text-stone-600 mb-1">Interest Charged (%)</span>
                  <input type="number" step="0.5" placeholder="e.g. 7.0" value={regForm.interest_charged_pct} onChange={(e) => setRegForm({ ...regForm, interest_charged_pct: e.target.value })} className="w-full px-3 py-2 border border-stone-300 rounded-xl" />
                </label>
                <label className="block">
                  <span className="block text-xs font-bold text-emerald-800 mb-1">Actual Irrigation (Bhuiyan Slip)</span>
                  <select value={regForm.actual_irrigation} onChange={(e) => setRegForm({ ...regForm, actual_irrigation: e.target.value })} className="w-full px-3 py-2 border border-emerald-300 bg-emerald-50/40 rounded-xl">
                    <option value="Irrigated">Irrigated (सिंचित)</option>
                    <option value="Unirrigated">Unirrigated (असिंचित)</option>
                  </select>
                </label>
                <label className="block">
                  <span className="block text-xs font-bold text-amber-800 mb-1">Bank Portal Entry (Demo Mismatch)</span>
                  <select value={regForm.bank_recorded_irrigation} onChange={(e) => setRegForm({ ...regForm, bank_recorded_irrigation: e.target.value })} className="w-full px-3 py-2 border border-amber-300 bg-amber-50/40 rounded-xl">
                    <option value="Unirrigated">Unirrigated (असिंचित)</option>
                    <option value="Irrigated">Irrigated (सिंचित)</option>
                  </select>
                </label>
                <button id="register-submit-btn" disabled={loading} className="sm:col-span-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl mt-1">
                  Save to MongoDB &amp; Launch Portal →
                </button>
              </form>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---------- LOGGED-IN 4-TAB PORTAL ----------
  const tabs = [
    { id: 'overview', label: '1. My Land & Schemes', icon: Landmark },
    { id: 'calculator', label: '2. Self-Check Calculator', icon: Calculator },
    { id: 'grievances', label: `3. My Grievances (${grievances.length})`, icon: Clock },
    { id: 'rules', label: '4. Scheme Rules & Audio', icon: BookOpen },
  ];

  return (
    <div className="min-h-screen bg-stone-100">
      <header className="bg-emerald-900 text-white px-6 py-4 shadow">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs text-emerald-200">AgriStack ID: {record.farmer_id} • Khasra: {record.khasra_no} • {record.village}, {record.district}</div>
            <h1 className="text-lg font-bold">{record.owner_name} ({record.father_name})</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={handleVoice} className={`px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 ${listening ? 'bg-red-500 animate-pulse' : 'bg-amber-400 text-stone-950'}`}><Mic className="w-4 h-4" />{listening ? 'Listening...' : 'Voice'}</button>
            {[{ code: 'cg', label: 'छत्तीसगढ़ी' }, { code: 'hi', label: 'हिंदी' }, { code: 'en', label: 'EN' }].map((l) => (
              <button key={l.code} onClick={() => setLang(l.code)} className={`px-3 py-2 rounded-xl text-xs font-bold ${lang === l.code ? 'bg-white text-emerald-950' : 'bg-emerald-800 text-emerald-100'}`}>{l.label}</button>
            ))}
            <button onClick={() => { setIsLoggedIn(false); setRecord(null); setGrievances([]); }} className="px-3 py-2 rounded-xl text-xs bg-stone-800 hover:bg-stone-700">Switch Farmer</button>
          </div>
        </div>
      </header>

      <nav className="max-w-6xl mx-auto px-6 mt-4 flex flex-wrap gap-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id)} className={`px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition ${activeTab === t.id ? 'bg-emerald-700 text-white shadow' : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'}`}>
              <Icon className="w-4 h-4" />{t.label}
            </button>
          );
        })}
      </nav>

      <div className="max-w-6xl mx-auto px-6 pt-4">
        <KisanVoiceSaathi
          mode="post_register_guide"
          record={record}
          onFileGrievance={handleFileGrievance}
          onOpenRules={() => { setActiveTab('rules'); speak(RULES.map((r) => `${r.k}: ${r.v}`).join('. ')); }}
          onOpenCalculator={() => setActiveTab('calculator')}
        />
      </div>

      <main className="max-w-6xl mx-auto px-6 py-6">
        {error && <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start justify-between gap-4">
              <p className="text-sm text-emerald-900">{summary()}</p>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => speak(summary())} className="px-3 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1"><Volume2 className="w-4 h-4" /> Listen</button>
                <button onClick={handleBhuiyanUpload} className="px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-1"><Upload className="w-4 h-4" /> Bhuiyan Slip</button>
              </div>
            </div>

            {ocrResult && (
              <div className="bg-white border border-slate-200 rounded-2xl p-4 text-sm">
                <p className="font-bold mb-2">Bhuiyan OCR vs Bank Entry</p>
                <p>Owner: <b>{ocrResult.ocr_extracted.owner}</b> • Area: <b>{ocrResult.ocr_extracted.area_hectares} ha</b> • Bhuiyan: <b>{ocrResult.ocr_extracted.bhuiyan_irrigation}</b> • Bank: <b>{ocrResult.bank_recorded_irrigation}</b></p>
                <p className={`mt-1 font-semibold ${ocrResult.mismatch_detected ? 'text-red-700' : 'text-emerald-700'}`}>{ocrResult.mismatch_detected ? '⚠ Mismatch detected' : '✓ No mismatch'}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card title="Land & Crop">
                <Row k="Khasra" v={record.khasra_no} />
                <Row k="Area" v={`${record.area_hectares} ha`} />
                <Row k="Bhuiyan irrigation" v={record.actual_irrigation} />
                <Row k="Bank irrigation" v={record.bank_recorded_irrigation} warn={record.actual_irrigation !== record.bank_recorded_irrigation} />
                <Row k="Crop" v={record.crop || 'Paddy (Kharif)'} />
              </Card>
              <Card title="MSP & PMFBY">
                <Row k="MSP expected" v={inr(record.expected_msp)} />
                <Row k="MSP received" v={inr(record.actual_msp)} />
                <Row k="MSP gap" v={inr(record.msp_gap)} warn={record.msp_gap > 0} />
                <Row k="PMFBY expected" v={inr(record.expected_pmfby)} />
                <Row k="PMFBY received" v={inr(record.actual_pmfby)} />
                <Row k="PMFBY gap" v={inr(record.pmfby_gap)} warn={record.pmfby_gap > 0} />
              </Card>
              <Card title="KCC & Protections">
                <Row k="Eligible KCC" v={inr(record.eligible_kcc_limit)} />
                <Row k="Collateral-free" v={record.collateral_free_eligible ? 'Yes (≤ ₹2L)' : 'No'} />
                <Row k="Calamity relief" v={record.calamity_restructuring_eligible ? 'Eligible (≥33%)' : 'Not eligible'} />
                <Row k="Interest expected" v={`${record.expected_interest_pct}%`} />
                <Row k="Interest charged" v={`${record.actual_interest_pct}%`} warn={record.actual_interest_pct > record.expected_interest_pct} />
              </Card>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <p className="font-bold">Total Shortfall: <span className="text-red-700">{inr(record.total_shortfall)}</span></p>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${record.flags.length === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{record.audit_status}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {record.flags.length === 0
                  ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-800"><CheckCircle className="w-3 h-3" /> Clean</span>
                  : record.flags.map((f) => <span key={f} className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">{f.replaceAll('_', ' ')}</span>)}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'calculator' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <form onSubmit={handleRunCalculator} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 text-sm">
              <NumField label="Area (Ha)" v={calcInput.area_hectares} on={(v) => setCalcInput({ ...calcInput, area_hectares: v })} />
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-bold text-stone-600">Bhuiyan irrigation
                  <select value={calcInput.actual_irrigation} onChange={(e) => setCalcInput({ ...calcInput, actual_irrigation: e.target.value })} className="w-full px-3 py-2 border rounded-xl mt-1"><option>Irrigated</option><option>Unirrigated</option></select>
                </label>
                <label className="block text-xs font-bold text-stone-600">Bank irrigation
                  <select value={calcInput.bank_recorded_irrigation} onChange={(e) => setCalcInput({ ...calcInput, bank_recorded_irrigation: e.target.value })} className="w-full px-3 py-2 border rounded-xl mt-1"><option>Unirrigated</option><option>Irrigated</option></select>
                </label>
              </div>
              <NumField label="Quintals sold" v={calcInput.quintals_sold} on={(v) => setCalcInput({ ...calcInput, quintals_sold: v })} />
              <NumField label="MSP received (₹)" v={calcInput.msp_received} on={(v) => setCalcInput({ ...calcInput, msp_received: v })} />
              <NumField label="Interest charged (%)" v={calcInput.interest_charged_pct} on={(v) => setCalcInput({ ...calcInput, interest_charged_pct: v })} />
              <NumField label="Crop loss (%)" v={calcInput.crop_loss_pct} on={(v) => setCalcInput({ ...calcInput, crop_loss_pct: v })} />
              <NumField label="PMFBY received (₹)" v={calcInput.pmfby_claim_received} on={(v) => setCalcInput({ ...calcInput, pmfby_claim_received: v })} />
              <label className="flex items-center gap-2 text-xs font-bold text-stone-600"><input type="checkbox" checked={calcInput.repaid_on_time} onChange={(e) => setCalcInput({ ...calcInput, repaid_on_time: e.target.checked })} /> Repaid on time</label>
              <button className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"><Calculator className="w-4 h-4" /> Run Audit</button>
            </form>
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              {calcResult ? (
                <div className="space-y-2 text-sm">
                  <Row k="MSP gap" v={inr(calcResult.msp_gap)} warn={calcResult.msp_gap > 0} />
                  <Row k="PMFBY gap" v={inr(calcResult.pmfby_gap)} warn={calcResult.pmfby_gap > 0} />
                  <Row k="Eligible KCC" v={inr(calcResult.eligible_kcc_limit)} />
                  <Row k="Collateral-free" v={calcResult.collateral_free_eligible ? 'Yes' : 'No'} />
                  <Row k="Calamity relief" v={calcResult.calamity_restructuring_eligible ? 'Eligible' : 'No'} />
                  <Row k="Expected interest" v={`${calcResult.expected_interest_pct}%`} />
                  <Row k="Total shortfall" v={inr(calcResult.total_shortfall)} warn={calcResult.total_shortfall > 0} />
                  <div className="flex flex-wrap gap-1.5 pt-2">{calcResult.flags.map((f) => <span key={f} className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800">{f.replaceAll('_', ' ')}</span>)}</div>
                </div>
              ) : <p className="text-sm text-stone-500">Enter your figures and run the audit to see expected payouts and flags.</p>}
            </div>
          </div>
        )}

        {activeTab === 'grievances' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button onClick={handleFileGrievance} className="bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm"><ShieldCheck className="w-4 h-4" /> File Grievance with DLGRC + 14447</button>
              <button onClick={() => fetchFarmerData(record.khasra_no)} className="bg-white border border-stone-300 hover:bg-stone-50 text-stone-800 font-bold px-4 py-2.5 rounded-xl text-xs">↻ Refresh Live Bank Status</button>
            </div>

            {activeGrievance && (
              <div className="bg-white border border-slate-200 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold">Ticket {activeGrievance.ticket_id} • {activeGrievance.issue_type}</p>
                  <div className="flex gap-2">
                    <button onClick={copyLetter} className="px-3 py-1.5 bg-stone-100 rounded-lg text-xs font-bold flex items-center gap-1">{copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />} Copy</button>
                    <button onClick={printLetter} className="px-3 py-1.5 bg-stone-100 rounded-lg text-xs font-bold flex items-center gap-1"><Printer className="w-4 h-4" /> Print / Save PDF</button>
                  </div>
                </div>
                <pre className="text-xs whitespace-pre-wrap bg-stone-50 border border-stone-200 rounded-xl p-3 font-serif leading-relaxed">{activeGrievance.letter}</pre>
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-bold text-stone-900">Live Grievance Lifecycle (DLGRC &amp; Nodal Bank Sync)</p>
                <span className="text-xs text-stone-500">Updates automatically when Bank Officer verifies Bhuiyan B1</span>
              </div>
              {grievances.length === 0 ? (
                <p className="text-sm text-stone-500">No grievances filed yet. Click the button above to generate an official complaint.</p>
              ) : (
                <div className="space-y-4">
                  {grievances.map((g, i) => {
                    const step = g.step || 1;
                    return (
                      <div key={i} className="p-4 rounded-xl border border-stone-200 bg-stone-50/60 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <span className="font-mono font-bold text-sm text-emerald-900">{g.ticket_id}</span>{' '}
                            <span className="text-sm font-semibold text-stone-800">— {g.issue_type}</span>
                            <p className="text-xs text-stone-500 mt-0.5">Filed: {g.created_at} • Claimed Shortfall: <strong>{inr(g.rupee_gap)}</strong></p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${step === 3 ? 'bg-emerald-100 text-emerald-800' : step === 2 ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>{g.status}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-bold">
                          <div className="p-2.5 rounded-lg bg-emerald-600 text-white text-center">1. Filed &amp; Routed (14447) ✓</div>
                          <div className={`p-2.5 rounded-lg text-center ${step >= 2 ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-500'}`}>2. Bank Officer Audit {step >= 2 ? '✓' : '(Waiting)'}</div>
                          <div className={`p-2.5 rounded-lg text-center ${step === 3 ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-500'}`}>3. Bhuiyan Synced &amp; Paid {step === 3 ? '✓' : '(Pending)'}</div>
                        </div>
                        {step === 3 && (
                          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-center justify-between">
                            <span><strong>✓ Resolution Confirmed:</strong> Bank portal synced with Bhuiyan B1 records. Shortfall of <strong>{inr(g.rupee_gap)}</strong> approved for DBT credit.</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'rules' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-stone-800 flex items-center gap-2"><BookOpen className="w-5 h-5 text-emerald-700" /> Scheme Rules</h3>
              <button onClick={() => speak(RULES.map((r) => `${r.k}: ${r.v}`).join('. '))} className="px-3 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1"><Volume2 className="w-4 h-4" /> Play Audio Guide</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {RULES.map((r) => (
                <div key={r.k} className="bg-white border border-slate-200 rounded-2xl p-4">
                  <p className="text-xs font-bold text-emerald-700">{r.k}</p>
                  <p className="text-sm text-stone-800 mt-1">{r.v}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4">
      <p className="font-bold text-stone-800 mb-2">{title}</p>
      <div className="space-y-1.5 text-sm">{children}</div>
    </div>
  );
}

function Row({ k, v, warn }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-stone-500">{k}</span>
      <span className={`font-semibold ${warn ? 'text-red-700' : 'text-stone-900'}`}>{v}</span>
    </div>
  );
}

function NumField({ label, v, on }) {
  return (
    <label className="block text-xs font-bold text-stone-600">{label}
      <input type="number" step="0.01" value={v} onChange={(e) => on(e.target.value)} className="w-full px-3 py-2 border rounded-xl mt-1" />
    </label>
  );
}
