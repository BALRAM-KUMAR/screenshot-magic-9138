import { ArrowUpRight, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getModel, modelColor } from "@/lib/models";
import type { ModelResult } from "@/lib/analysis";
import { EmotionBadge, ModelTag, SentimentBadge } from "@/components/models/ModelBits";
import { Distribution } from "./Distribution";

export function ModelResultCard({ result, onOpen }: { result: ModelResult; onOpen: () => void }) {
  const m = getModel(result.modelId);
  return (
    <article className="glass fade-up relative overflow-hidden p-5">
      <span className="absolute inset-x-0 top-0 h-0.5" style={{ background: modelColor(m.id) }} />
      <header className="flex items-start justify-between gap-3">
        <div>
          <ModelTag id={m.id} />
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            {m.provider} · {m.type}
          </p>
        </div>
        <span className="flex items-center gap-1 font-mono text-xs text-muted-foreground tabular">
          <Timer className="size-3.5" /> {result.processingTime}s
        </span>
      </header>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <div>
          <p className="eyebrow">Sentiment</p>
          <SentimentBadge value={result.sentiment} className="mt-2" />
        </div>
        <div>
          <p className="eyebrow">Emotion</p>
          <EmotionBadge value={result.emotion} className="mt-2" />
        </div>
        <div>
          <p className="eyebrow">Confidence</p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular">{result.confidence}%</p>
        </div>
      </div>

      <div className="mt-5 grid gap-5 border-t pt-4 sm:grid-cols-2">
        <div>
          <p className="eyebrow mb-3">Emotion probabilities</p>
          <Distribution probs={result.emotionProbs} kind="emotion" />
        </div>
        <div>
          <p className="eyebrow mb-3">Sentiment probabilities</p>
          <Distribution probs={result.sentimentProbs} kind="sentiment" />
        </div>
      </div>

      <footer className="mt-5 flex items-center justify-between border-t pt-4 text-xs text-muted-foreground">
        <span className="font-mono">
          acc {m.accuracy}% · {m.benchmark} · {result.segments.length} segments
        </span>
        <Button variant="secondary" size="sm" onClick={onOpen}>
          View detailed result <ArrowUpRight />
        </Button>
      </footer>
    </article>
  );
}
