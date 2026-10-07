export type Sentiment = "Positive" | "Neutral" | "Negative";
export type Emotion = "Happy" | "Calm" | "Neutral" | "Sad" | "Angry" | "Frustrated" | "Surprised";

export const SENTIMENTS: Sentiment[] = ["Positive", "Neutral", "Negative"];

export interface AIModel {
  id: string;
  name: string;
  short: string;
  provider: string;
  type: string;
  outputs: string;
  description: string;
  accuracy: number;
  benchmark: string;
  emotions: Emotion[];
  languages?: string;
  colorIndex: number; // 1..4
  speed: number; // relative processing speed
  bias: number; // tendency toward positive (-1..1)
}

export const MODELS: AIModel[] = [
  {
    id: "emotionnet",
    name: "EmotionNet v2",
    short: "A",
    provider: "wav2vec 2.0 · Hugging Face",
    type: "Audio Emotion",
    outputs: "Happy, Sad, Angry, Neutral",
    description: "Acoustic emotion classifier fine-tuned on prosody, pitch and energy features.",
    accuracy: 86,
    benchmark: "IEMOCAP",
    emotions: ["Happy", "Sad", "Angry", "Neutral"],
    colorIndex: 1,
    speed: 1.1,
    bias: 0.15,
  },
  {
    id: "sentivox",
    name: "SentiVox",
    short: "B",
    provider: "Whisper + RoBERTa",
    type: "Speech Sentiment",
    outputs: "Positive, Neutral, Negative",
    description: "Transcribes speech, then scores sentiment from language with tonal re-weighting.",
    accuracy: 89,
    benchmark: "CMU-MOSEI",
    emotions: ["Calm", "Happy", "Neutral", "Frustrated"],
    colorIndex: 2,
    speed: 0.8,
    bias: 0.05,
  },
  {
    id: "polyaffect",
    name: "PolyAffect XL",
    short: "C",
    provider: "XLS-R · PyTorch",
    type: "Multilingual Emotion",
    outputs: "Emotion + Sentiment",
    description: "Cross-lingual model trained on 20+ languages. Robust to accents and code-switching.",
    accuracy: 84,
    benchmark: "MSP-Podcast",
    emotions: ["Happy", "Neutral", "Sad", "Angry", "Surprised"],
    languages: "20+",
    colorIndex: 3,
    speed: 1.35,
    bias: -0.1,
  },
  {
    id: "hubert-er",
    name: "HuBERT-ER Large",
    short: "D",
    provider: "Meta HuBERT · ONNX",
    type: "Audio Emotion",
    outputs: "7 emotions + Sentiment",
    description: "Self-supervised speech representations with a fine-grained 7-class emotion head.",
    accuracy: 88,
    benchmark: "RAVDESS",
    emotions: ["Happy", "Calm", "Neutral", "Sad", "Angry", "Frustrated", "Surprised"],
    colorIndex: 4,
    speed: 0.95,
    bias: 0,
  },
];

export const getModel = (id: string) => MODELS.find((m) => m.id === id) ?? MODELS[0];
export const modelColor = (id: string) => `var(--model-${getModel(id).colorIndex})`;
const EMOTION_FALLBACK_COLORS = ["#38bdf8", "#a78bfa", "#fb7185", "#34d399", "#fbbf24", "#f472b6"];
export const emotionColor = (e: string) => {
  const key = e.trim().toLowerCase();
  const known = new Set(["happy", "calm", "neutral", "sad", "angry", "frustrated", "surprised"]);
  if (known.has(key)) return `var(--emo-${key})`;
  if (key === "unknown" || !key) return "#94a3b8";
  const hash = [...key].reduce((value, character) => value + character.charCodeAt(0), 0);
  return EMOTION_FALLBACK_COLORS[hash % EMOTION_FALLBACK_COLORS.length] ?? "#38bdf8";
};
export const sentimentColor = (s: string) =>
  s === "Positive" ? "var(--positive)" : s === "Negative" ? "var(--negative)" : "var(--neutral)";
