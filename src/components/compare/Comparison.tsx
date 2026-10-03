import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SENTIMENTS, getModel, modelColor } from "@/lib/models";
import type { ModelResult } from "@/lib/analysis";
import { ConfidenceBar, EmotionBadge, ModelTag, SentimentBadge } from "@/components/models/ModelBits";

export function ComparisonTable({ results }: { results: ModelResult[] }) {
  const fastest = Math.min(...results.map((r) => r.processingTime));
  const rows: { label: string; render: (r: ModelResult) => React.ReactNode }[] = [
    { label: "Sentiment", render: (r) => <SentimentBadge value={r.sentiment} /> },
    { label: "Emotion", render: (r) => <EmotionBadge value={r.emotion} /> },
    { label: "Confidence", render: (r) => <ConfidenceBar value={r.confidence} color={modelColor(r.modelId)} /> },
    {
      label: "Processing time",
      render: (r) => (
        <span className="font-mono text-sm tabular">
          {r.processingTime}s
          {r.processingTime !== fastest && (
            <span className="ml-1.5 text-xs text-muted-foreground">+{(r.processingTime - fastest).toFixed(1)}s</span>
          )}
        </span>
      ),
    },
    { label: "Benchmark accuracy", render: (r) => <span className="font-mono text-sm tabular">{getModel(r.modelId).accuracy}%</span> },
    { label: "Type", render: (r) => <span className="text-sm">{getModel(r.modelId).type}</span> },
  ];
  return (
    <div className="glass overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="eyebrow px-5 py-4 text-left font-normal">Metric</th>
            {results.map((r) => (
              <th key={r.modelId} className="px-5 py-4 text-left">
                <ModelTag id={r.modelId} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b last:border-0">
              <td className="px-5 py-3.5 text-muted-foreground">{row.label}</td>
              {results.map((r) => (
                <td key={r.modelId} className="px-5 py-3.5">
                  {row.render(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ComparisonChart({ results }: { results: ModelResult[] }) {
  const data = SENTIMENTS.map((s) => {
    const row: Record<string, string | number> = { sentiment: s };
    results.forEach((r) => (row[r.modelId] = r.sentimentProbs[s]));
    return row;
  });
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <BarChart data={data} barGap={4} barCategoryGap="22%">
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="sentiment" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
          <YAxis tickLine={false} axisLine={false} unit="%" width={40} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
          <Tooltip
            cursor={{ fill: "var(--accent)", opacity: 0.4 }}
            contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }}
            formatter={(v: number, k: string) => [`${v}%`, getModel(k).name]}
          />
          {results.map((r) => (
            <Bar key={r.modelId} dataKey={r.modelId} fill={modelColor(r.modelId)} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
