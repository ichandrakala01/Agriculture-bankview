import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Landmark, Sprout } from 'lucide-react';
import BankDashboard from './components/bank/BankDashboard';
import FarmerDashboard from './components/farmer/FarmerDashboard';

export default function App() {
  const { pathname } = useLocation();
  const isBank = pathname.startsWith('/bank');

  return (
    <div>
      <div className="bg-stone-950 text-white px-4 py-2 text-xs flex items-center justify-between border-b border-stone-800 sticky top-0 z-40">
        <span className="font-bold tracking-wide text-amber-400">
          CG AGRI-TRANSPARENCY &amp; CREDIT PORTAL
        </span>
        <div className="flex items-center gap-2">
          <Link
            to="/farmer"
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-bold transition ${
              !isBank ? 'bg-emerald-600 text-white' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
            }`}
          >
            <Sprout className="w-3.5 h-3.5" /> Farmer View
          </Link>
          <Link
            to="/bank"
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-bold transition ${
              isBank ? 'bg-blue-600 text-white' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
            }`}
          >
            <Landmark className="w-3.5 h-3.5" /> Bank Officer View
          </Link>
        </div>
      </div>

      <Routes>
        <Route path="/" element={<Navigate to="/farmer" replace />} />
        <Route path="/farmer" element={<FarmerDashboard />} />
        <Route path="/bank" element={<BankDashboard />} />
        <Route path="*" element={<Navigate to={isBank ? '/bank' : '/farmer'} replace />} />
      </Routes>
    </div>
  );
}
