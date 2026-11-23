const BASE = '/api/bank';

async function request(path, options) {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { msg = (await res.json()).detail || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  return res.json();
}

export const bankApi = {
  getQueue:          ()           => request('/queue'),
  getGrievances:     ()           => request('/grievances'),
  verifyKhasra:      (khasraNo)   => request(`/verify/${encodeURIComponent(khasraNo)}`),
  syncLandRecord:    (khasraNo)   => request(`/sync-land-record/${encodeURIComponent(khasraNo)}`, { method: 'POST' }),
  submitDecision:    (khasra_no, decision, reason) =>
    request('/decision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ khasra_no, decision, reason }),
    }),
  getPolicyAnalytics: () => request('/policy-analytics'),
};
