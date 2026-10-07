import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, AudioLines, Clock3, History, LoaderCircle } from "lucide-react";
import { EmotionTimeline, type TimelineSegment } from "@/components/results/EmotionTimeline";
import { Button } from "@/components/ui/button";
import { getAnalysisDetails, getAnalysisHistory, getAudioFileUrl } from "@/lib/api";
import { fmtTime } from "@/lib/analysis";

export const Route = createFileRoute("/history")({ component: HistoryPage });

type HistoryItem = {
  id: string;
  status: string;
  started_at: string;
  completed_at?: string | null;
  audio: { id: string; filename: string; duration?: number | null };
};

function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [analysis, setAnalysis] = useState<any>(null);
  const [selectedModelId, setSelectedModelId] = useState("");
  const [activeSegment, setActiveSegment] = useState<number | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [error, setError] = useState("");
  const audioRef = useRef<HTMLAudioElement>(null);
  const stopPlaybackRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    getAnalysisHistory()
      .then((data) => {
        const history = Array.isArray(data) ? data : [];
        setItems(history);
        if (history[0]) setSelectedId(history[0].id);
      })
      .catch((err) => setError(err?.message || "Could not load analysis history"))
      .finally(() => setLoadingList(false));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoadingAnalysis(true);
    setAnalysis(null);
    setActiveSegment(null);
    getAnalysisDetails(selectedId)
      .then((data) => {
        setAnalysis(data);
        setSelectedModelId(data.predictions?.[0]?.model_id ?? "");
      })
      .catch((err) => setError(err?.message || "Could not load this analysis"))
      .finally(() => setLoadingAnalysis(false));
  }, [selectedId]);

  const predictions = analysis?.predictions ?? [];
  const selectedPrediction = predictions.find(
    (prediction: any) => prediction.model_id === selectedModelId,
  );
  const segments: TimelineSegment[] = useMemo(() => {
    if (!analysis || !selectedModelId) return [];
    const timeline = Array.isArray(analysis.timeline) ? analysis.timeline : [];
    const matches = timeline.filter(
      (segment: any) => String(segment.model_id).toLowerCase() === selectedModelId.toLowerCase(),
    );
    const rows = matches.length || predictions.length > 1 ? matches : timeline;
    return rows.map((segment: any) => {
      const transcript = segment.transcript_text ?? segment.text;
      return {
        start: Number(segment.start_time ?? segment.start ?? 0),
        end: Number(segment.end_time ?? segment.end ?? 0),
        emotion: segment.emotion || "Unknown",
        sentiment: segment.sentiment || "Neutral",
        confidence: Math.round(Number(segment.confidence ?? 0) * (Number(segment.confidence ?? 0) <= 1 ? 100 : 1)),
        ...(transcript ? { text: transcript } : {}),
      };
    });
  }, [analysis, selectedModelId, predictions]);
  const emotions = [...new Set(segments.map((segment) => segment.emotion))];
  const selectedItem = items.find((item) => item.id === selectedId);

  const playSegment = (index: number) => {
    const audio = audioRef.current;
    const segment = segments[index];
    setActiveSegment(index);
    if (!audio || !segment) return;
    stopPlaybackRef.current?.();
    audio.currentTime = Math.max(0, segment.start);
    const stopAtEnd = () => {
      if (audio.currentTime < segment.end) return;
      audio.pause();
      audio.removeEventListener("timeupdate", stopAtEnd);
      stopPlaybackRef.current = null;
    };
    if (segment.end > segment.start) {
      audio.addEventListener("timeupdate", stopAtEnd);
      stopPlaybackRef.current = () => audio.removeEventListener("timeupdate", stopAtEnd);
    }
    void audio.play().catch(() => undefined);
  };

  return (
    <main className="min-h-screen pb-16">
      <header className="sticky top-0 z-30 border-b border-white/8 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link to="/" className="flex items-center gap-3 font-semibold tracking-tight">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <AudioLines className="size-5" />
            </span>
            AudioSense <span className="text-muted-foreground">AI</span>
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1 inline size-4" /> Dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <div className="mb-7">
          <p className="eyebrow">Your workspace</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Analysis history</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Reopen a previous run, review its emotion timeline, and audition individual moments.
          </p>
        </div>

        {error && (
          <div role="alert" className="mb-5 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid items-start gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="glass overflow-hidden rounded-xl">
            <div className="border-b border-white/8 px-4 py-3">
              <h2 className="text-sm font-medium">Previous runs</h2>
            </div>
            <div className="max-h-[70vh] divide-y divide-white/5 overflow-auto">
              {loadingList ? (
                <div className="flex items-center gap-2 p-5 text-sm text-muted-foreground">
                  <LoaderCircle className="size-4 animate-spin" /> Loading history…
                </div>
              ) : items.length ? (
                items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setError("");
                      setSelectedId(item.id);
                    }}
                    className={`w-full p-4 text-left transition hover:bg-white/[0.035] ${selectedId === item.id ? "bg-primary/[0.07]" : ""}`}
                  >
                    <span className="block truncate text-sm font-medium">{item.audio.filename}</span>
                    <span className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock3 className="size-3" />
                      {new Date(item.started_at).toLocaleString()}
                    </span>
                    <span className="mt-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {item.status}
                    </span>
                  </button>
                ))
              ) : (
                <div className="p-6 text-center">
                  <History className="mx-auto size-6 text-muted-foreground" />
                  <p className="mt-3 text-sm font-medium">No analyses yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">Completed runs will appear here.</p>
                  <Button asChild variant="outline" className="mt-4">
                    <Link to="/">Analyze audio</Link>
                  </Button>
                </div>
              )}
            </div>
          </aside>

          <section className="space-y-5">
            {loadingAnalysis ? (
              <div className="glass flex items-center gap-3 rounded-xl p-8 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" /> Loading analysis…
              </div>
            ) : analysis && selectedItem ? (
              <>
                <div className="glass rounded-xl p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="eyebrow">Previous analysis</p>
                      <h2 className="mt-1 truncate text-lg font-semibold">{selectedItem.audio.filename}</h2>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(selectedItem.started_at).toLocaleString()}
                        {selectedItem.audio.duration ? ` · ${fmtTime(selectedItem.audio.duration)}` : ""}
                      </p>
                    </div>
                    {predictions.length > 0 && (
                      <label className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm">
                        <span className="text-muted-foreground">Model</span>
                        <select
                          className="max-w-48 bg-transparent font-medium outline-none"
                          value={selectedModelId}
                          onChange={(event) => {
                            setSelectedModelId(event.target.value);
                            setActiveSegment(null);
                          }}
                          aria-label="Choose model timeline"
                        >
                          {predictions.map((prediction: any) => (
                            <option key={prediction.model_id} value={prediction.model_id}>
                              {analysis.models?.find((model: any) => model.id === prediction.model_id)?.name ?? prediction.model_id}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                  <audio
                    ref={audioRef}
                    className="mt-4 h-9 w-full"
                    controls
                    preload="metadata"
                    src={getAudioFileUrl(selectedItem.audio.id)}
                  />
                </div>

                {segments.length ? (
                  <EmotionTimeline
                    segments={segments}
                    emotions={emotions}
                    duration={selectedItem.audio.duration ?? 0}
                    activeSegment={activeSegment}
                    onSelectSegment={playSegment}
                  />
                ) : (
                  <div className="glass rounded-xl p-8 text-center">
                    <h3 className="font-semibold">No timeline for this run</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      This model returned an overall result without timestamped segments.
                    </p>
                    {selectedPrediction && (
                      <p className="mt-4 text-sm">
                        {selectedPrediction.emotion ?? selectedPrediction.sentiment ?? "Analysis complete"}
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : !items.length && !loadingList ? null : null}
          </section>
        </div>
      </div>
    </main>
  );
}
