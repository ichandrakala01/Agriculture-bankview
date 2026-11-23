import React, { useEffect, useState } from 'react';
import { Search, AlertTriangle, CheckCircle2, FileWarning, IndianRupee, BellRing, MapPin } from 'lucide-react';
import { bankApi } from '../../services/bankApi';
import ComparisonDrawer from './ComparisonDrawer';

const FILTERS = [
  { id: 'ALL', label: 'All Records' },
  { id: 'HAS_GRIEVANCE', label: 'Incoming Grievances' },
  { id: 'DUPLICATE_MORTGAGE_DETECTED', label: 'Duplicate Mortgage Risk' },
  { id: 'IRRIGATION_MISMATCH', label: 'Land/Irrigation Mismatch' },
  { id: 'KCC_SUBVENTION_MISSING', label: 'Missing 3% Subvention' },
  { id: 'CLEAN', label: 'Clean / Verified' },
];

export default function VerificationTab({ selectedDistrict = 'ALL', onDistrictChange }) {
  const [data, setData] = useState({ kpis: {}, records: [] });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [selectedKhasra, setSelectedKhasra] = useState(null);
  const [toast, setToast] = useState('');

  const loadQueue = async () => {
    const res = await bankApi.getQueue();
    setData(res);
  };

  useEffect(() => { loadQueue(); }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 4000); };

  const regionRecords = selectedDistrict === 'ALL'
    ? data.records
    : data.records.filter((r) => r.district.toLowerCase() === selectedDistrict.toLowerCase());

  const filteredRecords = regionRecords.filter((r) => {
    const q = search.toLowerCase();
    const matchesSearch =
      r.khasra_no.toLowerCase().includes(q) ||
      r.village.toLowerCase().includes(q) ||
      r.farmer_name.toLowerCase().includes(q) ||
      (r.grievance?.ticket_id || '').toLowerCase().includes(q);
    if (!matchesSearch) return false;
    if (filter === 'ALL') return true;
    if (filter === 'HAS_GRIEVANCE') return Boolean(r.grievance);
    if (filter === 'CLEAN') return r.flags.length === 0;
    return r.flags.includes(filter);
  });

  const fmt = (num = 0) => `₹${Number(num || 0).toLocaleString('en-IN')}`;
  const regionalFlagged  = regionRecords.filter((r) => r.flags.length > 0).length;
  const regionalDup      = regionRecords.filter((r) => r.flags.includes('DUPLICATE_MORTGAGE_DETECTED')).length;
  const regionalGrv      = regionRecords.filter((r) => r.grievance && r.grievance.step < 3).length;
  const regionalExposure = regionRecords.reduce((acc, r) => acc + (r.requested_amount || 0), 0);

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-900 text-white px-5 py-3.5 rounded-xl shadow-xl text-sm font-medium border border-emerald-600">✓ {toast}</div>
      )}

      {selectedDistrict !== 'ALL' && (
        <div className="bg-emerald-50 border border-emerald-300 px-4 py-3 rounded-xl flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-emerald-950 font-medium">
            <MapPin className="w-4 h-4 text-emerald-700" />
            Showing <strong>{selectedDistrict} District</strong> ({regionRecords.length} farmers)
          </div>
          {onDistrictChange && (
            <button onClick={() => onDistrictChange('ALL')} className="text-xs font-bold text-emerald-800 hover:underline">Reset to All Districts</button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Incoming Farmer Grievances" value={regionalGrv} icon={<BellRing className="w-5 h-5 text-blue-600" />} accent="text-blue-700" />
        <KpiCard title="High-Risk Duplicate Liens" value={regionalDup} icon={<AlertTriangle className="w-5 h-5 text-red-600" />} accent="text-red-600" />
        <KpiCard title="Bhuiyan / Scheme Mismatches" value={regionalFlagged} icon={<FileWarning className="w-5 h-5 text-amber-600" />} accent="text-amber-600" />
        <KpiCard title="Regional Credit Exposure" value={fmt(regionalExposure)} icon={<IndianRupee className="w-5 h-5 text-emerald-600" />} accent="text-emerald-700" />
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search Khasra, Farmer Name, Village, or Ticket (CG-GRV-)..." className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${filter === f.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>{f.label}</button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-xs">
            <tr>
              <th className="px-4 py-3">Khasra & Ticket</th>
              <th className="px-4 py-3">Farmer Profile & Region</th>
              <th className="px-4 py-3">KCC Loan / Shortfall</th>
              <th className="px-4 py-3">Detected Violations</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRecords.map((row) => (
              <tr key={row.khasra_no} onClick={() => setSelectedKhasra(row.khasra_no)} className="hover:bg-slate-50 cursor-pointer transition">
                <td className="px-4 py-3">
                  <div className="font-mono font-bold text-slate-900">{row.khasra_no}</div>
                  {row.grievance && (
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold ${row.grievance.step === 3 ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
                      {row.grievance.ticket_id} (Step {row.grievance.step}/3)
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-900">{row.farmer_name}</div>
                  <div className="text-xs text-slate-500">{row.father_name} • Aadhaar: XXXX-{row.aadhaar_last4}</div>
                  <div className="text-xs text-slate-500">{row.village}, <strong>{row.district}</strong></div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-800">Loan: {fmt(row.requested_amount)}</div>
                  {row.total_shortfall > 0 && <div className="text-xs font-bold text-red-600">Shortfall: {fmt(row.total_shortfall)}</div>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {row.flags.length === 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800"><CheckCircle2 className="w-3 h-3" /> Verified Clean</span>
                    ) : row.flags.map((flag) => (
                      <span key={flag} className={`px-2 py-0.5 rounded-full text-xs font-semibold ${flag === 'DUPLICATE_MORTGAGE_DETECTED' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                        {flag.replaceAll('_', ' ')}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${row.flags.length === 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-700'}`}>{row.status}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button className="text-emerald-700 hover:underline font-semibold text-xs">Inspect 360° →</button>
                </td>
              </tr>
            ))}
            {filteredRecords.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">No farmer records match the selected region or filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedKhasra && (
        <ComparisonDrawer khasraNo={selectedKhasra} onClose={() => setSelectedKhasra(null)} onUpdated={(msg) => { loadQueue(); showToast(msg); }} />
      )}
    </div>
  );
}

function KpiCard({ title, value, icon, accent = 'text-slate-900' }) {
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
      <div>
        <p className="text-xs font-medium text-slate-500">{title}</p>
        <p className={`text-2xl font-bold mt-1 ${accent}`}>{value}</p>
      </div>
      <div className="p-2.5 bg-slate-50 rounded-lg">{icon}</div>
    </div>
  );
}
