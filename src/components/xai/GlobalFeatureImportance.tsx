import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface GlobalFeature {
  feature: string;
  category: "Patient" | "Drug" | "Lab" | "Temporal" | "Co-medication";
  importance: number; // 0..1
  direction: number; // -1..1, mean SHAP across population
}

const catColor: Record<GlobalFeature["category"], string> = {
  Patient: "bg-primary/15 text-primary",
  Drug: "bg-accent/15 text-accent",
  Lab: "bg-warning/15 text-warning",
  Temporal: "bg-success/15 text-success",
  "Co-medication": "bg-destructive/15 text-destructive",
};

export function GlobalFeatureImportance({ features }: { features: GlobalFeature[] }) {
  const sorted = [...features].sort((a, b) => b.importance - a.importance);
  const max = sorted[0]?.importance ?? 1;

  return (
    <Card className="p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Global Feature Importance</h3>
          <p className="text-xs text-muted-foreground">Mean |SHAP value| across 12,847 predictions · last 30 days</p>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-destructive/70" /> Risk-driving</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-success/70" /> Protective</span>
        </div>
      </div>
      <div className="space-y-2">
        {sorted.map((f) => {
          const widthPct = (f.importance / max) * 100;
          const positive = f.direction > 0;
          return (
            <div key={f.feature} className="grid grid-cols-[200px_1fr_auto] items-center gap-3 text-sm">
              <div className="min-w-0">
                <div className="font-medium text-foreground truncate">{f.feature}</div>
                <span className={cn("inline-flex text-[10px] px-1.5 py-0 rounded uppercase tracking-wider mt-0.5", catColor[f.category])}>
                  {f.category}
                </span>
              </div>
              <div className="relative h-7 bg-muted/40 rounded overflow-hidden">
                <div
                  className={cn("h-full rounded transition-all", positive ? "bg-destructive/70" : "bg-success/70")}
                  style={{ width: `${widthPct}%` }}
                />
                <span className="absolute inset-y-0 left-2 flex items-center text-[11px] text-foreground/80 tabular-nums font-medium">
                  {f.importance.toFixed(3)}
                </span>
              </div>
              <div className={cn("text-xs tabular-nums w-14 text-right font-medium", positive ? "text-destructive" : "text-success")}>
                {positive ? "+" : ""}{f.direction.toFixed(2)}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
