import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { getModel, modelColor, sentimentColor, emotionColor, type AIModel } from "@/lib/models";

export function ModelTag({ id, withName = true, className }: { id: string; withName?: boolean; className?: string }) {
  const m = getModel(id);
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        className="grid size-5 shrink-0 place-items-center rounded-md font-mono text-[10px] font-semibold text-primary-foreground"
        style={{ background: modelColor(id) }}
      >
        {m.short}
      </span>
      {withName && <span className="font-medium">{m.name}</span>}
    </span>
  );
}

export function SentimentBadge({ value, className }: { value: string; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", className)}
      style={{ color: sentimentColor(value), borderColor: `color-mix(in oklch, ${sentimentColor(value)} 35%, transparent)`, background: `color-mix(in oklch, ${sentimentColor(value)} 10%, transparent)` }}
    >
      <span className="size-1.5 rounded-full" style={{ background: sentimentColor(value) }} />
      {value}
    </span>
  );
}

export function EmotionBadge({ value, className }: { value: string; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium", className)}
    >
      <span className="size-1.5 rounded-full" style={{ background: emotionColor(value) }} />
      {value}
    </span>
  );
}

export function ConfidenceBar({ value, color = "var(--primary)" }: { value: number; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="font-mono text-xs tabular">{value}%</span>
    </div>
  );
}

export function ModelCard({ model, selected, onToggle }: { model: AIModel; selected: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={cn(
        "glass group relative flex flex-col gap-3 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-foreground/20",
        selected && "border-primary/60 bg-primary/5",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <ModelTag id={model.id} withName={false} />
        <span
          className={cn(
            "grid size-5 place-items-center rounded-md border transition-colors",
            selected ? "border-primary bg-primary text-primary-foreground" : "border-input",
          )}
        >
          {selected && <Check className="size-3.5" />}
        </span>
      </div>
      <div>
        <h3 className="text-base font-semibold">{model.name}</h3>
        <p className="font-mono text-[11px] text-muted-foreground">{model.provider}</p>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">{model.description}</p>
      <dl className="mt-auto grid grid-cols-2 gap-x-3 gap-y-2 border-t pt-3 text-xs">
        <div>
          <dt className="text-muted-foreground">Type</dt>
          <dd className="font-medium">{model.type}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Accuracy</dt>
          <dd className="font-mono font-medium tabular">
            {model.accuracy}% <span className="text-muted-foreground">{model.benchmark}</span>
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-muted-foreground">Outputs{model.languages && ` · ${model.languages} languages`}</dt>
          <dd className="font-medium">{model.outputs}</dd>
        </div>
      </dl>
    </button>
  );
}
