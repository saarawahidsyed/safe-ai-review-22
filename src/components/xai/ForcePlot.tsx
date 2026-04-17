import { useState } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface ForceContribution {
  feature: string;
  value: string;
  shap: number;
}

interface Props {
  caseLabel: string;
  baseValue: number; // baseline prob (0..1)
  finalValue: number; // final prob (0..1)
  contributions: ForceContribution[];
}

export function ForcePlot({ caseLabel, baseValue, finalValue, contributions }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  // Stack contributions left-to-right starting from baseValue.
  // Total positive width pushes the final value up; negative pushes it down.
  const positives = contributions.filter((c) => c.shap > 0).sort((a, b) => b.shap - a.shap);
  const negatives = contributions.filter((c) => c.shap < 0).sort((a, b) => a.shap - b.shap);

  const sumPos = positives.reduce((s, c) => s + c.shap, 0);
  const sumNeg = Math.abs(negatives.reduce((s, c) => s + c.shap, 0));

  // Normalize visual: total bar width represents |sumPos| + |sumNeg| mapped to 100%.
  const total = sumPos + sumNeg || 1;
  const negWidthPct = (sumNeg / total) * 100;
  const posWidthPct = (sumPos / total) * 100;

  return (
    <Card className="p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Force Plot · {caseLabel}</h3>
          <p className="text-xs text-muted-foreground">
            How each feature pushes the prediction from baseline to final probability
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Final risk</div>
          <div className="text-2xl font-semibold text-primary tabular-nums">{(finalValue * 100).toFixed(1)}%</div>
        </div>
      </div>

      {/* Base / final indicators */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
        <span className="tabular-nums">Base value: {(baseValue * 100).toFixed(1)}%</span>
        <span className="tabular-nums">Final: {(finalValue * 100).toFixed(1)}%</span>
      </div>

      {/* Stacked force bar */}
      <div className="relative h-12 rounded-md overflow-hidden border border-border bg-muted/20">
        <div className="absolute inset-y-0 flex" style={{ width: `${negWidthPct}%`, left: 0 }}>
          {negatives.map((c, i) => {
            const pct = (Math.abs(c.shap) / sumNeg) * 100;
            return (
              <div
                key={c.feature}
                className={cn(
                  "h-full transition-opacity border-r border-background/50 cursor-pointer",
                  "bg-success/70 hover:bg-success/90",
                  hovered && hovered !== c.feature && "opacity-40",
                )}
                style={{ width: `${pct}%` }}
                onMouseEnter={() => setHovered(c.feature)}
                onMouseLeave={() => setHovered(null)}
                title={`${c.feature}: ${c.shap.toFixed(2)}`}
              />
            );
          })}
        </div>
        <div className="absolute inset-y-0 flex" style={{ width: `${posWidthPct}%`, left: `${negWidthPct}%` }}>
          {positives.map((c, i) => {
            const pct = (c.shap / sumPos) * 100;
            return (
              <div
                key={c.feature}
                className={cn(
                  "h-full transition-opacity border-r border-background/50 cursor-pointer",
                  "bg-destructive/70 hover:bg-destructive/90",
                  hovered && hovered !== c.feature && "opacity-40",
                )}
                style={{ width: `${pct}%` }}
                onMouseEnter={() => setHovered(c.feature)}
                onMouseLeave={() => setHovered(null)}
                title={`${c.feature}: +${c.shap.toFixed(2)}`}
              />
            );
          })}
        </div>
        {/* Divider between push directions */}
        <div className="absolute inset-y-0 w-px bg-foreground/40" style={{ left: `${negWidthPct}%` }} />
      </div>

      <div className="flex items-center justify-between mt-2 text-[11px]">
        <span className="text-success font-medium">← Protective</span>
        <span className="text-muted-foreground">Baseline ↕</span>
        <span className="text-destructive font-medium">Risk-driving →</span>
      </div>

      {/* Legend / detail list */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5">
        {[...positives, ...negatives].map((c) => {
          const positive = c.shap > 0;
          return (
            <div
              key={c.feature}
              onMouseEnter={() => setHovered(c.feature)}
              onMouseLeave={() => setHovered(null)}
              className={cn(
                "flex items-center justify-between gap-2 text-sm py-1 px-2 rounded transition-colors cursor-pointer",
                hovered === c.feature && "bg-muted/60",
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={cn("h-2 w-2 rounded-sm shrink-0", positive ? "bg-destructive/70" : "bg-success/70")} />
                <div className="min-w-0">
                  <div className="text-foreground font-medium truncate">{c.feature}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{c.value}</div>
                </div>
              </div>
              <span className={cn("text-xs tabular-nums font-medium shrink-0", positive ? "text-destructive" : "text-success")}>
                {positive ? "+" : ""}{c.shap.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
