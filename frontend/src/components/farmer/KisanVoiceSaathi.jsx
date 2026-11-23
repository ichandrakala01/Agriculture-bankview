import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Volume2, Sparkles, CheckCircle2 } from 'lucide-react';

// ── DYNAMIC NUMBER & KHASRA PARSER ───────────────────────────────────────────
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
  const txt = raw.toLowerCase().replace(/[%₹,।?!]/g, ' ').trim();
  if (txt.includes('डेढ़')) return 1.5;
  if (txt.includes('ढाई')) return 2.5;
  if (txt === 'नहीं' || txt === 'नइ' || txt.includes('कोई नुकसान नहीं') || txt.includes('zero')) return 0;
  const directDigit = txt.match(/(\d+(\.\d+)?)/);
  if (directDigit && !txt.includes('हजार') && !txt.includes('लाख') && !txt.includes('सौ')) {
    return parseFloat(directDigit[1]);
  }
  const tokens = txt.split(/\s+/);
  let total = 0, current = 0, foundAny = false;
  for (const token of tokens) {
    if (/^\d+(\.\d+)?$/.test(token)) { current += parseFloat(token); foundAny = true; }
    else if (BASE_HINDI_NUMS[token] !== undefined) { current += BASE_HINDI_NUMS[token]; foundAny = true; }
    else if (MULTIPLIERS[token] !== undefined) {
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

// ── REGISTRATION QUESTIONS (trilingual, formal/institutional) ───────────────
const getRegistrationQuestions = (lang) => [
  {
    field: 'owner_name',
    ask: lang === 'en'
      ? 'Welcome to the Farmer Portal. Please state your full name to begin registration.'
      : lang === 'hi'
      ? 'नमस्ते। पंजीकरण प्रारंभ करने के लिए कृपया अपना पूरा नाम बताएं।'
      : 'नमस्ते। पंजीयन शुरू करे बर कृपया अपन पूरा नाम बतावव।',
    confirm: (v) => lang === 'en' ? `Recorded name: ${v}.` : `नाम ${v} दर्ज किया गया।`,
    parse: (txt) => txt.replace(/मेरा नाम|मोर नाम|है|हे|हवे|my name is/gi, '').trim() || null,
  },
  {
    field: 'father_name',
    ask: lang === 'en'
      ? "Please state your father's or spouse's full name."
      : lang === 'hi'
      ? 'कृपया अपने पिता या पति का नाम बताएं।'
      : 'कृपया अपन पिता या पति के नाम बतावव।',
    confirm: (v) => lang === 'en' ? `Recorded: ${v}.` : `${v} दर्ज किया गया।`,
    parse: (txt) => txt.replace(/पिता जी का नाम|नाम|है|हे/gi, '').trim() || null,
  },
  {
    field: 'khasra_no',
    ask: lang === 'en'
      ? 'Please state your land Khasra number, for example 205 slash 1.'
      : lang === 'hi'
      ? 'कृपया अपनी भूमि का खसरा नंबर बताएं, जैसे 205 बटा 1।'
      : 'कृपया अपन जमीन के खसरा नंबर बतावव, जइसे 205 बटा 1।',
    confirm: (v) => lang === 'en' ? `Khasra number ${v} recorded.` : `खसरा नंबर ${v} दर्ज किया गया।`,
    parse: (txt) => { const r = parseKhasra(txt); return r && r.includes('/') ? r : null; },
  },
  {
    field: 'mobile',
    ask: lang === 'en'
      ? 'Please state your 10-digit registered mobile number.'
      : lang === 'hi'
      ? 'कृपया अपना 10 अंकों का मोबाइल नंबर बताएं।'
      : 'कृपया अपन 10 अंक के मोबाइल नंबर बतावव।',
    confirm: (v) => lang === 'en' ? `Mobile number ${v} recorded.` : `मोबाइल नंबर ${v} दर्ज किया गया।`,
    parse: (txt) => { const d = txt.replace(/\D/g, ''); return d.length >= 6 ? d.slice(0, 10) : null; },
  },
  {
    field: 'district',
    ask: lang === 'en'
      ? 'Please state your district: Dhamtari, Raipur, Durg, or Mahasamund.'
      : lang === 'hi'
      ? 'कृपया अपना जिला बताएं: धमतरी, रायपुर, दुर्ग, या महासमुंद।'
      : 'कृपया अपन जिला बतावव: धमतरी, रायपुर, दुर्ग, या महासमुंद।',
    confirm: (v) => lang === 'en' ? `District set to ${v}.` : `${v} जिला चुना गया।`,
    parse: (txt) => parseDistrict(txt),
  },
  {
    field: 'village',
    ask: lang === 'en'
      ? 'Please state your village name.'
      : lang === 'hi'
      ? 'कृपया अपने गांव का नाम बताएं।'
      : 'कृपया अपन गांव के नाम बतावव।',
    confirm: (v) => lang === 'en' ? `Village ${v} recorded.` : `ग्राम ${v} दर्ज किया गया।`,
    parse: (txt) => txt.replace(/गांव|ग्राम|है|हे/gi, '').trim() || null,
  },
  {
    field: 'area_hectares',
    ask: lang === 'en'
      ? 'Please state your total land area in hectares, for example 2 hectares.'
      : lang === 'hi'
      ? 'कृपया कुल भूमि क्षेत्रफल हेक्टेयर में बताएं, जैसे 2 हेक्टेयर।'
      : 'कृपया कुल जमीन क्षेत्रफल हेक्टेयर म बतावव, जइसे 2 हेक्टेयर।',
    confirm: (v) => lang === 'en' ? `${v} hectares recorded.` : `${v} हेक्टेयर दर्ज किया गया।`,
    parse: (txt) => parseSpokenNumber(txt),
  },
  {
    field: 'actual_irrigation',
    ask: lang === 'en'
      ? 'Is your land Irrigated or Unirrigated as per Bhuiyan records?'
      : lang === 'hi'
      ? 'भुइयां रिकॉर्ड के अनुसार आपकी भूमि सिंचित है या असिंचित?'
      : 'भुइयां रिकॉर्ड के अनुसार तुंहर जमीन सिंचित हे या असिंचित?',
    confirm: (v) => lang === 'en' ? `Irrigation status set to ${v}.` : `${v === 'Irrigated' ? 'सिंचित' : 'असिंचित'} दर्ज किया गया।`,
    parse: (txt) => {
      if (txt.includes('असिंचित') || txt.includes('सूखा') || txt.includes('unirrigated')) return 'Unirrigated';
      if (txt.includes('सिंचित') || txt.includes('पानी') || txt.includes('irrigated')) return 'Irrigated';
      return null;
    },
  },
  {
    field: 'crop_loss_pct',
    ask: lang === 'en'
      ? 'Please state the percentage of crop loss, if any, or say zero.'
      : lang === 'hi'
      ? 'यदि फसल क्षति हुई है तो प्रतिशत बताएं, अन्यथा शून्य बोलें।'
      : 'यदि फसल नुकसान होइस हे त प्रतिशत बतावव, नहीं त शून्य बोलव।',
    confirm: (v) => lang === 'en'
      ? `${v} percent crop loss recorded. Submitting your registration now.`
      : `${v} प्रतिशत दर्ज किया गया। आपका पंजीकरण पूर्ण किया जा रहा है।`,
    parse: (txt) => { const n = parseSpokenNumber(txt); return (n !== null && n >= 0 && n <= 100) ? n : null; },
  },
];

// ── COMPONENT ─────────────────────────────────────────────────────────────────
export default function KisanVoiceSaathi({
  mode = 'register',
  lang = 'cg',
  setRegForm,
  onSubmitRegistration,
  record = null,
  onFileGrievance,
}) {
  const [active, setActive]               = useState(false);
  const [status, setStatus]               = useState('idle'); // idle | speaking | listening | processing
  const [stepIndex, setStepIndex]         = useState(0);
  const [liveCaption, setLiveCaption]     = useState('');
  const [assistantText, setAssistantText] = useState('');

  const activeRef      = useRef(false);
  const audioRef       = useRef(null);
  const recorderRef    = useRef(null);
  const streamRef      = useRef(null);
  const recognitionRef = useRef(null);
  const retryCountRef  = useRef(0);

  useEffect(() => {
    window.speechSynthesis?.getVoices();
    return () => stopVoice();
  }, []);

  const stopVoice = () => {
    activeRef.current = false;
    setActive(false);
    setStatus('idle');
    window.speechSynthesis?.cancel();
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try { recorderRef.current.stop(); } catch { /* ignore */ }
    }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
  };

  // ── 1. NEURAL TTS (edge-tts SwaraNeural via backend, browser fallback) ──────
  const speakNaturally = async (text, onFinished) => {
    if (!activeRef.current) return;
    setStatus('speaking');
    setAssistantText(text);
    try {
      const res = await fetch('/api/farmer/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, lang }),
      });
      if (!res.ok) throw new Error('TTS unavailable');
      const blob = await res.blob();
      if (!activeRef.current) return;
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { URL.revokeObjectURL(url); if (activeRef.current && onFinished) onFinished(); };
      audio.onerror = () => { URL.revokeObjectURL(url); if (activeRef.current && onFinished) onFinished(); };
      await audio.play();
    } catch {
      // Fallback to browser speechSynthesis when offline
      if (!activeRef.current) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const v = voices.find((x) => x.name.includes('Swara') || x.name.includes('Google हिन्दी') || x.lang === 'hi-IN');
      if (v) u.voice = v;
      u.lang = lang === 'en' ? 'en-IN' : 'hi-IN';
      u.rate = 0.93;
      u.onend   = () => { if (activeRef.current && onFinished) onFinished(); };
      u.onerror = () => { if (activeRef.current && onFinished) onFinished(); };
      window.speechSynthesis.speak(u);
    }
  };

  // ── 2. SMART MIC RECORDING + SILENCE DETECTION + WHISPER STT ───────────────
  const listenWithSilenceDetection = async (onTranscript) => {
    if (!activeRef.current) return;
    setStatus('listening');
    setLiveCaption('सुनत हंव... बोल के रुक जावव या "हो गया" बटन दबावव');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      const chunks = [];

      // Silence detection via Web Audio AnalyserNode
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source   = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      const dataArray  = new Uint8Array(analyser.frequencyBinCount);
      let hasSpoken    = false;
      let silenceStart = null;
      const startTime  = Date.now();

      const checkSilence = () => {
        if (!activeRef.current || recorder.state === 'inactive') { audioCtx.close().catch(() => {}); return; }
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        if (avg > 8) { hasSpoken = true; silenceStart = null; }
        else if (hasSpoken) {
          if (!silenceStart) silenceStart = Date.now();
          if (Date.now() - silenceStart > 1600) { recorder.stop(); return; }
        } else if (Date.now() - startTime > 8000) {
          // Total silence for 8s — stop cleanly, do not trigger retry loop
          stopVoice();
          return;
        }
        requestAnimationFrame(checkSilence);
      };

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = async () => {
        audioCtx.close().catch(() => {});
        stream.getTracks().forEach((t) => t.stop());
        if (!activeRef.current) return;
        setStatus('processing');
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', blob, 'voice.webm');
        try {
          const res  = await fetch('/api/farmer/stt', { method: 'POST', body: formData });
          const json = await res.json();
          if (!json.fallback && json.text) { setLiveCaption(json.text); onTranscript(json.text); return; }
        } catch { /* fall through to browser fallback */ }
        listenBrowserFallback(onTranscript);
      };
      recorder.start();
      requestAnimationFrame(checkSilence);
    } catch {
      listenBrowserFallback(onTranscript);
    }
  };

  const listenBrowserFallback = (onTranscript) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR || !activeRef.current) { onTranscript(''); return; }
    const rec = new SR();
    recognitionRef.current = rec;
    rec.lang = lang === 'en' ? 'en-IN' : 'hi-IN';
    rec.interimResults = true;
    setStatus('listening');
    let finalTxt = '';
    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalTxt += t + ' ';
        else interim += t;
      }
      setLiveCaption((finalTxt + interim).trim());
    };
    rec.onend   = () => { if (activeRef.current) onTranscript(finalTxt.trim()); };
    rec.onerror = () => { if (activeRef.current) onTranscript(''); };
    rec.start();
  };

  const finishSpeakingNow = () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try { recorderRef.current.stop(); } catch { /* ignore */ }
    }
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
  };

  // ── STAGE 1: REGISTRATION FLOW ───────────────────────────────────────────
  const askRegistrationStep = (idx) => {
    if (!activeRef.current) return;
    const questions = getRegistrationQuestions(lang);
    const q = questions[idx];
    speakNaturally(q.ask, () => {
      listenWithSilenceDetection((spoken) => {
        if (!activeRef.current) return;
        const parsed = spoken ? q.parse(spoken) : null;
        if (parsed !== null && parsed !== undefined && parsed !== '') {
          retryCountRef.current = 0;
          setRegForm((prev) => ({
            ...prev,
            [q.field]: parsed,
            ...(q.field === 'village' ? { block: parsed } : {}),
          }));
          const next = idx + 1;
          speakNaturally(q.confirm(parsed), () => {
            if (next < questions.length) { setStepIndex(next); askRegistrationStep(next); }
            else { stopVoice(); if (onSubmitRegistration) onSubmitRegistration(); }
          });
        } else if (retryCountRef.current < 1) {
          retryCountRef.current += 1;
          const shortRetry = lang === 'en'
            ? 'Please repeat that once more.'
            : 'कृपया एक बार फिर से बोलें।';
          speakNaturally(shortRetry, () => askRegistrationStep(idx));
        } else {
          retryCountRef.current = 0;
          const pauseMsg = lang === 'en'
            ? 'Voice paused. Please type this field manually.'
            : 'आवाज़ स्पष्ट नहीं होने के कारण वॉइस रोका गया है। कृपया यह विवरण टाइप करें।';
          speakNaturally(pauseMsg, () => stopVoice());
        }
      });
    });
  };

  const startVoiceRegistration = () => {
    activeRef.current = true;
    retryCountRef.current = 0;
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
    const gap = Number(record.total_shortfall    || 0).toLocaleString('en-IN');
    const speech = lang === 'en'
      ? `Hello ${record.owner_name}. For your ${record.area_hectares} hectares of ${record.actual_irrigation} land, you qualify for ₹${kcc} KCC credit at 4 percent interest, collateral-free up to 2 lakh rupees. Paddy MSP is ₹3,100 per quintal, and PMFBY covers ₹66,000 per hectare. ${record.total_shortfall > 0 ? `You have a shortfall of ₹${gap}. Say File Complaint to lodge your grievance now.` : 'All your payouts are verified.'}`
      : lang === 'hi'
        ? `नमस्ते ${record.owner_name} जी। आपके ${record.area_hectares} हेक्टेयर ${record.actual_irrigation === 'Irrigated' ? 'सिंचित' : 'असिंचित'} भूमि पर उपलब्ध सरकारी योजनाओं का विवरण: `
          + `पहला, धान खरीदी (MSP) दर ₹3,100 प्रति क्विंटल निर्धारित है। `
          + `दूसरा, आप ₹${kcc} तक KCC कृषि ऋण के पात्र हैं, ₹2 लाख तक बिना गारंटी, 4 प्रतिशत ब्याज। `
          + `तीसरा, PMFBY के अंतर्गत सिंचित भूमि पर ₹66,000 प्रति हेक्टेयर बीमा सुरक्षा उपलब्ध है। `
          + (record.total_shortfall > 0
            ? `आपके खाते में ₹${gap} का अंतर पाया गया है। शिकायत दर्ज करने के लिए बोलें।`
            : 'आपके सभी रिकॉर्ड नियमों के अनुरूप सत्यापित हैं।')
        : `नमस्ते ${record.owner_name} जी। तुंहर ${record.area_hectares} हेक्टेयर ${record.actual_irrigation === 'Irrigated' ? 'सिंचित' : 'असिंचित'} जमीन म मिलने वाला सुविधा जानव: `
          + `धान खरीदी के ₹3,100 प्रति क्विंटल दर तय हे। `
          + `आप ₹${kcc} तक के-सी-सी कृषि ऋण के पात्र हव, दो लाख रुपये तक बिना गारंटी, चार प्रतिशत ब्याज। `
          + `फसल बीमा म सिंचित जमीन बर ₹66,000 प्रति हेक्टेयर सुरक्षा मिलथे। `
          + (record.total_shortfall > 0
            ? `तुंहर खाता म ₹${gap} के कमी मिले हे। शिकायत दर्ज करे बर बोलव।`
            : 'तुंहर सबो हिसाब बिल्कुल सही हे।');

    speakNaturally(speech, () => {
      if (record.total_shortfall > 0) {
        listenWithSilenceDetection((spoken) => {
          const t = (spoken || '').toLowerCase();
          if (t.includes('शिकायत') || t.includes('दर्ज') || t.includes('हाँ') || t.includes('हा') || t.includes('complaint') || t.includes('yes')) {
            speakNaturally('ठीक हे भैया, तुंहर शिकायत पत्र अभी दर्ज करत हंव।', () => {
              stopVoice();
              if (onFileGrievance) onFileGrievance();
            });
          } else { stopVoice(); }
        });
      } else { stopVoice(); }
    });
  };

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="bg-emerald-900/10 border border-emerald-300 rounded-2xl p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-emerald-900 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            {lang === 'en' ? 'Kisan Saathi — Natural Voice Assistant' : 'किसान संगवारी — बोल के सबो काम करव'}
          </p>
          <p className="text-xs text-emerald-700 mt-0.5">
            {mode === 'register'
              ? 'एक बार दबाके अपन नाम, गांव अऊ जमीन बतावव — फॉर्म अपने-आप भरा जही'
              : lang === 'en' ? 'Listen to all schemes, loan limits, and file complaints hands-free'
              : 'अपन योजना, KCC छूट अऊ बीमा के नियम सुनव अऊ शिकायत दर्ज करव'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* "Done speaking" button — appears only while mic is active */}
          {active && status === 'listening' && (
            <button
              type="button"
              onClick={finishSpeakingNow}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition"
            >
              <CheckCircle2 className="w-4 h-4" /> बोलना हो गया (Done)
            </button>
          )}

          {!active ? (
            <button
              type="button"
              onClick={mode === 'register' ? startVoiceRegistration : startSchemeExplainer}
              className="bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow transition"
            >
              <Mic className="w-4 h-4" />
              {mode === 'register' ? 'Register with Voice' : lang === 'en' ? 'Explain My Schemes' : 'मोर योजना सुनव'}
            </button>
          ) : (
            <button
              type="button"
              onClick={stopVoice}
              className="bg-red-500 hover:bg-red-600 text-white font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition animate-pulse"
            >
              <Square className="w-4 h-4" />
              {mode === 'register' ? `Stop (${stepIndex + 1}/${getRegistrationQuestions(lang).length})` : 'Stop'}
            </button>
          )}
        </div>
      </div>

      {active && (
        <div className="bg-white border border-emerald-200 rounded-xl p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold ${
              status === 'speaking'   ? 'bg-blue-100 text-blue-800' :
              status === 'processing' ? 'bg-amber-100 text-amber-800' :
                                        'bg-red-100 text-red-700 animate-pulse'
            }`}>
              {status === 'speaking'   ? <><Volume2 className="w-3.5 h-3.5" /> संगवारी बोलत हे:</> :
               status === 'processing' ? <>⟳ समझत हंव...</> :
                                         <><Mic className="w-3.5 h-3.5" /> अब आप बोलव:</>}
            </span>
          </div>
          {assistantText && <p className="text-sm text-slate-800 leading-relaxed">{assistantText}</p>}
          {liveCaption   && <p className="text-xs text-slate-500 italic">&ldquo;{liveCaption}&rdquo;</p>}
        </div>
      )}
    </div>
  );
}
