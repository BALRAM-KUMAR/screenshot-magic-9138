import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AudioLines,
  Check,
  ChevronDown,
  FileAudio2,
  Headphones,
  LoaderCircle,
  Mic2,
  Sparkles,
  X,
} from "lucide-react";
import { uploadAudio, getModels, runAnalysis } from "../lib/api";
import { Button } from "../components/ui/button";
import { AudioUploader } from "../components/audio/AudioUploader";
import { EmotionBadge, SentimentBadge } from "../components/models/ModelBits";
import { EmotionTimeline, type TimelineSegment } from "../components/results/EmotionTimeline";
import { emotionColor } from "../lib/models";
import { fmtTime } from "../lib/analysis";

export const Route = createFileRoute("/")({ component: Index });

type Segment = TimelineSegment;
type Prediction = {
  id: string;
  name: string;
  emotion: string;
  sentiment: string;
  confidence: number;
  segments: Segment[];
  error?: string;
  raw: any;
};
type AnalysisResponse = { predictions: Prediction[]; raw: any };

const asObject = (value: any) => (value && typeof value === "object" ? value : {});
const first = (...values: any[]) => values.find((v) => v !== undefined && v !== null && v !== "");
const label = (value: any, fallback: string) =>
  typeof value === "string" && value.trim()
    ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
    : fallback;
const pct = (value: any) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(Math.max(0, Math.min(100, n <= 1 ? n * 100 : n)));
};
const TIMESTAMPED_MODEL_IDS = new Set(["sensevoice-small", "emotion2vec-plus-large"]);
function friendlyModelError(error: any) {
  const message = String(error ?? "");
  if (/flash[_-]attn|no module named/i.test(message)) {
    return "This model's speech engine is not ready on the analysis server. Try another model. The server setup needs its optional audio dependency installed or disabled for this model.";
  }
  if (/timeout|timed out/i.test(message))
    return "The model took too long to respond. Try again in a moment.";
  if (/out of memory|cuda|gpu/i.test(message))
    return "The model ran out of processing capacity. Try a shorter recording or another model.";
  return message || "The model could not analyze this recording. Try another model.";
}

function normalizeResponse(data: any): AnalysisResponse {
  const payload = asObject(data?.data ?? data);
  const rows = Array.isArray(data)
    ? data
    : first(
        payload.predictions,
        payload.results,
        payload.models,
        [],
      );
  const predictions = (Array.isArray(rows) ? rows : [rows]).map((row: any, index: number) => {
    const r = asObject(row);
    const details = asObject(first(r.result, r.output, r.prediction, r));
    const modelId = String(first(r.model_id, r.id, r.model_name, r.model, ""));
    const timeline = Array.isArray(payload.timeline) ? payload.timeline : [];
    const modelTimeline = timeline.filter((segment: any) =>
      String(segment?.model_id ?? "").toLowerCase() === modelId.toLowerCase(),
    );
    const embeddedSegments = first(
      details.segments,
      details.timeline,
      details.segment_predictions,
      details.chunks,
      details.emotion_segments,
    );
    const segmentRows = Array.isArray(embeddedSegments) && embeddedSegments.length
      ? embeddedSegments
      : modelTimeline.length || (Array.isArray(rows) && rows.length > 1)
        ? modelTimeline
        : timeline;
    const segments: Segment[] = (Array.isArray(segmentRows) ? segmentRows : []).map((item: any) => {
      const s = asObject(item);
      const probs = asObject(first(s.emotion_scores, s.emotions, s.scores));
      const topProb = Object.entries(probs).sort((a, b) => Number(b[1]) - Number(a[1]))[0];
      return {
        start: Number(first(s.start, s.start_time, s.start_sec, s.from, 0)) || 0,
        end: Number(first(s.end, s.end_time, s.end_sec, s.to, 0)) || 0,
        emotion: label(first(s.emotion, s.label, topProb?.[0]), "Unknown"),
        sentiment: label(first(s.sentiment), "Neutral"),
        confidence: pct(first(s.confidence, s.score, topProb?.[1])),
        text: first(s.text, s.transcript, s.sentence, s.transcript_text),
      };
    });
    const rawName = String(first(r.model_name, r.model, r.model_id, r.name, `Model ${index + 1}`));
    const name = rawName === "text-sentiment"
      ? "Transcript sentiment"
      : rawName.startsWith("hybrid-combined-")
        ? `Combined result · ${rawName.replace("hybrid-combined-", "").replaceAll("_", " ")}`
        : rawName;
    const modelError = first(
      r.error_message,
      r.error,
      r.status === "FAILED" ? "Analysis failed" : undefined,
    );
    return {
      id: String(first(r.model_id, r.id, name, index)),
      name,
      emotion: label(
        first(details.emotion, details.dominant_emotion, details.label),
        segments[0]?.emotion ?? "—",
      ),
      sentiment: label(first(details.sentiment), segments[0]?.sentiment ?? "Neutral"),
      confidence: pct(first(details.confidence, details.score, details.probability)),
      segments,
      ...(modelError ? { error: friendlyModelError(modelError) } : {}),
      raw: r,
    };
  });
  return { predictions, raw: data };
}

function Index() {
  const [file, setFile] = useState<File | null>(null);
  const [models, setModels] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState("");
  const [duration, setDuration] = useState(0);
  const [activeModel, setActiveModel] = useState(0);
  const [activeSegment, setActiveSegment] = useState<number | null>(null);
  const [filter, setFilter] = useState("All emotions");
  const [hybridMode, setHybridMode] = useState(false);
  const [combineStrategy, setCombineStrategy] = useState("weighted");
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const stopSegmentPlaybackRef = useRef<(() => void) | null>(null);
  const objectUrl = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);

  useEffect(
    () => () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    },
    [objectUrl],
  );
  useEffect(() => {
    getModels()
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.models ?? data?.data ?? []);
        const timestampedModels = list.filter((model: any) =>
          TIMESTAMPED_MODEL_IDS.has(String(model.id ?? model.model_id ?? "")),
        );
        setModels(
          timestampedModels.map((model: any, index: number) => ({
            id: String(model.id ?? model.model_id ?? `model-${index}`),
            name: String(model.name ?? model.model_name ?? model.id ?? `Model ${index + 1}`),
            short: String(model.short ?? String(index + 1)),
            provider: String(model.provider ?? "Audio analysis API"),
            type: String(model.type ?? model.task ?? "Emotion analysis"),
            outputs: String(model.outputs ?? "Emotion + sentiment"),
            description: String(model.description ?? "Analyze emotion and sentiment in speech."),
            accuracy: Number(model.accuracy ?? 0),
            benchmark: String(model.benchmark ?? ""),
            emotions: Array.isArray(model.emotions)
              ? model.emotions
              : ["Happy", "Calm", "Neutral", "Sad", "Angry", "Frustrated", "Surprised"],
            colorIndex: (index % 4) + 1,
            speed: 1,
            bias: 0,
          })),
        );
        setSelected(timestampedModels.map((model: any) => String(model.id ?? model.model_id)));
      })
      .catch(() =>
        setError("Could not load the available models. Check that the API server is running."),
      );
  }, []);
  useEffect(() => {
    if (!objectUrl) {
      setDuration(0);
      return;
    }
    const audio = new Audio();
    audio.src = objectUrl;
    audio.onloadedmetadata = () =>
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
  }, [objectUrl]);

  const result = analysis?.predictions[activeModel];
  const segments = result?.segments ?? [];
  const emotions = [...new Set(segments.map((s) => s.emotion))];
  const filteredSegments = segments
    .map((segment, index) => ({ segment, index }))
    .filter(({ segment }) => filter === "All emotions" || segment.emotion === filter);
  const meanConfidence = segments.length
    ? Math.round(segments.reduce((sum, s) => sum + s.confidence, 0) / segments.length)
    : (result?.confidence ?? 0);
  const topEmotion = segments.length
    ? emotions
        .map((emotion) => ({
          emotion,
          count: segments.filter((s) => s.emotion === emotion).length,
        }))
        .sort((a, b) => b.count - a.count)[0]?.emotion
    : result?.emotion;

  const playSegment = (index: number) => {
    const segment = segments[index];
    const audio = audioRef.current;
    setActiveSegment(index);
    if (!segment || !audio) return;
    stopSegmentPlaybackRef.current?.();
    audio.currentTime = Math.max(0, segment.start);
    const stopAtSegmentEnd = () => {
      if (audio.currentTime < segment.end) return;
      audio.pause();
      audio.removeEventListener("timeupdate", stopAtSegmentEnd);
      stopSegmentPlaybackRef.current = null;
    };
    if (segment.end > segment.start) {
      audio.addEventListener("timeupdate", stopAtSegmentEnd);
      stopSegmentPlaybackRef.current = () =>
        audio.removeEventListener("timeupdate", stopAtSegmentEnd);
    }
    void audio.play().catch(() => {
      // Keep the player seeked even when browser playback is unavailable.
    });
  };

  const handleAnalyze = async () => {
    if (!file || !selected.length) return;
    setLoading(true);
    setError("");
    setAnalysis(null);
    setActiveSegment(null);
    try {
      const uploaded = await uploadAudio(file);
      const response = await runAnalysis(String(uploaded.id ?? uploaded.audio_id), selected, {
        hybridMode,
        combineStrategy,
      });
      const normalized = normalizeResponse(response);
      setAnalysis(normalized);
      setActiveModel(
        Math.max(
          0,
          normalized.predictions.findIndex((prediction) => !prediction.error),
        ),
      );
    } catch (err: any) {
      setError(err?.message || "Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );

  return (
    <main className="min-h-screen pb-20">
      <header className="sticky top-0 z-30 border-b border-white/8 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-5 lg:px-8">
          <a href="#top" className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <AudioLines className="size-5" />
            </span>
            <span className="font-semibold tracking-tight">
              AudioSense <span className="text-muted-foreground">AI</span>
            </span>
          </a>
          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-muted-foreground sm:flex">
            <span className="size-1.5 rounded-full bg-emerald-400" /> Analysis workspace
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <a href="#analysis" className="text-muted-foreground transition hover:text-foreground">
              Your analysis <span aria-hidden="true">↗</span>
            </a>
            <Link to="/history" className="text-muted-foreground transition hover:text-foreground">
              History
            </Link>
          </nav>
        </div>
      </header>

      <div id="top" className="mx-auto max-w-7xl px-5 lg:px-8">
        <section className="grid gap-10 pb-12 pt-12 lg:grid-cols-[1fr_320px] lg:items-end lg:pt-16">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary">
              <Sparkles className="size-3.5" /> AUDIO INTELLIGENCE STUDIO
            </div>
            <h1 className="max-w-3xl text-4xl font-semibold leading-[1.1] tracking-[-0.045em] sm:text-5xl lg:text-[58px]">
              Hear the emotion
              <br className="hidden sm:block" /> behind every word.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
              Explore how tone changes across a conversation. Upload a recording, compare emotion
              models, and inspect the moments that matter.
            </p>
          </div>
        </section>

        <section className="grid items-start gap-5 lg:grid-cols-2">
          <div className="glass p-5 sm:p-6">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <p className="eyebrow">01 / Audio source</p>
                <h2 className="mt-1 text-lg font-semibold">Add a recording</h2>
              </div>
              <span className="rounded-lg border px-2.5 py-1 font-mono text-[10px] text-muted-foreground">
                MP3 · WAV · M4A · FLAC · WEBM
              </span>
            </div>
            {file ? (
              <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <FileAudio2 className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{file.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                      {duration > 0 ? ` · ${fmtTime(duration)}` : " · Reading duration…"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setAnalysis(null);
                    }}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-white/5 hover:text-foreground"
                    aria-label="Remove audio"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <audio ref={audioRef} className="mt-4 h-9 w-full" controls src={objectUrl} />
              </div>
            ) : (
              <AudioUploader
                onFile={(next) => {
                  setFile(next);
                  setAnalysis(null);
                  setError("");
                }}
                inputRef={inputRef}
              />
            )}
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <Headphones className="size-3.5" />{" "}
              {file
                ? "Audio is ready for analysis"
                : "Drop a file above or record directly from your microphone"}
            </div>
          </div>
          <div className="glass p-5 sm:p-6">
            <div className="mb-5">
              <p className="eyebrow">02 / Analysis setup</p>
              <h2 className="mt-1 text-lg font-semibold">Select models</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                SenseVoice and Emotion2Vec automatically detect speech segments and classify each one.
              </p>
            </div>
            <label className="mb-4 flex cursor-pointer items-start gap-3 rounded-xl border border-primary/20 bg-primary/[0.04] p-3.5">
              <input
                type="checkbox"
                checked={hybridMode}
                onChange={(event) => setHybridMode(event.target.checked)}
                className="mt-0.5 size-4 accent-primary"
              />
              <span>
                <span className="block text-sm font-medium">Hybrid mode (audio + text)</span>
                <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                  Transcribe with ElevenLabs, score transcript sentiment, then combine it with audio sentiment.
                </span>
              </span>
            </label>
            {hybridMode && (
              <label className="mb-4 flex items-center justify-between gap-3 text-sm">
                <span>Result combination</span>
                <select
                  value={combineStrategy}
                  onChange={(event) => setCombineStrategy(event.target.value)}
                  className="rounded-lg border bg-card px-2.5 py-1.5 text-xs outline-none"
                >
                  <option value="weighted">Balanced (conflicts become neutral)</option>
                  <option value="audio_first">Prefer audio</option>
                  <option value="text_first">Prefer transcript</option>
                  <option value="majority_vote">Majority vote</option>
                </select>
              </label>
            )}
            {models.length ? (
              <div className="flex flex-wrap gap-x-5 gap-y-3">
                {models.map((model: any) => {
                  const id = String(model.id);
                  return (
                    <label key={id} className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selected.includes(id)}
                        onChange={() => toggle(id)}
                        className="size-4 accent-primary"
                      />
                      <span>{model.name}</span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
                {error || "No timestamped models are available. Enable SenseVoice and Emotion2Vec on the analysis server."}
              </div>
            )}
            <Button
              className="mt-5 h-11 w-full"
              disabled={!file || !selected.length || loading || !models.length}
              onClick={handleAnalyze}
            >
              {loading ? (
                <>
                  <LoaderCircle className="animate-spin" /> Analyzing your audio…
                </>
              ) : (
                <>
                  <Sparkles /> {hybridMode ? "Run hybrid analysis" : "Analyze recording"}
                </>
              )}
            </Button>
            {error && (
              <p
                role="alert"
                className="mt-3 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </p>
            )}
          </div>
        </section>

        {loading && (
          <div className="mt-8 glass flex items-center gap-4 p-5">
            <div className="grid size-11 place-items-center rounded-full bg-primary/10 text-primary">
              <LoaderCircle className="animate-spin" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Listening across the full recording</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Your selected models are detecting sentiment and emotion.
              </p>
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-secondary">
                <div className="h-full w-2/3 animate-pulse rounded-full bg-primary" />
              </div>
            </div>
            <span className="font-mono text-xs text-muted-foreground">PROCESSING</span>
          </div>
        )}

        {analysis && (
          <section id="analysis" className="scroll-mt-24 pt-14">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow">03 / Listening report</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                  Emotion across your audio
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {file?.name} · {analysis.predictions.length} model
                  {analysis.predictions.length === 1 ? "" : "s"} analyzed
                </p>
              </div>
              {analysis.predictions.length > 1 && (
                <label className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Model</span>
                  <select
                    className="bg-transparent font-medium outline-none"
                    value={activeModel}
                    onChange={(e) => {
                      setActiveModel(Number(e.target.value));
                      setActiveSegment(null);
                    }}
                    aria-label="Choose model"
                  >
                    {analysis.predictions.map((p, i) => (
                      <option key={p.id} value={i}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="size-3 text-muted-foreground" />
                </label>
              )}
            </div>
            {typeof analysis.raw?.transcript?.text === "string" && (
              <div className="mb-5 rounded-xl border border-white/10 bg-white/[0.025] p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  ElevenLabs transcript{analysis.raw.transcript.language ? ` · ${analysis.raw.transcript.language}` : ""}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                  {analysis.raw.transcript.text || "No speech was detected in this recording."}
                </p>
              </div>
            )}
            {analysis.raw?.hybrid && (
              <div className="mb-5 grid gap-3 rounded-xl border border-primary/20 bg-primary/[0.04] p-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Audio sentiment</p>
                  <p className="mt-1 text-sm font-semibold">{label(analysis.raw.hybrid.audio_sentiment, "Unavailable")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Transcript sentiment</p>
                  <p className="mt-1 text-sm font-semibold">{label(analysis.raw.hybrid.text_sentiment, "Unavailable")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Combined · {String(analysis.raw.hybrid.strategy).replaceAll("_", " ")}</p>
                  <p className="mt-1 text-sm font-semibold">{label(analysis.raw.hybrid.sentiment, "Unavailable")}</p>
                </div>
              </div>
            )}
            {result && (
              <>
                <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="glass p-4">
                    <p className="eyebrow">Overall emotion</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ background: emotionColor(topEmotion ?? "Neutral") }}
                      />
                      <span className="text-xl font-semibold">{topEmotion || "—"}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Most detected throughout the audio
                    </p>
                  </div>
                  <div className="glass p-4">
                    <p className="eyebrow">Overall sentiment</p>
                    <div className="mt-2">
                      <SentimentBadge value={result.sentiment} />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Clip-level model prediction
                    </p>
                  </div>
                  <div className="glass p-4">
                    <p className="eyebrow">Average confidence</p>
                    <p className="mt-2 text-2xl font-semibold tabular">
                      {meanConfidence}
                      <span className="text-base text-muted-foreground">%</span>
                    </p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${meanConfidence}%` }}
                      />
                    </div>
                  </div>
                  <div className="glass p-4">
                    <p className="eyebrow">Audio coverage</p>
                    <p className="mt-2 text-2xl font-semibold tabular">
                      {segments.length || "—"}
                      <span className="ml-1.5 text-sm font-normal text-muted-foreground">
                        segments
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {duration ? `${fmtTime(duration)} total duration` : "From model response"}
                    </p>
                  </div>
                </div>
                {analysis.predictions.some((prediction) => prediction.error) && (
                  <div className="mb-4 rounded-xl border border-amber-400/20 bg-amber-300/[0.04] p-4">
                    <p className="text-sm font-medium text-amber-200">
                      Some models could not finish
                    </p>
                    <div className="mt-2 space-y-2">
                      {analysis.predictions
                        .filter((prediction) => prediction.error)
                        .map((prediction) => (
                          <p
                            key={prediction.id}
                            className="text-sm leading-relaxed text-muted-foreground"
                          >
                            <span className="font-medium text-foreground">{prediction.name}:</span>{" "}
                            {prediction.error}
                          </p>
                        ))}
                    </div>
                  </div>
                )}
                {segments.length > 0 ? (
                  <div className="grid gap-5 xl:grid-cols-[1.55fr_.75fr]">
                    <EmotionTimeline
                      segments={segments}
                      emotions={emotions}
                      duration={duration}
                      activeSegment={activeSegment}
                      onSelectSegment={playSegment}
                    />
                    <div className="glass overflow-hidden">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
                        <div>
                          <h3 className="font-semibold">Segment breakdown</h3>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Inspect the prediction for each moment.
                          </p>
                        </div>
                        <select
                          className="rounded-lg border bg-card px-2.5 py-1.5 text-xs outline-none"
                          value={filter}
                          onChange={(e) => setFilter(e.target.value)}
                          aria-label="Filter by emotion"
                        >
                          <option>All emotions</option>
                          {emotions.map((emotion) => (
                            <option key={emotion}>{emotion}</option>
                          ))}
                        </select>
                      </div>
                      <div className="max-h-[440px] divide-y divide-white/5 overflow-auto">
                        {filteredSegments.map(({ segment, index }) => (
                          <button
                            type="button"
                            key={index}
                            onClick={() => playSegment(index)}
                            className={`w-full px-4 py-3.5 text-left transition hover:bg-white/[0.035] ${activeSegment === index ? "bg-primary/[0.06]" : ""}`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-mono text-xs text-muted-foreground">
                                {fmtTime(segment.start)} <span className="opacity-50">→</span>{" "}
                                {fmtTime(segment.end)}
                              </span>
                              <span className="font-mono text-xs tabular">
                                {segment.confidence}%
                              </span>
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <EmotionBadge value={segment.emotion} />
                              <SentimentBadge value={segment.sentiment} />
                            </div>
                            {segment.text && (
                              <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                                {segment.text}
                              </p>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="glass p-8 text-center">
                    <div className="mx-auto grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
                      <Activity />
                    </div>
                    <h3 className="mt-4 font-semibold">No timestamped segments available</h3>
                    <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
                      The selected model returned an overall prediction without segment timestamps.
                      Choose a model that provides per-segment results to see the emotion timeline.
                    </p>
                    <div className="mx-auto mt-5 flex max-w-md flex-wrap justify-center gap-2">
                      <EmotionBadge value={result.emotion} />
                      <SentimentBadge value={result.sentiment} />
                      <span className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground">
                        {result.confidence}% confidence
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {!analysis && (
          <footer className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-white/8 py-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Mic2 className="size-3.5" /> Audio emotion recognition
            </span>
            <span className="hidden size-1 rounded-full bg-muted-foreground/50 sm:block" />
            <span>Timestamped, segment-level insights when available</span>
            <span className="hidden size-1 rounded-full bg-muted-foreground/50 sm:block" />
            <span className="flex items-center gap-1.5">
              <Check className="size-3.5 text-primary" /> Built for careful listening
            </span>
          </footer>
        )}
      </div>
    </main>
  );
}
