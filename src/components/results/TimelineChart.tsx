import { cn } from "@/lib/utils";
import { fmtTime, type SegmentPrediction } from "@/lib/analysis";
import { sentimentColor } from "@/lib/models";
import { EmotionBadge, SentimentBadge } from "@/components/models/ModelBits";

interface BarProps {
  segments: SegmentPrediction[];
  duration: number;
  current?: number;
  onSeek?: (t: number) => void;
  height?: string;
}

/** Horizontal colored band of sentiment segments with optional playhead. */
export function TimelineBand({ segments, duration, current, onSeek, height = "h-8" }: BarProps) {
  return (
    <div className={cn("relative flex w-full overflow-hidden rounded-md", height)}>
      {segments.map((s, i) => (
        <button
          key={i}
          type="button"
          title={`${fmtTime(s.start)} · ${s.sentiment} · ${s.emotion} · ${s.confidence}%`}
          onClick={() => onSeek?.(s.start)}
          className="h-full border-r border-background/70 transition-opacity last:border-0 hover:opacity-80"
          style={{
            width: `${((s.end - s.start) / duration) * 100}%`,
            background: sentimentColor(s.sentiment),
            opacity: 0.35 + (s.confidence / 100) * 0.55,
          }}
        />
      ))}
      {current !== undefined && (
        <span
          className="pointer-events-none absolute inset-y-0 w-0.5 bg-foreground shadow"
          style={{ left: `${(current / duration) * 100}%` }}
        />
      )}
    </div>
  );
}

export function TimelineChart({ segments, duration, current = 0, onSeek }: BarProps) {
  const active = segments.findIndex((s) => current >= s.start && current < s.end);
  return (
    <div className="space-y-4">
      <TimelineBand segments={segments} duration={duration} current={current} onSeek={onSeek} height="h-10" />
      <div className="flex justify-between font-mono text-[10px] text-muted-foreground">
        <span>00:00</span>
        <span>{fmtTime(duration / 2)}</span>
        <span>{fmtTime(duration)}</span>
      </div>
      <ol className="divide-y overflow-hidden rounded-xl border">
        {segments.map((s, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => onSeek?.(s.start)}
              className={cn(
                "grid w-full grid-cols-[72px_1fr_auto] items-center gap-4 px-4 py-3 text-left text-sm transition-colors hover:bg-accent/50",
                i === active && "bg-primary/8",
              )}
            >
              <span className={cn("font-mono text-xs tabular", i === active ? "text-primary" : "text-muted-foreground")}>
                {fmtTime(s.start)}
              </span>
              <span className="flex items-center gap-2">
                <SentimentBadge value={s.sentiment} />
                <span className="text-muted-foreground">→</span>
                <EmotionBadge value={s.emotion} />
              </span>
              <span className="font-mono text-xs tabular">{s.confidence}%</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
