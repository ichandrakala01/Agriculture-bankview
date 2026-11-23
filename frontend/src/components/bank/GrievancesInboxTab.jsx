import React, { useEffect, useState } from 'react';
import { BellRing, FileText, ExternalLink, CheckCircle2, Clock } from 'lucide-react';
import ComparisonDrawer from './ComparisonDrawer';

export default function GrievancesInboxTab({ selectedDistrict = 'ALL' }) {
  const [grievances, setGrievances] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [inspectKhasra, setInspectKhasra] = useState(null);

  const loadGrievances = async () => {
    try {
      const res = await fetch('/api/bank/grievances');
      const data = await res.json();
      const reversed = [...data].reverse();
      setGrievances(reversed);
      if (reversed.length > 0) {
        setSelectedTicket((prev) =>
          prev
            ? reversed.find((item) => item.ticket_id === prev.ticket_id) || reversed[0]
            : reversed[0]
        );
      }
    } catch (err) {
      console.error('Failed to load grievances:', err);
    }
  };

  useEffect(() => { loadGrievances(); }, []);

  const filtered =
    selectedDistrict === 'ALL'
      ? grievances
      : grievances.filter(
          (g) => (g.district || '').toLowerCase() === selectedDistrict.toLowerCase()
        );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <BellRing className="w-5 h-5 text-blue-600" />
            Farmer Grievances Inbox (DLGRC &amp; 14447 Sync)
          </h2>
          <p className="text-xs text-slate-500">
            Click any ticket on the left to view the official complaint letter and sync Bhuiyan records.
          </p>
        </div>
        <button
          onClick={loadGrievances}
          className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700"
        >
          ↻ Refresh Inbox ({filtered.length})
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Ticket List */}
        <div className="lg:col-span-6 space-y-3">
          {filtered.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-sm text-slate-500">
              No grievances found for {selectedDistrict === 'ALL' ? 'any district' : selectedDistrict}.
            </div>
          ) : (
            filtered.map((g) => {
              const step = g.step || 1;
              const isSelected = selectedTicket?.ticket_id === g.ticket_id;
              return (
                <div
                  key={g.ticket_id}
                  onClick={() => setSelectedTicket(g)}
                  className={`p-4 rounded-xl border cursor-pointer transition bg-white ${
                    isSelected
                      ? 'border-blue-600 ring-2 ring-blue-100'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-sm text-blue-700">{g.ticket_id}</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 ${
                        step === 3
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {step === 3 ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      Step {step}/3: {g.status}
                    </span>
                  </div>
                  <p className="font-semibold text-slate-900 mt-1">
                    {g.owner_name} — Khasra {g.khasra_no} ({g.village}, {g.district})
                  </p>
                  <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                    <span>{g.issue_type}</span>
                    <span className="font-bold text-red-600">
                      Gap: ₹{Number(g.rupee_gap || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Complaint Letter Preview */}
        <div className="lg:col-span-6">
          {selectedTicket ? (
            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 sticky top-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  Complaint Letter ({selectedTicket.ticket_id})
                </div>
                <button
                  onClick={() => setInspectKhasra(selectedTicket.khasra_no)}
                  className="bg-slate-900 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                >
                  Open Farmer 360° &amp; Resolve <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
              <pre className="text-xs whitespace-pre-wrap bg-slate-50 border border-slate-200 rounded-xl p-4 font-serif leading-relaxed max-h-96 overflow-y-auto">
                {selectedTicket.letter}
              </pre>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-sm text-slate-500">
              Click any grievance ticket on the left to read the complaint letter.
            </div>
          )}
        </div>
      </div>

      {inspectKhasra && (
        <ComparisonDrawer
          khasraNo={inspectKhasra}
          onClose={() => setInspectKhasra(null)}
          onUpdated={() => { loadGrievances(); }}
        />
      )}
    </div>
  );
}
