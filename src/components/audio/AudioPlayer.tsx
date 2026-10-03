import { FileAudio, Pause, Play, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Waveform } from "./Waveform";
import { fmtSize, fmtTime, type AudioMeta } from "@/lib/analysis";
import type { Player } from "@/hooks/use-player";

interface Props {
  audio: AudioMeta;
  player: Player;
  onRemove?: () => void;
  onReplace?: () => void;
  compact?: boolean;
}

export function AudioPlayer({ audio, player, onRemove, onReplace, compact }: Props) {
  return (
    <div className="glass flex items-center gap-4 p-4">
      <Button
        size="icon"
        className="size-11 shrink-0 rounded-full"
        onClick={player.toggle}
        aria-label={player.playing ? "Pause" : "Play"}
      >
        {player.playing ? <Pause className="size-4" /> : <Play className="size-4 translate-x-px" />}
      </Button>
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-center gap-3 text-sm">
          <FileAudio className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate font-medium">{audio.name}</span>
          <span className="ml-auto shrink-0 font-mono text-xs text-muted-foreground tabular">
            {fmtTime(player.current)} / {fmtTime(audio.duration)}
            {!compact && <> · {fmtSize(audio.size)}</>}
          </span>
        </div>
        <Waveform
          peaks={audio.peaks}
          height={compact ? 32 : 44}
          progress={player.current / (audio.duration || 1)}
          onSeek={(r) => player.seek(r * audio.duration)}
        />
        {!player.hasAudio && (
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Original audio isn't stored with saved analyses — playback is simulated.
          </p>
        )}
      </div>
      {(onReplace || onRemove) && (
        <div className="flex shrink-0 gap-1">
          {onReplace && (
            <Button variant="ghost" size="icon" onClick={onReplace} aria-label="Replace audio">
              <RefreshCw className="size-4" />
            </Button>
          )}
          {onRemove && (
            <Button variant="ghost" size="icon" onClick={onRemove} aria-label="Remove audio">
              <X className="size-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
