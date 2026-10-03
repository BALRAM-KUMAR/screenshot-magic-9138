import { cn } from "@/lib/utils";
import { fmtTime, type SegmentPrediction, type TranscriptLine } from "@/lib/analysis";
import { EmotionBadge, SentimentBadge } from "@/components/models/ModelBits";

interface Props {
  lines: TranscriptLine[];
  segments: SegmentPrediction[];
  current?: number;
  onSeek?: (t: number) => void;
}

export function TranscriptViewer({ lines, segments, current = -1, onSeek }: Props) {
  return (
    <div className="space-y-1">
      {lines.map((l, i) => {
        const seg = segments[i];
        const active = current >= l.start && current < (lines[i + 1]?.start ?? Infinity);
        return (
          <button
            type="button"
            key={i}
            onClick={() => onSeek?.(l.start)}
            className={cn(
              "grid w-full grid-cols-[64px_1fr] gap-4 rounded-lg px-3 py-3 text-left transition-colors hover:bg-accent/40",
              active && "bg-primary/8",
            )}
          >
            <span className={cn("pt-0.5 font-mono text-xs tabular", active ? "text-primary" : "text-muted-foreground")}>
              {fmtTime(l.start)}
            </span>
            <span className="space-y-2">
              <span className="block text-[15px] leading-relaxed">“{l.text}”</span>
              {seg && (
                <span className="flex flex-wrap items-center gap-2">
                  <SentimentBadge value={seg.sentiment} />
                  <EmotionBadge value={seg.emotion} />
                  <span className="font-mono text-xs text-muted-foreground tabular">{seg.confidence}%</span>
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
