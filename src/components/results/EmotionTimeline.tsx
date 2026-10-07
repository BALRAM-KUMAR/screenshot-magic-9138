import { useEffect, useState } from "react";
import { Clock3, Maximize2, Minimize2, Play } from "lucide-react";
import { EmotionBadge, SentimentBadge } from "@/components/models/ModelBits";
import { emotionColor } from "@/lib/models";
import { fmtTime } from "@/lib/analysis";

export interface TimelineSegment {
  start: number;
  end: number;
  emotion: string;
  sentiment: string;
  confidence: number;
  text?: string;
}

interface Props {
  segments: TimelineSegment[];
  emotions: string[];
  duration: number;
  activeSegment: number | null;
  onSelectSegment: (index: number) => void;
}

export function EmotionTimeline({
  segments,
  emotions,
  duration,
  activeSegment,
  onSelectSegment,
}: Props) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const chartDuration = Math.max(duration, ...segments.map((segment) => segment.end), 1);
  const selected = activeSegment === null ? undefined : segments[activeSegment];

  useEffect(() => {
    if (!isFullscreen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isFullscreen]);

  return (
    <section
      className={
        isFullscreen
          ? "fixed inset-3 z-50 overflow-y-auto rounded-xl border bg-background shadow-2xl sm:inset-6"
          : "glass overflow-hidden rounded-xl"
      }
      aria-label="Emotion timeline chart"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4">
        <div>
          <h3 className="font-semibold">Emotion timeline</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Emotion by time. Select a segment to play and inspect it.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs text-muted-foreground">
            <Clock3 className="size-3.5" /> {segments.length} moments
          </span>
          <button
            type="button"
            onClick={() => setIsFullscreen((open) => !open)}
            aria-label={isFullscreen ? "Exit full screen" : "View chart full screen"}
            aria-pressed={isFullscreen}
            className="grid size-8 place-items-center rounded-lg border text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
          >
            {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>
        </div>
      </header>

      <div className={isFullscreen ? "p-5 sm:p-8" : "p-5"}>
        <div className="space-y-1.5">
          {emotions.map((emotion) => (
            <div
              key={emotion}
              className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[7rem_minmax(0,1fr)]"
            >
              <span className="truncate text-right text-xs text-muted-foreground">{emotion}</span>
              <div className={`relative rounded-md bg-white/[0.025] ${isFullscreen ? "h-16" : "h-10"}`}>
                {[0, 25, 50, 75, 100].map((tick) => (
                  <span
                    key={tick}
                    aria-hidden="true"
                    className="absolute inset-y-0 border-l border-dashed border-white/[0.08]"
                    style={{ left: `${tick}%` }}
                  />
                ))}
                {segments.map((segment, index) => {
                  if (segment.emotion !== emotion) return null;
                  const left = Math.max(0, Math.min(100, (segment.start / chartDuration) * 100));
                  const right = Math.max(left + 0.8, Math.min(100, (segment.end / chartDuration) * 100));
                  return (
                    <button
                      key={`${segment.start}-${index}`}
                      type="button"
                      onClick={() => onSelectSegment(index)}
                      title={`${fmtTime(segment.start)}–${fmtTime(segment.end)} · ${emotion} · ${segment.confidence}% confidence`}
                      aria-label={`Segment ${index + 1}: ${fmtTime(segment.start)} to ${fmtTime(segment.end)}, ${emotion}, ${segment.confidence}% confidence`}
                      className={`absolute inset-y-2 rounded-sm transition hover:brightness-125 ${activeSegment === index ? "z-10 ring-2 ring-primary ring-offset-1 ring-offset-card" : ""}`}
                      style={{
                        left: `${left}%`,
                        width: `${Math.max(0.8, right - left)}%`,
                        background: emotionColor(emotion),
                        opacity: activeSegment === null || activeSegment === index ? 0.9 : 0.38,
                      }}
                    />
                  );
                })}
              </div>
            </div>
          ))}
          <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-2 pt-1 sm:grid-cols-[7rem_minmax(0,1fr)]">
            <span />
            <div className="relative h-5 font-mono text-[10px] text-muted-foreground">
              {[0, 25, 50, 75, 100].map((tick) => (
                <span key={tick} className="absolute -translate-x-1/2" style={{ left: `${tick}%` }}>
                  {fmtTime((chartDuration * tick) / 100)}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-white/8 bg-white/[0.025] p-4">
          {selected ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">
                  {fmtTime(selected.start)} – {fmtTime(selected.end)}
                </span>
                <EmotionBadge value={selected.emotion} />
                <SentimentBadge value={selected.sentiment} />
              </div>
              <p className="mt-3 text-sm">
                {selected.text ? `“${selected.text}”` : "No transcript text was returned for this segment."}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {selected.confidence}% model confidence
              </p>
            </>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Play className="size-3.5 text-primary" /> Select a segment to hear its audio and inspect the prediction.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
