import { useRef, useState } from "react";
import { Mic, Square, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fmtTime } from "@/lib/analysis";
import { toast } from "sonner";

interface Props {
  onFile: (file: File) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

const ACCEPT = ".mp3,.wav,.m4a,.flac,.webm,audio/*";

export function AudioUploader({ onFile, inputRef }: Props) {
  const localRef = useRef<HTMLInputElement>(null);
  const ref = inputRef ?? localRef;
  const [over, setOver] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const recRef = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
        const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
        onFile(new File([blob], `recording_${stamp}.webm`, { type: blob.type }));
      };
      rec.start();
      recRef.current = rec;
      setRecording(true);
      setElapsed(0);
      timer.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } catch {
      toast.error("Microphone access was blocked. Allow it in your browser to record.");
    }
  };

  const stopRec = () => {
    recRef.current?.stop();
    if (timer.current) clearInterval(timer.current);
    setRecording(false);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.files[0];
        if (f) onFile(f);
      }}
      className={cn(
        "glass flex flex-col items-center justify-center gap-5 border-dashed px-6 py-14 text-center transition-all",
        over && "border-primary bg-primary/5",
      )}
    >
      <div className="grid size-14 place-items-center rounded-2xl border bg-secondary">
        {recording ? (
          <span className="size-3 animate-pulse rounded-full bg-destructive" />
        ) : (
          <UploadCloud className="size-6 text-primary" />
        )}
      </div>
      <div>
        <p className="text-lg font-medium">
          {recording ? `Recording… ${fmtTime(elapsed)}` : "Drop an audio file here"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">MP3, WAV, M4A, FLAC, WEBM · up to 50 MB</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={() => ref.current?.click()} disabled={recording}>
          <UploadCloud /> Upload file
        </Button>
        {recording ? (
          <Button variant="destructive" onClick={stopRec}>
            <Square /> Stop recording
          </Button>
        ) : (
          <Button variant="secondary" onClick={startRec}>
            <Mic /> Record audio
          </Button>
        )}
      </div>
      <input
        ref={ref}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
