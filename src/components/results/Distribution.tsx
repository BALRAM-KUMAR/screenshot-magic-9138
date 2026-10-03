import { emotionColor, sentimentColor } from "@/lib/models";

export function Distribution({
  probs,
  kind,
}: {
  probs: Record<string, number>;
  kind: "emotion" | "sentiment";
}) {
  const rows = Object.entries(probs).sort((a, b) => b[1] - a[1]);
  return (
    <div className="space-y-2">
      {rows.map(([label, v]) => {
        const color = kind === "emotion" ? emotionColor(label) : sentimentColor(label);
        return (
          <div key={label} className="grid grid-cols-[84px_1fr_48px] items-center gap-3 text-xs">
            <span className="text-muted-foreground">{label}</span>
            <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${v}%`, background: color }} />
            </div>
            <span className="text-right font-mono tabular">{v.toFixed(1)}%</span>
          </div>
        );
      })}
    </div>
  );
}

/** Single stacked bar of a distribution, used in compact comparison rows. */
export function StackedBar({ probs, kind }: { probs: Record<string, number>; kind: "emotion" | "sentiment" }) {
  const rows = Object.entries(probs).sort((a, b) => b[1] - a[1]);
  return (
    <div className="flex h-3 w-full overflow-hidden rounded-full bg-secondary">
      {rows.map(([label, v]) => (
        <div
          key={label}
          title={`${label} ${v}%`}
          style={{ width: `${v}%`, background: kind === "emotion" ? emotionColor(label) : sentimentColor(label) }}
          className="h-full border-r border-background/60 last:border-0"
        />
      ))}
    </div>
  );
}
