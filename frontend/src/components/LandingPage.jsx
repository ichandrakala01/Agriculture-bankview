import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sprout, PhoneCall, ArrowRight, ShieldCheck, Mic, BarChart3 } from 'lucide-react';

// ── Minimal inline keyframes (no extra CSS file needed) ───────────────────────
const STYLES = `
  @keyframes fadeUp   { from { opacity:0; transform:translateY(28px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn   { from { opacity:0; } to { opacity:1; } }
  @keyframes shimmer  { 0%,100% { opacity:.6; } 50% { opacity:1; } }
  @keyframes ticker   { 0% { transform:translateX(0); } 100% { transform:translateX(-50%); } }
  .fade-up   { animation: fadeUp  .7s cubic-bezier(.22,1,.36,1) both; }
  .fade-in   { animation: fadeIn  .6s ease both; }
  .delay-1   { animation-delay:.12s; }
  .delay-2   { animation-delay:.26s; }
  .delay-3   { animation-delay:.42s; }
  .delay-4   { animation-delay:.58s; }
  .shimmer   { animation: shimmer 2.4s ease-in-out infinite; }
  .ticker    { animation: ticker 28s linear infinite; }
`;

// ── Scroll-reveal hook ────────────────────────────────────────────────────────
function useReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

// ── Stat counter ──────────────────────────────────────────────────────────────
function Counter({ target, suffix = '' }) {
  const [count, setCount] = useState(0);
  const [ref, visible] = useReveal();
  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const step = Math.ceil(target / 60);
    const id = setInterval(() => {
      start = Math.min(start + step, target);
      setCount(start);
      if (start >= target) clearInterval(id);
    }, 22);
    return () => clearInterval(id);
  }, [visible, target]);
  return <span ref={ref}>{count.toLocaleString('en-IN')}{suffix}</span>;
}

// ── Scroll-reveal card wrapper ────────────────────────────────────────────────
function Reveal({ children, delay = 0, className = '' }) {
  const [ref, visible] = useReveal();
  return (
    <div
      ref={ref}
      style={{ animationDelay: `${delay}s`, animationFillMode: 'both' }}
      className={`${visible ? 'fade-up' : 'opacity-0'} ${className}`}
    >
      {children}
    </div>
  );
}

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <style>{STYLES}</style>
      <div className="min-h-screen bg-white text-stone-900 font-sans overflow-x-hidden">

        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <section className="relative min-h-[620px] flex flex-col justify-between text-white overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1600&q=80"
            alt="Golden paddy fields"
            className="absolute inset-0 w-full h-full object-cover object-center scale-105 transition-transform duration-[8000ms]"
            style={{ transform: 'scale(1.04)' }}
          />
          {/* layered gradients for depth */}
          <div className="absolute inset-0 bg-gradient-to-b from-stone-950/80 via-stone-900/60 to-stone-950/90" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_60%_30%,rgba(132,204,22,.08),transparent_70%)]" />

          {/* NAV */}
          <header className={`relative z-10 max-w-7xl w-full mx-auto px-6 py-5 flex items-center justify-between gap-4 transition-all duration-300 ${scrolled ? 'backdrop-blur-md' : ''}`}>
            <div className="flex items-center gap-2.5 fade-in">
              <div className="w-9 h-9 rounded-xl bg-lime-400/20 border border-lime-400/40 flex items-center justify-center shimmer">
                <Sprout className="w-5 h-5 text-lime-400" />
              </div>
              <span className="font-bold text-lg tracking-tight">NITIKISAN</span>
            </div>

            <nav className="hidden md:flex items-center gap-6 bg-white/10 backdrop-blur-md border border-white/15 px-6 py-2 rounded-full text-xs font-medium text-stone-200 fade-in delay-1">
              <a href="#solutions" className="hover:text-lime-300 transition-colors duration-200">Schemes</a>
              <Link to="/farmer" className="hover:text-lime-300 transition-colors duration-200">Bhuiyan Sync</Link>
              <span className="flex items-center gap-1 text-lime-300 font-semibold">
                <PhoneCall className="w-3 h-3" /> 14447
              </span>
            </nav>

            <Link
              to="/bank"
              className="fade-in delay-2 px-5 py-2 rounded-full border border-white/35 hover:border-lime-400 hover:text-lime-300 text-xs font-semibold transition-all duration-200 backdrop-blur-sm hover:scale-105"
            >
              Bank Portal
            </Link>
          </header>

          {/* HEADLINE */}
          <div className="relative z-10 max-w-4xl mx-auto px-6 py-20 text-center space-y-6">
            {/* pill badge */}
            <div className="fade-up inline-flex items-center gap-2 bg-lime-400/15 border border-lime-400/30 text-lime-300 text-[11px] font-semibold px-4 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-lime-400 shimmer" />
              Chhattisgarh Gov-Tech Portal — Live on MongoDB Atlas
            </div>

            <h1 className="fade-up delay-1 text-4xl sm:text-5xl md:text-[3.5rem] font-bold tracking-tight leading-tight">
              Empowering Farmers with<br />
              <span className="text-lime-400">Transparent Credit</span>
            </h1>

            <p className="fade-up delay-2 text-stone-300 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
              Real-time audit of MSP payouts, KCC loan eligibility, and PMFBY crop insurance — straight from Bhuiyan land records to your mobile, in your language.
            </p>

            <div className="fade-up delay-3 pt-2 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/farmer?auth=register"
                className="group bg-lime-500 hover:bg-lime-400 text-stone-950 font-bold px-7 py-3.5 rounded-full text-sm shadow-lg shadow-lime-900/30 transition-all duration-200 inline-flex items-center gap-2 hover:scale-[1.03]"
              >
                Register / Check Status
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
              <Link
                to="/farmer?auth=login"
                className="bg-white/12 hover:bg-white/22 backdrop-blur-md border border-white/25 hover:border-white/50 text-white font-semibold px-6 py-3.5 rounded-full text-sm transition-all duration-200 hover:scale-[1.03]"
              >
                Existing Farmer Login
              </Link>
            </div>
          </div>

          {/* bottom fade */}
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent pointer-events-none" />
          <div className="h-2" />
        </section>

        {/* ── TICKER ───────────────────────────────────────────────────────── */}
        <div className="bg-lime-50 border-y border-lime-100 py-3 overflow-hidden">
          <div className="ticker whitespace-nowrap text-xs font-medium text-stone-500 flex gap-0">
            {[...Array(2)].map((_, i) => (
              <span key={i} className="inline-flex gap-10 pr-10">
                <span>Krishak Unnati Yojana</span>
                <span>Pradhan Mantri Fasal Bima Yojana (PMFBY)</span>
                <span>Kisan Credit Card (KCC)</span>
                <span>PM-KISAN Samman Nidhi</span>
                <span>Rashtriya Krishi Vikas Yojana (RKVY)</span>
                <span>Pradhan Mantri Krishi Sinchai Yojana</span>
                <span>Soil Health Card Scheme</span>
                <span>e-NAM — National Agriculture Market</span>
              </span>
            ))}
          </div>
        </div>

        {/* ── STATS ────────────────────────────────────────────────────────── */}
        <section className="max-w-5xl mx-auto px-6 py-14 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { label: 'Farmers Covered', target: 12400, suffix: '+' },
            { label: 'MSP Gap Detected (₹)', target: 24, suffix: 'L+' },
            { label: 'Grievances Resolved', target: 1870, suffix: '+' },
            { label: 'Districts Active', target: 4, suffix: '' },
          ].map((s, i) => (
            <Reveal key={s.label} delay={i * 0.1}>
              <div className="p-6 rounded-2xl bg-stone-50 border border-stone-100 hover:border-lime-200 hover:shadow-md transition-all duration-300 cursor-default">
                <p className="text-3xl font-extrabold text-stone-900">
                  <Counter target={s.target} suffix={s.suffix} />
                </p>
                <p className="text-xs text-stone-500 mt-1 font-medium">{s.label}</p>
              </div>
            </Reveal>
          ))}
        </section>

        {/* ── CARDS ────────────────────────────────────────────────────────── */}
        <section id="solutions" className="max-w-7xl mx-auto px-6 pb-20">
          <Reveal className="text-center max-w-2xl mx-auto mb-12 space-y-3">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight">
              Transparent Farm Solutions
            </h2>
            <p className="text-stone-500 text-sm leading-relaxed">
              Bhuiyan B1 land sync, PMFBY audits, 4% KCC subvention checks, and
              voice-driven grievances — built for CG farmers and cooperative banks.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Photo 1 */}
            <Reveal delay={0}>
              <div className="rounded-3xl overflow-hidden h-[380px] shadow-sm border border-stone-100 relative group cursor-pointer">
                <img
                  src="https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=600&q=80"
                  alt="Irrigated paddy"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-108"
                  style={{ transition: 'transform .7s cubic-bezier(.22,1,.36,1)' }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <div className="absolute inset-0 bg-lime-400/0 group-hover:bg-lime-400/5 transition-colors duration-500" />
                <span className="absolute bottom-5 left-5 text-white text-xs font-semibold bg-black/45 backdrop-blur-sm px-3 py-1.5 rounded-full">
                  CG Bhuiyan B1 Sync
                </span>
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <ShieldCheck className="w-5 h-5 text-lime-400" />
                </div>
              </div>
            </Reveal>

            {/* White card */}
            <Reveal delay={0.1}>
              <Link to="/farmer?auth=login" className="block rounded-3xl h-[380px] p-7 bg-white border border-stone-200 shadow-sm flex flex-col justify-between group hover:border-lime-300 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-lime-50 border border-lime-100 flex items-center justify-center mb-4 group-hover:bg-lime-100 transition-colors duration-300">
                    <ShieldCheck className="w-5 h-5 text-lime-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-stone-900 leading-snug">
                    Bhuiyan &amp; MSP Audit
                  </h3>
                </div>
                <div className="space-y-3">
                  <p className="text-xs text-stone-500 leading-relaxed">
                    Cross-check irrigated land records, ₹3,100/qtl Krishak Unnati paddy payouts,
                    and ₹66,000/ha PMFBY insurance entitlements automatically.
                  </p>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-stone-900 group-hover:text-lime-700 transition-colors duration-200">
                    Check Entitlements <ArrowRight className="w-3 h-3 transition-transform duration-200 group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            </Reveal>

            {/* Photo 2 */}
            <Reveal delay={0.2}>
              <div className="rounded-3xl overflow-hidden h-[380px] shadow-sm border border-stone-100 relative group cursor-pointer">
                <img
                  src="https://images.unsplash.com/photo-1521791136064-7986c2920216?w=600&q=80"
                  alt="Bank verification desk"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-108"
                  style={{ transition: 'transform .7s cubic-bezier(.22,1,.36,1)' }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <div className="absolute inset-0 bg-lime-400/0 group-hover:bg-lime-400/5 transition-colors duration-500" />
                <span className="absolute bottom-5 left-5 text-white text-xs font-semibold bg-black/45 backdrop-blur-sm px-3 py-1.5 rounded-full">
                  4% KCC Subvention &amp; Liens
                </span>
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <BarChart3 className="w-5 h-5 text-lime-400" />
                </div>
              </div>
            </Reveal>

            {/* Lime card */}
            <Reveal delay={0.3}>
              <Link to="/farmer?auth=register" className="block rounded-3xl h-[380px] p-7 bg-[#e9f8d8] border border-lime-200 shadow-sm flex flex-col justify-between group hover:border-lime-400 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-lime-200/60 border border-lime-300/50 flex items-center justify-center mb-4 group-hover:bg-lime-200 transition-colors duration-300">
                    <Mic className="w-5 h-5 text-lime-700" />
                  </div>
                  <h3 className="text-xl font-semibold text-stone-900 leading-snug">
                    Voice &amp; Grievance Sync
                  </h3>
                </div>
                <div className="space-y-3">
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Register hands-free in Chhattisgarhi &amp; Hindi, generate DLGRC complaint
                    letters, and track live bank resolution in 3 simple steps.
                  </p>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-stone-900 group-hover:text-emerald-800 transition-colors duration-200">
                    Start with Voice <ArrowRight className="w-3 h-3 transition-transform duration-200 group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            </Reveal>
          </div>
        </section>

        {/* ── FOOTER ───────────────────────────────────────────────────────── */}
        <footer className="border-t border-stone-100 bg-stone-50 px-6 py-8">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-stone-400">
            <div className="flex items-center gap-2">
              <Sprout className="w-4 h-4 text-lime-500" />
              <span className="font-semibold text-stone-600">NITIKISAN</span>
              <span>· Chhattisgarh Agri-Transparency Portal</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1"><PhoneCall className="w-3 h-3" /> 14447 / 1800-180-1551</span>
              <Link to="/farmer" className="hover:text-lime-600 transition-colors">Farmer Portal</Link>
              <Link to="/bank" className="hover:text-lime-600 transition-colors">Bank Portal</Link>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}
