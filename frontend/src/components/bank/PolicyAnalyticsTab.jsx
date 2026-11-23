import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { AlertCircle, MousePointerClick } from 'lucide-react';
import { bankApi } from '../../services/bankApi';

const PIE_COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981'];

export default function PolicyAnalyticsTab({ onSelectDistrict }) {
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => { bankApi.getPolicyAnalytics().then(setAnalytics); }, []);

  if (!analytics) return <p className="text-sm text-slate-500">Loading policy bottleneck analytics...</p>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800">District Bottleneck Severity (Anonymised)</h3>
            <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1"><MousePointerClick className="w-3.5 h-3.5" /> Click a bar to filter queue</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.districts}>
                <XAxis dataKey="district" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(value, name) => [name === 'blocked_rupees' ? `₹${value.toLocaleString('en-IN')}` : value, name === 'blocked_rupees' ? 'Blocked Payouts' : 'Active Flags']} />
                <Bar dataKey="discrepancies" fill="#0f172a" radius={[6, 6, 0, 0]} cursor="pointer" onClick={(entry) => { if (entry?.district && onSelectDistrict) onSelectDistrict(entry.district); }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4">Failure Breakdown by Root Cause</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={analytics.root_causes} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={4}>
                  {analytics.root_causes.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {analytics.districts.map((d) => (
          <button key={d.district} onClick={() => onSelectDistrict && onSelectDistrict(d.district)} className="text-left bg-white p-4 rounded-xl border border-slate-200 hover:border-emerald-500 transition shadow-sm">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-900">{d.district}</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">{d.discrepancies} Flags</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Blocked: <strong className="text-slate-800">₹{(d.blocked_rupees || 0).toLocaleString('en-IN')}</strong></p>
            <p className="text-xs font-semibold text-emerald-700 mt-2">Filter Queue →</p>
          </button>
        ))}
      </div>

      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><AlertCircle className="w-5 h-5 text-amber-600" /> Actionable Policy Alerts for District Collector / SLBC</h3>
        <ul className="space-y-2.5">
          {analytics.alerts.map((alert, idx) => (
            <li key={idx} className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-950 font-medium">{alert}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
