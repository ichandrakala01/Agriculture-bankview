import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Volume2, Sparkles } from 'lucide-react';

// ── DYNAMIC NUMBER PARSER (handles 0 to 9,99,99,999 + rural fractions) ─────
const BASE_HINDI_NUMS = {
  'शून्य': 0, 'जीरो': 0, 'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5, 'पाँच': 5,
  'छह': 6, 'छः': 6, 'सात': 7, 'आठ': 8, 'नौ': 9, 'दस': 10, 'ग्यारह': 11, 'बारह': 12,
  'तेरह': 13, 'चौदह': 14, 'पंद्रह': 15, 'सोलह': 16, 'सत्रह': 17, 'अठारह': 18, 'उन्नीस': 19,
  'बीस': 20, 'इक्कीस': 21, 'बाईस': 22, 'तेईस': 23, 'चौबीस': 24, 'पच्चीस': 25, 'छब्बीस': 26,
  'सत्ताईस': 27, 'अट्ठाईस': 28, 'उनतीस': 29, 'तीस': 30, 'इकतीस': 31, 'बत्तीस': 32, 'तैंतीस': 33,
  'चौंतीस': 34, 'पैंतीस': 35, 'छत्तीस': 36, 'सैंतीस': 37, 'अड़तीस': 38, 'उनतालीस': 39, 'चालीस': 40,
  'इकतालीस': 41, 'बयालीस': 42, 'तैंतालीस': 43, 'चवालीस': 44, 'पैंतालीस': 45, 'छियालीस': 46,
  'सैंतालीस': 47, 'अड़तालीस': 48, 'उनचास': 49, 'पचास': 50, 'इक्यावन': 51, 'बावन': 52, 'तिरेपन': 53,
  'चौवन': 54, 'पचपन': 55, 'छप्पन': 56, 'सत्तावन': 57, 'अट्ठावन': 58, 'उनसठ': 59, 'साठ': 60,
  'इकसठ': 61, 'बासठ': 62, 'तिरेसठ': 63, 'चौंसठ': 64, 'पैंसठ': 65, 'छियासठ': 66, 'सड़सठ': 67,
  'अड़सठ': 68, 'उनहत्तर': 69, 'सत्तर': 70, 'इकहत्तर': 71, 'बहत्तर': 72, 'तिहत्तर': 73, 'चौहत्तर': 74,
  'पचहत्तर': 75, 'छिहत्तर': 76, 'सतहत्तर': 77, 'अठहत्तर': 78, 'उनासी': 79, 'अस्सी': 80,
  'इक्यासी': 81, 'बयासी': 82, 'तिरासी': 83, 'चौरासी': 84, 'पचासी': 85, 'छियासी': 86, 'सत्तासी': 87,
  'अट्ठासी': 88, 'नवासी': 89, 'नब्बे': 90, 'इक्यानवे': 91, 'बानवे': 92, 'तिरानवे': 93, 'चौरानवे': 94,
  'पचानवे': 95, 'छियानवे': 96, 'सत्तानवे': 97, 'अट्ठानवे': 98, 'निन्यानवे': 99,
};

const MULTIPLIERS = {
  'सौ': 100, 'hundred': 100,
  'हजार': 1000, 'हज़ार': 1000, 'thousand': 1000,
  'लाख': 100000, 'lakh': 100000,
  'करोड़': 10000000, 'crore': 10000000,
};

function parseSpokenNumber(raw) {
  const txt = raw.toLowerCase().replace(/,/g, '').trim();
  if (txt.includes('डेढ़')) return 1.5;
  if (txt.includes('ढाई')) return 2.5;
  const fractionOffset =
    txt.includes('सवा') ? 0.25 :
    txt.includes('साढ़े') ? 0.5 :
    txt.includes('पौने') ? -0.25 : 0;

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

  if (foundAny) return total + current + fractionOffset;
  return null;
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

// ── REGISTRATION QUESTIONS ────────────────────────────────────────────────
const REGISTRATION_QUESTIONS = [
  {
    field: 'owner_name',
    ask: 'राम-राम भैया! मैं तुंहर किसान संगवारी बोलत हंव। चलव मिलके तुंहर पंजीयन करथन। सबसे पहिली बतावव — आप के शुभ नाम का हे?',
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
    ask: 'आप के मोबाइल नंबर का हे, जेमा बैंक के मैसेज आथे?',
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
    ask: 'तुंहर जमीन म सिंचाई के साधन हे, यानी सिंचित हे — या असिंचित हे?',
    confirm: (v) => v === 'Irrigated' ? 'बढ़िया, सिंचित जमीन दर्ज कर लेंव।' : 'ठीक हे, असिंचित दर्ज कर लेंव।',
    parse: (txt) => {
      if (txt.includes('असिंचित') || txt.includes('सूखा') || txt.includes('unirrigated')) return 'Unirrigated';
      if (txt.includes('सिंचित') || txt.includes('पानी') || txt.includes('irrigated')) return 'Irrigated';
      return null;
    },
  },
  {
    field: 'crop_loss_pct',
    ask: 'अगर फसल म नुकसान होइस हे, त कतना प्रतिशत नुकसान होइस? जइसे कि 45 प्रतिशत।',
    confirm: (v) => `${v} प्रतिशत लिख लेंव। अब मैं तुंहर खाता बनाके सबो सरकारी योजना के जांच करत हंव!`,
    parse: (txt) => { const n = parseSpokenNumber(txt); return (n !== null && n >= 0 && n <= 100) ? n : null; },
  },
];

// ── COMPONENT ─────────────────────────────────────────────────────────────
export default function KisanVoiceSaathi({
  mode = 'register',
  setRegForm,
  onSubmitRegistration,
  record = null,
  onFileGrievance,
  onOpenRules,
  onOpenCalculator,
}) {
  const [active, setActive]           = useState(false);
  const [status, setStatus]           = useState('idle');
  const [stepIndex, setStepIndex]     = useState(0);
  const [liveCaption, setLiveCaption] = useState('');
  const [assistantText, setAssistantText] = useState('');

  const activeRef       = useRef(false);
  const recognitionRef  = useRef(null);

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

  useEffect(() => {
    if (mode === 'post_register_guide' && record && sessionStorage.getItem('voice_onboarding_active') === '1') {
      sessionStorage.removeItem('voice_onboarding_active');
      startPostRegistrationWalkthrough();
    }
  }, [mode, record]);

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
    u.lang = 'hi-IN';
    u.rate = 0.93;
    u.pitch = 1.04;
    u.onend   = () => { if (activeRef.current && onFinished) onFinished(); };
    u.onerror = () => { if (activeRef.current && onFinished) onFinished(); };
    window.speechSynthesis.speak(u);
  };

  // ── STAGE 1: REGISTRATION INTERVIEW ──────────────────────────────────────
  const listenRegistrationStep = (idx) => {
    if (!activeRef.current) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('कृपया Google Chrome या Microsoft Edge म खोलव।'); stopVoice(); return; }

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
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalSpoken += t + ' ';
        else interim += t;
      }
      setLiveCaption((finalSpoken + interim).trim());
    };

    rec.onend = () => {
      if (!activeRef.current) return;
      const cleanSpoken = finalSpoken.trim();
      const q = REGISTRATION_QUESTIONS[idx];
      const parsed = cleanSpoken ? q.parse(cleanSpoken) : null;

      if (parsed !== null && parsed !== '' && parsed !== undefined) {
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
            sessionStorage.setItem('voice_onboarding_active', '1');
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

  // ── STAGE 2: POST-REGISTRATION SCHEME WALKTHROUGH ───────────────────────
  const startPostRegistrationWalkthrough = () => {
    if (!record) return;
    activeRef.current = true;
    setActive(true);

    const kccLimit  = Number(record.eligible_kcc_limit  || 0).toLocaleString('en-IN');
    const shortfall = Number(record.total_shortfall      || 0).toLocaleString('en-IN');

    const speech =
      `बधाई हो ${record.owner_name} जी! तुंहर पंजीयन पूरा होगे हे। ` +
      `अब मैं तुंहर सरकारी सुविधा अऊ योजना के जानकारी बतात हंव। ` +
      `पहिली बात: तुंहर ${record.area_hectares} हेक्टेयर जमीन के हिसाब ले आप ₹${kccLimit} तक के KCC कृषि ऋण के पात्र हव। ` +
      (record.collateral_free_eligible ? '₹2 लाख तक बिना कोई गारंटी के ऋण मिलही। ' : '') +
      'दुसर बात: समय म पइसा पटाय ले सिर्फ 4 प्रतिशत ब्याज लगही। ' +
      (record.total_shortfall > 0
        ? `तुंहर खाता म कुल ₹${shortfall} के कमी मिले हे काबर कि बैंक ह सिंचित जमीन ल असिंचित लिख दे हे। `
        : 'तुंहर सबो बीमा अऊ धान बोनस के हिसाब एकदम सही हे। ') +
      'अब बतावव — का मैं तुंहर शिकायत पत्र अभी दर्ज कर दंव, या सबो सरकारी योजना के नियम विस्तार ले सुनावव?';

    speakNaturally(speech, () => listenForNextAction());
  };

  const listenForNextAction = () => {
    if (!activeRef.current) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { stopVoice(); return; }

    const rec = new SR();
    recognitionRef.current = rec;
    rec.lang = 'hi-IN';
    rec.interimResults = true;
    setStatus('listening');
    setLiveCaption('');
    let spoken = '';

    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) spoken += t + ' ';
        else interim += t;
      }
      setLiveCaption((spoken + interim).trim());
    };

    rec.onend = () => {
      if (!activeRef.current) return;
      const t = spoken.toLowerCase();
      if (t.includes('शिकायत') || t.includes('दर्ज') || t.includes('हाँ') || t.includes('हा')) {
        speakNaturally('ठीक हे भैया, मैं तुंहर आधिकारिक शिकायत पत्र तैयार करके कलेक्टर अऊ बैंक ल भेजत हंव।', () => {
          stopVoice();
          if (onFileGrievance) onFileGrievance();
        });
      } else if (t.includes('नियम') || t.includes('योजना') || t.includes('सुना')) {
        speakNaturally('ठीक हे भैया, सबो सरकारी योजना के जानकारी खोल के सुनावत हंव।', () => {
          stopVoice();
          if (onOpenRules) onOpenRules();
        });
      } else if (t.includes('हिसाब') || t.includes('कैलकुलेटर')) {
        speakNaturally('चलव भैया, हिसाब जांचे बर कैलकुलेटर खोलत हंव।', () => {
          stopVoice();
          if (onOpenCalculator) onOpenCalculator();
        });
      } else {
        speakNaturally('ठीक हे भैया! जब भी जरूरत होवय, बटन दबाके मोला बुला लेहू। राम-राम!', () => stopVoice());
      }
    };

    rec.start();
  };

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="bg-emerald-900/10 border border-emerald-300 rounded-2xl p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-emerald-900 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" /> किसान संगवारी — बोल के सबो काम करव
          </p>
          <p className="text-xs text-emerald-700 mt-0.5">
            {mode === 'register'
              ? 'एक बार बटन दबाके अपन नाम, गांव अऊ जमीन बतावव — पूरा पंजीयन अपने-आप हो जही'
              : 'अपन सबो योजना, KCC छूट अऊ बीमा के जानकारी सीधा सुनव अऊ शिकायत दर्ज करव'}
          </p>
        </div>

        {!active ? (
          <button
            type="button"
            onClick={mode === 'register' ? startVoiceRegistration : startPostRegistrationWalkthrough}
            className="bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow transition"
          >
            <Mic className="w-4 h-4" />
            {mode === 'register' ? 'Register with Voice (एक बार दबाएं)' : 'Explain My Schemes (सुनव)'}
          </button>
        ) : (
          <button
            type="button"
            onClick={stopVoice}
            className="bg-red-500 hover:bg-red-600 text-white font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition animate-pulse"
          >
            <Square className="w-4 h-4" />
            {mode === 'register'
              ? `Stop (${stepIndex + 1}/${REGISTRATION_QUESTIONS.length})`
              : 'Stop Guide'}
          </button>
        )}
      </div>

      {active && (
        <div className="bg-white border border-emerald-200 rounded-xl p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold">
            {status === 'speaking' ? (
              <><Volume2 className="w-4 h-4 text-emerald-600 animate-pulse" /> <span className="text-emerald-700">संगवारी बोलत हे:</span></>
            ) : (
              <><Mic className="w-4 h-4 text-amber-500 animate-pulse" /> <span className="text-amber-700">अब आप बोलव:</span></>
            )}
          </div>
          {assistantText && (
            <p className="text-sm text-slate-800 leading-relaxed">{assistantText}</p>
          )}
          {liveCaption && (
            <p className="text-xs text-slate-500 italic">आप कहे हव: &ldquo;{liveCaption}&rdquo;</p>
          )}
        </div>
      )}
    </div>
  );
}
