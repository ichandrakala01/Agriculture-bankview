import React, { useState } from 'react';
import { Building2, ShieldCheck, LogOut, MapPin, LayoutDashboard, BarChart3, Lock, BellRing } from 'lucide-react';
import VerificationTab from './VerificationTab';
import PolicyAnalyticsTab from './PolicyAnalyticsTab';
import GrievancesInboxTab from './GrievancesInboxTab';

const DISTRICTS = ['ALL', 'Dhamtari', 'Raipur', 'Durg', 'Mahasamund'];

export default function BankDashboard() {
  const [officer, setOfficer] = useState(null);
  const [activeTab, setActiveTab] = useState('queue');
  const [selectedDistrict, setSelectedDistrict] = useState('ALL');
  const [loginForm, setLoginForm] = useState({
    institution: 'Chhattisgarh Rajya Gramin Bank',
    employeeId: 'CRGB-EMP-4092',
    ifsc: 'CRGB0001042',
    assignedDistrict: 'ALL',
    pin: '123456',
  });

  const handleLogin = (e) => {
    e.preventDefault();
    setOfficer(loginForm);
    setSelectedDistrict(loginForm.assignedDistrict);
  };

  const quickDemoLogin = (district, roleLabel, empId) => {
    const profile = { institution: 'Chhattisgarh Rajya Gramin Bank', employeeId: empId, ifsc: 'CRGB0001042', assignedDistrict: district, roleLabel };
    setOfficer(profile);
    setSelectedDistrict(district);
  };

  if (!officer) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="max-w-4xl w-full bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden grid grid-cols-1 md:grid-cols-12">
          <div className="md:col-span-5 bg-slate-900 text-white p-8 flex flex-col justify-between">
            <div>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold px-3 py-1 rounded-full">SLBC CHHATTISGARH • BANK DESK</span>
              <h1 className="text-2xl font-bold mt-4 leading-snug">AgriBank Verification &amp; Policy Console</h1>
              <p className="text-slate-300 text-sm mt-2 leading-relaxed">Authorized institutional portal for real-time Bhuiyan land verification, duplicate KCC lien detection, and farmer grievance resolution.</p>
              <div className="mt-6 space-y-2 text-xs text-slate-300">
                {['CG Bhuiyan B1/P-II Registry: Connected', 'Cross-Bank KCC Lien Check: Active', 'DLGRC Grievance Sync: Live'].map((s) => (
                  <div key={s} className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400" />{s}</div>
                ))}
              </div>
            </div>
            <div className="mt-8 bg-slate-800 p-4 rounded-2xl border border-slate-700 text-xs space-y-2">
              <p className="font-bold text-emerald-400">1-Click Demo Officer Logins:</p>
              <button onClick={() => quickDemoLogin('ALL', 'State Nodal Officer', 'SLBC-NODAL-01')} className="w-full text-left px-3 py-2 rounded-lg bg-slate-700 hover:bg-emerald-700 text-white font-semibold transition">→ Login as State Nodal Admin (All Districts)</button>
              <button onClick={() => quickDemoLogin('Dhamtari', 'Kurud Branch Manager', 'CRGB-DHM-104')} className="w-full text-left px-3 py-2 rounded-lg bg-slate-700 hover:bg-emerald-700 text-white font-semibold transition">→ Login as Kurud Branch Officer (Dhamtari)</button>
            </div>
          </div>

          <form onSubmit={handleLogin} className="md:col-span-7 p-8 space-y-4">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-lg border-b border-slate-100 pb-3">
              <Lock className="w-5 h-5 text-emerald-600" /> Bank Official Authorization
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Institution / Bank Name</label>
              <select value={loginForm.institution} onChange={(e) => setLoginForm({ ...loginForm, institution: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium">
                <option>Chhattisgarh Rajya Gramin Bank</option>
                <option>District Central Cooperative Bank (DCCB)</option>
                <option>State Bank of India (Agri Branch)</option>
                <option>District Collectorate / SLBC Nodal Office</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Official Employee ID</label>
                <input required value={loginForm.employeeId} onChange={(e) => setLoginForm({ ...loginForm, employeeId: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Branch IFSC / PACS Code</label>
                <input required value={loginForm.ifsc} onChange={(e) => setLoginForm({ ...loginForm, ifsc: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Jurisdiction Region</label>
                <select value={loginForm.assignedDistrict} onChange={(e) => setLoginForm({ ...loginForm, assignedDistrict: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm">
                  {DISTRICTS.map((d) => <option key={d} value={d}>{d === 'ALL' ? 'All Chhattisgarh Districts' : `${d} District`}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">2FA Security PIN</label>
                <input required type="password" maxLength={6} value={loginForm.pin} onChange={(e) => setLoginForm({ ...loginForm, pin: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono" />
              </div>
            </div>
            <button type="submit" className="w-full bg-slate-900 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl shadow transition flex items-center justify-center gap-2 mt-2">
              <ShieldCheck className="w-5 h-5" /> Verify Credentials &amp; Open Console →
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-900 text-white px-6 py-4 shadow">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 rounded-xl"><Building2 className="w-6 h-6 text-white" /></div>
            <div>
              <div className="text-xs text-emerald-400 font-semibold">{officer.institution} • IFSC: {officer.ifsc} • ID: {officer.employeeId}</div>
              <h1 className="text-lg font-bold">AgriBank Verification &amp; Grievance Command Center</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-800 px-3 py-2 rounded-xl border border-slate-700">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-slate-300 font-medium">Region:</span>
              <select value={selectedDistrict} onChange={(e) => setSelectedDistrict(e.target.value)} className="bg-slate-900 text-emerald-400 text-xs font-bold px-2.5 py-1 rounded border border-slate-600 focus:outline-none">
                {DISTRICTS.map((d) => <option key={d} value={d}>{d === 'ALL' ? 'All Districts' : `${d}`}</option>)}
              </select>
            </div>
            <button onClick={() => setOfficer(null)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-red-900/60 text-slate-200 border border-slate-700 transition">
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      </header>

      <nav className="max-w-7xl mx-auto px-6 mt-5 flex flex-wrap gap-2">
        <button onClick={() => setActiveTab('queue')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition ${activeTab === 'queue' ? 'bg-slate-900 text-white shadow' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}>
          <LayoutDashboard className="w-4 h-4" /> 1. Branch Queue &amp; Farmer Profiles
        </button>
        <button onClick={() => setActiveTab('grievances')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition ${activeTab === 'grievances' ? 'bg-slate-900 text-white shadow' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}>
          <BellRing className="w-4 h-4" /> 2. Farmer Grievances Inbox
        </button>
        <button onClick={() => setActiveTab('analytics')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition ${activeTab === 'analytics' ? 'bg-slate-900 text-white shadow' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}>
          <BarChart3 className="w-4 h-4" /> 3. District Policy Bottlenecks
        </button>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {activeTab === 'queue' && (
          <VerificationTab selectedDistrict={selectedDistrict} onDistrictChange={setSelectedDistrict} />
        )}
        {activeTab === 'grievances' && (
          <GrievancesInboxTab selectedDistrict={selectedDistrict} />
        )}
        {activeTab === 'analytics' && (
          <PolicyAnalyticsTab onSelectDistrict={(district) => { setSelectedDistrict(district); setActiveTab('queue'); }} />
        )}
      </main>
    </div>
  );
}
