import { MODELS, SENTIMENTS, getModel, type Emotion, type Sentiment } from "./models";

export interface AudioMeta {
  name: string;
  duration: number;
  size: number;
  peaks: number[];
}

export interface SegmentPrediction {
  start: number;
  end: number;
  sentiment: Sentiment;
  emotion: Emotion;
  confidence: number;
}

export interface ModelResult {
  modelId: string;
  sentiment: Sentiment;
  emotion: Emotion;
  confidence: number;
  emotionProbs: Record<string, number>;
  sentimentProbs: Record<Sentiment, number>;
  processingTime: number;
  segments: SegmentPrediction[];
}

export interface TranscriptLine {
  start: number;
  end: number;
  text: string;
}

export interface Analysis {
  id: string;
  name: string;
  saved: boolean;
  tags: string[];
  notes: string;
  createdAt: number;
  audio: AudioMeta;
  modelIds: string[];
  results: ModelResult[];
  transcript: TranscriptLine[];
}

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

const LINES: Record<Sentiment, string[]> = {
  Positive: [
    "I really liked the product, it worked right out of the box.",
    "Honestly the support team was fantastic today.",
    "That's great news, thank you so much for sorting it out.",
    "The new features are exactly what we needed.",
    "I'd definitely recommend this to my colleagues.",
  ],
  Neutral: [
    "Okay, so let me pull up the order number for you.",
    "I called last week about the same account.",
    "Can you walk me through the next steps?",
    "The package arrived on Thursday afternoon.",
    "Let me check what the invoice says.",
  ],
  Negative: [
    "But the delivery was late, almost a full week.",
    "I've been waiting on hold for over forty minutes.",
    "This is the third time I'm explaining the same issue.",
    "The charger stopped working after two days.",
    "I'm not happy with how this was handled.",
  ],
};

const EMO_BY_SENT: Record<Sentiment, Emotion[]> = {
  Positive: ["Happy", "Calm", "Surprised"],
  Neutral: ["Neutral", "Calm"],
  Negative: ["Frustrated", "Angry", "Sad"],
};

const SENT_OF_EMO: Record<Emotion, Sentiment> = {
  Happy: "Positive",
  Calm: "Positive",
  Surprised: "Positive",
  Neutral: "Neutral",
  Sad: "Negative",
  Angry: "Negative",
  Frustrated: "Negative",
};

function closestEmotion(target: Emotion, allowed: Emotion[], r: () => number): Emotion {
  if (allowed.includes(target)) return target;
  const sent = SENT_OF_EMO[target];
  const same = allowed.filter((e) => SENT_OF_EMO[e] === sent);
  if (same.length) return same[Math.floor(r() * same.length)];
  return allowed.includes("Neutral") ? "Neutral" : allowed[0];
}

function normalize<T extends string>(o: Record<T, number>) {
  const total = Object.values<number>(o).reduce((a, b) => a + b, 0) || 1;
  const out = {} as Record<T, number>;
  for (const k in o) out[k] = Math.round((o[k] / total) * 1000) / 10;
  return out;
}

export function generatePeaks(seed: number, n = 160) {
  const r = rng(seed);
  const peaks: number[] = [];
  let env = 0.5;
  for (let i = 0; i < n; i++) {
    env += (r() - 0.5) * 0.25;
    env = Math.max(0.15, Math.min(0.95, env));
    peaks.push(Math.max(0.06, env * (0.45 + r() * 0.55)));
  }
  return peaks;
}

export function runAnalysis(audio: AudioMeta, modelIds: string[], times: Record<string, number> = {}): Analysis {
  const seed = hash(audio.name + audio.size + Math.round(audio.duration));
  const r = rng(seed);
  const duration = Math.max(audio.duration, 6);
  const count = Math.max(4, Math.min(12, Math.round(duration / 14)));
  const step = duration / count;

  // underlying "ground" trajectory
  const truth: { sentiment: Sentiment; emotion: Emotion }[] = [];
  let mood = r() * 2 - 0.6;
  for (let i = 0; i < count; i++) {
    mood += (r() - 0.5) * 1.3;
    mood = Math.max(-1.2, Math.min(1.2, mood));
    const sentiment: Sentiment = mood > 0.3 ? "Positive" : mood < -0.35 ? "Negative" : "Neutral";
    const opts = EMO_BY_SENT[sentiment];
    truth.push({ sentiment, emotion: opts[Math.floor(r() * opts.length)] });
  }

  const transcript: TranscriptLine[] = truth.map((t, i) => {
    const pool = LINES[t.sentiment];
    return {
      start: +(i * step + 0.6).toFixed(1),
      end: +((i + 1) * step - 0.3).toFixed(1),
      text: pool[Math.floor(r() * pool.length)],
    };
  });

  const results: ModelResult[] = modelIds.map((id) => {
    const m = getModel(id);
    const mr = rng(seed ^ hash(id));
    const segments: SegmentPrediction[] = truth.map((t, i) => {
      let sentiment = t.sentiment;
      const flip = mr();
      if (flip < 0.18) {
        const idx = SENTIMENTS.indexOf(sentiment);
        const dir = m.bias + (mr() - 0.5) >= 0 ? -1 : 1;
        sentiment = SENTIMENTS[Math.max(0, Math.min(2, idx + dir))];
      }
      let emotion = closestEmotion(t.emotion, m.emotions, mr);
      if (SENT_OF_EMO[emotion] !== sentiment && sentiment !== "Neutral") {
        emotion = closestEmotion(EMO_BY_SENT[sentiment][0], m.emotions, mr);
      }
      return {
        start: +(i * step).toFixed(1),
        end: +((i + 1) * step).toFixed(1),
        sentiment,
        emotion,
        confidence: Math.round(70 + mr() * 26 + (m.accuracy - 86) * 0.6),
      };
    });

    const sRaw = { Positive: 0.4, Neutral: 0.4, Negative: 0.4 } as Record<Sentiment, number>;
    const eRaw: Record<string, number> = {};
    m.emotions.forEach((e) => (eRaw[e] = 0.15 + mr() * 0.2));
    segments.forEach((s) => {
      sRaw[s.sentiment] += s.confidence / 100;
      eRaw[s.emotion] = (eRaw[s.emotion] ?? 0) + (s.confidence / 100) * 1.4;
    });
    sRaw.Positive += m.bias;
    const sentimentProbs = normalize(sRaw);
    const emotionProbs = normalize(eRaw);
    const sentiment = (Object.entries(sentimentProbs).sort((a, b) => b[1] - a[1])[0][0]) as Sentiment;
    const emotion = Object.entries(emotionProbs).sort((a, b) => b[1] - a[1])[0][0] as Emotion;
    const avg = segments.reduce((a, s) => a + s.confidence, 0) / segments.length;
    return {
      modelId: id,
      sentiment,
      emotion,
      confidence: Math.min(97, Math.round(avg)),
      emotionProbs,
      sentimentProbs,
      processingTime: times[id] ?? +((duration / 60) * m.speed * 1.6 + 0.9 + mr()).toFixed(1),
      segments,
    };
  });

  return {
    id: `an_${Date.now().toString(36)}${Math.floor(r() * 1e4).toString(36)}`,
    name: audio.name.replace(/\.[^.]+$/, ""),
    saved: false,
    tags: [],
    notes: "",
    createdAt: Date.now(),
    audio,
    modelIds,
    results,
    transcript,
  };
}

export function aggregate(results: ModelResult[]) {
  const sv: Record<string, number> = {};
  const ev: Record<string, number> = {};
  results.forEach((r) => {
    sv[r.sentiment] = (sv[r.sentiment] ?? 0) + r.confidence;
    ev[r.emotion] = (ev[r.emotion] ?? 0) + r.confidence;
  });
  const sentiment = (Object.entries(sv).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Neutral") as Sentiment;
  const emotion = (Object.entries(ev).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Neutral") as Emotion;
  const agreeing = results.filter((r) => r.sentiment === sentiment);
  const confidence = Math.round(agreeing.reduce((a, r) => a + r.confidence, 0) / (agreeing.length || 1));
  const sentimentAgree = Math.round((agreeing.length / (results.length || 1)) * 100);
  const emotionAgree = Math.round((results.filter((r) => r.emotion === emotion).length / (results.length || 1)) * 100);
  return { sentiment, emotion, confidence, sentimentAgree, emotionAgree };
}

export function segmentAgreement(results: ModelResult[]) {
  if (!results.length) return { pct: 0, disagreements: [] as SegmentPrediction[] };
  const n = results[0].segments.length;
  const disagreements: SegmentPrediction[] = [];
  let agree = 0;
  for (let i = 0; i < n; i++) {
    const set = new Set(results.map((r) => r.segments[i]?.sentiment));
    if (set.size === 1) agree++;
    else disagreements.push(results[0].segments[i]);
  }
  return { pct: Math.round((agree / n) * 100), disagreements };
}

export const fmtTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

export const fmtSize = (b: number) =>
  b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`;

export function demoAnalyses(): Analysis[] {
  const mk = (name: string, duration: number, size: number, ids: string[], label: string, tags: string[], ago: number) => {
    const audio = { name, duration, size, peaks: generatePeaks(hash(name)) };
    const a = runAnalysis(audio, ids);
    return { ...a, id: `demo_${hash(name).toString(36)}`, name: label, saved: true, tags, createdAt: Date.now() - ago };
  };
  return [
    mk("customer_call.wav", 154, 4_820_000, ["emotionnet", "sentivox", "polyaffect"], "Customer Call - October 2026", ["customer", "support"], 86400000 * 2),
    mk("podcast_ep12_clip.mp3", 212, 3_410_000, ["sentivox", "hubert-er"], "Podcast Ep. 12 clip", ["podcast", "demo"], 86400000 * 6),
    mk("sales_pitch_v3.m4a", 98, 1_960_000, MODELS.map((m) => m.id), "Sales pitch rehearsal", ["sales"], 86400000 * 11),
  ];
}
