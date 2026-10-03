import { cn } from "@/lib/utils";

interface Props {
  peaks: number[];
  progress?: number;
  height?: number;
  onSeek?: (ratio: number) => void;
  className?: string;
  animated?: boolean;
}

export function Waveform({ peaks, progress = 0, height = 56, onSeek, className, animated }: Props) {
  return (
    <div
      className={cn("relative flex w-full items-center gap-[2px]", onSeek && "cursor-pointer", className)}
      style={{ height }}
      onClick={(e) => {
        if (!onSeek) return;
        const rect = e.currentTarget.getBoundingClientRect();
        onSeek((e.clientX - rect.left) / rect.width);
      }}
    >
      {peaks.map((p, i) => {
        const played = i / peaks.length < progress;
        return (
          <span
            key={i}
            className={cn(
              "flex-1 rounded-full transition-colors",
              played ? "bg-primary" : "bg-muted-foreground/30",
              animated && "animate-pulse",
            )}
            style={{ height: `${Math.max(6, p * 100)}%`, animationDelay: animated ? `${(i % 20) * 60}ms` : undefined }}
          />
        );
      })}
    </div>
  );
}
