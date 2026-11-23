import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Volume2, Sparkles } from 'lucide-react';

// ── DYNAMIC NUMBER PARSER ────────────────────────────────────────────────────
const BASE_HINDI_NUMS = {
  'शून्य': 0, 'जीरो': 0, 'नहीं': 0, 'नइ': 0, 'कोई नहीं': 0,
  'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5, 'पाँच': 5,
  'छह': 6, 'छः': 6, 'सात': 7, 'आठ': 8, 'नौ': 9, 'दस': 10, 'ग्यारह': 11, 'बारह': 12,
  'तेरह': 13, 'चौदह': 14, 'पंद्रह': 15, 'सोलह': 16, 'सत्रह': 17, 'अठारह': 18, 'उन्नीस': 19,
  'बीस': 20, 'पच्चीस': 25, 'तीस': 30, 'पैंतीस': 35, 'चालीस': 40, 'पैंतालीस': 45,
  'पचास': 50, 'पचपन': 55, 'साठ': 60, 'पैंसठ': 65, 'सत्तर': 70, 'पचहत्तर': 75,
  'अस्सी': 80, 'पचासी': 85, 'नब्बे': 90, 'सौ': 100, 'डेढ़': 1.5, 'ढाई': 2.5,
};
const MULTIPLIERS = { 'सौ': 100, 'हजार': 1000, 'हज़ार': 1000, 'लाख': 100000 };

function parseSpokenNumber(raw) {
  // Strip %, ₹, commas, and Hindi punctuation so "45%" → "45"
  const txt = raw.toLowerCase().replace(/[%₹,।?!]/g, ' ').trim();
  if (txt.includes('डेढ़')) return 1.5;
  if (txt.includes('ढाई')) return 2.5;
  if (txt === 'नहीं' || txt === 'नइ' || txt.includes('कोई नुकसान नहीं') || txt.includes('zero')) return 0;

  // Direct digit fallback — catches "45", "2.5", "100000" anywhere in phrase
  const directDigit = txt.match(/(\d+(\.\d+)?)/);
  if (directDigit && !txt.includes('हजार') && !txt.includes('लाख') && !txt.includes('सौ')) {
    return parseFloat(directDigit[1]);
  }

  const tokens = txt.split(/\s+/);
  let total = 0;
  let current = 0;
  let foundAny = false;

  for (const token of tokens) {
    if (/^\d+(\.\d+)?$/.test(token)) {
      current += parseFloat(token);
      foundAny = true;
    } else if (BASE_HINDI_NUMS[token] !== undefined) {
      current += BASE_HINDI_NUMS[token];
      foundAny = true;
    } else if (MULTIPLIERS[token] !== undefined) {
      const mult = MULTIPLIERS[token];
      current = (current === 0 ? 1 : current) * mult;
      if (mult >= 1000) { total += current; current = 0; }
      foundAny = true;
    }
  }
  return foundAny ? total + current : null;
}

function parseKhasra(raw) {
  const parts = raw.toLowerCase().split(/बटा|बट्टा|slash|by|\//);
  if (parts.length > 1) {
    const parsed = parts.map((p) => {
      const n = parseSpokenNumber(p);
      return n !== null ? String(Math.round(n)) : p.replace(/[^0-9]/g, '');
    }).filter(Boolean);
    if (parsed.length >= 2) return parsed.join('/');
  }
  const single = parseSpokenNumber(raw);
  return single !== null ? String(Math.round(single)) : raw.replace(/[^0-9/]/g, '') || raw.trim();
}

function parseDistrict(raw) {
  const t = raw.toLowerCase();
  if (t.includes('धमतरी') || t.includes('dhamtari')) return 'Dhamtari';
  if (t.includes('रायपुर') || t.includes('raipur')) return 'Raipur';
  if (t.includes('दुर्ग') || t.includes('durg')) return 'Durg';
  if (t.includes('महासमुंद') || t.includes('mahasamund')) return 'Mahasamund';
  return 'Dhamtari';
}

// ── REGISTRATION QUESTIONS ────────────────────────────────────────────────────
const REGISTRATION_QUESTIONS = [
  {
    field: 'owner_name',
    ask: 'राम-राम भैया! चलव मिलके तुंहर पंजीयन करथन। सबसे पहिली बतावव — आप के नाम का हे?',
    confirm: (v) => `बहुत बढ़िया ${v} जी! नाम लिख लेंव।`,
    parse: (txt) => txt.replace(/मेरा नाम|मोर नाम|है|हे|हवे/g, '').trim() || null,
  },
  {
    field: 'father_name',
    ask: 'अब आप के पिता जी के नाम बतावव?',
    confirm: (v) => `ठीक हे, ${v} जी दर्ज कर लेंव।`,
    parse: (txt) => txt.replace(/पिता जी का नाम|नाम|है|हे/g, '').trim() || null,
  },
  {
    field: 'khasra_no',
    ask: 'तुंहर खेत के खसरा नंबर का हे? जइसे कि 205 बटा 1।',
    confirm: (v) => `खसरा नंबर ${v} लिख लेंव।`,
    parse: (txt) => { const r = parseKhasra(txt); return r && r.includes('/') ? r : null; },
  },
  {
    field: 'mobile',
    ask: 'आप के मोबाइल नंबर बतावव?',
    confirm: (v) => `मोबाइल नंबर ${v} दर्ज होगे।`,
    parse: (txt) => { const d = txt.replace(/\D/g, ''); return d.length >= 6 ? d.slice(0, 10) : null; },
  },
  {
    field: 'district',
    ask: 'आप कौन से जिला ले हव — धमतरी, रायपुर, दुर्ग, या महासमुंद?',
    confirm: (v) => `ठीक हे, ${v} जिला चुन लेंव।`,
    parse: (txt) => parseDistrict(txt),
  },
  {
    field: 'village',
    ask: 'आप के गांव के नाम का हे?',
    confirm: (v) => `गांव ${v} लिख लेंव।`,
    parse: (txt) => txt.replace(/गांव|ग्राम|है|हे/g, '').trim() || null,
  },
  {
    field: 'area_hectares',
    ask: 'कतना जमीन हे आप के पास? हेक्टेयर म बतावव, जइसे कि 2 हेक्टेयर।',
    confirm: (v) => `${v} हेक्टेयर जमीन लिख लेंव।`,
    parse: (txt) => parseSpokenNumber(txt),
  },
  {
    field: 'actual_irrigation',
    ask: 'तुंहर जमीन सिंचित हे या असिंचित हे?',
    confirm: (v) => v === 'Irrigated' ? 'सिंचित जमीन दर्ज कर लेंव।' : 'असिंचित जमीन दर्ज कर लेंव।',
    parse: (txt) => {
      if (txt.includes('असिंचित') || txt.includes('सूखा') || txt.includes('unirrigated')) return 'Unirrigated';
      if (txt.includes('सिंचित') || txt.includes('पानी') || txt.includes('irrigated')) return 'Irrigated';
      return null;
    },
  },
  {
    field: 'crop_loss_pct',
    ask: 'आखिरी सवाल — फसल म कतना प्रतिशत नुकसान होइस? जइसे 45 प्रतिशत, या नुकसान नइ होइस त शून्य बोलव।',
    confirm: (v) => `${v} प्रतिशत नुकसान लिख लेंव। अब तुंहर खाता बनाके योजना के जांच करत हंव!`,
    // 0 is valid — do not reject it
    parse: (txt) => {
      const n = parseSpokenNumber(txt);
      return (n !== null && n >= 0 && n <= 100) ? n : null;
    },
  },
];

// ── COMPONENT ─────────────────────────────────────────────────────────────────
export default function KisanVoiceSaathi({
  mode = 'register',   // 'register' | 'scheme_guide'
  lang = 'cg',
  setRegForm,
  onSubmitRegistration,
  record = null,
  onFileGrievance,
}) {
  const [active, setActive]           = useState(false);
  const [status, setStatus]           = useState('idle');
  const [stepIndex, setStepIndex]     = useState(0);
  const [liveCaption, setLiveCaption] = useState('');
  const [assistantText, setAssistantText] = useState('');

  const activeRef      = useRef(false);
  const recognitionRef = useRef(null);

  const getHumanVoice = () => {
    const voices = window.speechSynthesis.getVoices();
    return (
      voices.find((v) => v.name.includes('Swara') && v.lang.includes('hi')) ||
      voices.find((v) => v.name.includes('Google हिन्दी')) ||
      voices.find((v) => v.lang === 'hi-IN') ||
      voices.find((v) => v.lang === 'en-IN') ||
      voices[0] ||
      null
    );
  };

  useEffect(() => {
    window.speechSynthesis.getVoices();
    return () => stopVoice();
  }, []);

  const stopVoice = () => {
    activeRef.current = false;
    setActive(false);
    setStatus('idle');
    window.speechSynthesis.cancel();
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
  };

  const speakNaturally = (text, onFinished) => {
    if (!activeRef.current) return;
    window.speechSynthesis.cancel();
    setStatus('speaking');
    setAssistantText(text);
    const u = new SpeechSynthesisUtterance(text);
    const voice = getHumanVoice();
    if (voice) u.voice = voice;
    u.lang = lang === 'en' ? 'en-IN' : 'hi-IN';
    u.rate = 0.94; u.pitch = 1.03;
    u.onend   = () => { if (activeRef.current && onFinished) onFinished(); };
    u.onerror = () => { if (activeRef.current && onFinished) onFinished(); };
    window.speechSynthesis.speak(u);
  };

  // ── STAGE 1: REGISTRATION ────────────────────────────────────────────────
  const listenRegistrationStep = (idx) => {
    if (!activeRef.current) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('कृपया Chrome या Edge म खोलव।'); stopVoice(); return; }

    const rec = new SR();
    recognitionRef.current = rec;
    rec.lang = 'hi-IN';
    rec.interimResults = true;
    setStatus('listening');
    setLiveCaption('');
    let finalSpoken = '';

    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;      // ← fixed [0]
        if (e.results[i].isFinal) finalSpoken += t + ' ';
        else interim += t;
      }
      setLiveCaption((finalSpoken + interim).trim());
    };

    rec.onend = () => {
      if (!activeRef.current) return;
      const clean = finalSpoken.trim();
      const q = REGISTRATION_QUESTIONS[idx];
      const parsed = clean ? q.parse(clean) : null;
      // parsed === 0 is valid (no crop loss), so check !== null && !== undefined
      if (parsed !== null && parsed !== undefined && parsed !== '') {
        setRegForm((prev) => ({
          ...prev,
          [q.field]: parsed,
          ...(q.field === 'village' ? { block: parsed } : {}),
        }));
        const next = idx + 1;
        speakNaturally(q.confirm(parsed), () => {
          if (next < REGISTRATION_QUESTIONS.length) {
            setStepIndex(next);
            askRegistrationStep(next);
          } else {
            stopVoice();
            if (onSubmitRegistration) onSubmitRegistration();
          }
        });
      } else {
        speakNaturally('माफ करहू भैया, ठीक ले सुनाइस नइ। फेर से बतावव — ' + q.ask, () => {
          listenRegistrationStep(idx);
        });
      }
    };

    rec.onerror = () => {
      if (activeRef.current)
        speakNaturally('आवाज नइ आइस भैया, फेर से बोलव।', () => listenRegistrationStep(idx));
    };

    rec.start();
  };

  const askRegistrationStep = (idx) => {
    if (!activeRef.current) return;
    speakNaturally(REGISTRATION_QUESTIONS[idx].ask, () => listenRegistrationStep(idx));
  };

  const startVoiceRegistration = () => {
    activeRef.current = true;
    setActive(true);
    setStepIndex(0);
    askRegistrationStep(0);
  };

  // ── STAGE 2: SCHEME EXPLAINER ────────────────────────────────────────────
  const startSchemeExplainer = () => {
    if (!record) return;
    activeRef.current = true;
    setActive(true);

    const kcc = Number(record.eligible_kcc_limit || 0).toLocaleString('en-IN');
    const gap = Number(record.total_shortfall || 0).toLocaleString('en-IN');

    const speech = lang === 'en'
      ? `Hello ${record.owner_name}. Your ${record.area_hectares} ha ${record.actual_irrigation} plot qualifies for ₹${kcc} KCC credit, collateral-free up to ₹2 lakh, at 4% interest. Paddy MSP is ₹3,100 per quintal. PMFBY insures irrigated land at ₹66,000 per hectare. ${record.total_shortfall > 0 ? `You have a shortfall of ₹${gap}. Say "file complaint" to lodge your grievance.` : 'All payouts verified.'}`
      : `राम-राम ${record.owner_name} जी! तुंहर ${record.area_hectares} हेक्टेयर ${record.actual_irrigation === 'Irrigated' ? 'सिंचित' : 'असिंचित'} जमीन म मिलने वाला सरकारी सुविधा: `
        + `पहिली — धान MSP ₹3,100 प्रति क्विंटल। `
        + `दुसर — आप ₹${kcc} KCC ऋण के पात्र हव, ₹2 लाख तक बिना गारंटी, 4% ब्याज। `
        + `तिसर — PMFBY म सिंचित जमीन बर ₹66,000 प्रति हेक्टेयर बीमा, 33% ले ज्यादा नुकसान म ऋण पुनर्गठन। `
        + (record.total_shortfall > 0
          ? `तुंहर खाता म ₹${gap} के कमी हे। शिकायत दर्ज करना हे त बोलव।`
          : 'तुंहर सबो हिसाब सही हे भैया।');

    speakNaturally(speech, () => {
      if (record.total_shortfall > 0) listenForGrievanceConfirm();
      else stopVoice();
    });
  };

  const listenForGrievanceConfirm = () => {
    if (!activeRef.current) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { stopVoice(); return; }

    const rec = new SR();
    recognitionRef.current = rec;
    rec.lang = lang === 'en' ? 'en-IN' : 'hi-IN';
    rec.interimResults = true;
    setStatus('listening');
    setLiveCaption('');
    let spoken = '';

    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;      // ← fixed [0]
        if (e.results[i].isFinal) spoken += t + ' ';
        else interim += t;
      }
      setLiveCaption((spoken + interim).trim());
    };

    rec.onend = () => {
      if (!activeRef.current) return;
      const t = spoken.toLowerCase();
      if (t.includes('शिकायत') || t.includes('दर्ज') || t.includes('हाँ') || t.includes('हा') || t.includes('complaint') || t.includes('yes')) {
        speakNaturally(
          lang === 'en'
            ? 'Filing your official complaint now.'
            : 'ठीक हे भैया, तुंहर शिकायत पत्र अभी दर्ज करत हंव।',
          () => { stopVoice(); if (onFileGrievance) onFileGrievance(); }
        );
      } else {
        stopVoice();
      }
    };

    rec.onerror = () => stopVoice();
    rec.start();
  };

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="bg-emerald-900/10 border border-emerald-300 rounded-2xl p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-emerald-900 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            {lang === 'en' ? 'Kisan Saathi — Voice Guide' : 'किसान संगवारी — बोल के सबो काम करव'}
          </p>
          <p className="text-xs text-emerald-700 mt-0.5">
            {mode === 'register'
              ? 'एक बार दबाके अपन नाम, गांव अऊ जमीन बतावव — फॉर्म अपने-आप भरा जही'
              : lang === 'en'
                ? 'Listen to all schemes, loan limits, and file complaints hands-free'
                : 'अपन योजना, KCC छूट अऊ बीमा के नियम सुनव अऊ शिकायत दर्ज करव'}
          </p>
        </div>

        {!active ? (
          <button
            type="button"
            onClick={mode === 'register' ? startVoiceRegistration : startSchemeExplainer}
            className="bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow transition"
          >
            <Mic className="w-4 h-4" />
            {mode === 'register'
              ? 'Register with Voice'
              : lang === 'en' ? 'Explain My Schemes' : 'मोर योजना सुनव'}
          </button>
        ) : (
          <button
            type="button"
            onClick={stopVoice}
            className="bg-red-500 hover:bg-red-600 text-white font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition animate-pulse"
          >
            <Square className="w-4 h-4" />
            {mode === 'register' ? `Stop (${stepIndex + 1}/${REGISTRATION_QUESTIONS.length})` : 'Stop'}
          </button>
        )}
      </div>

      {active && (
        <div className="bg-white border border-emerald-200 rounded-xl p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold">
            {status === 'speaking'
              ? <><Volume2 className="w-4 h-4 text-emerald-600 animate-pulse" /><span className="text-emerald-700">Speaking:</span></>
              : <><Mic className="w-4 h-4 text-amber-500 animate-pulse" /><span className="text-amber-700">Listening:</span></>}
          </div>
          {assistantText && <p className="text-sm text-slate-800 leading-relaxed">{assistantText}</p>}
          {liveCaption && <p className="text-xs text-slate-500 italic">Heard: &ldquo;{liveCaption}&rdquo;</p>}
        </div>
      )}
    </div>
  );
}
