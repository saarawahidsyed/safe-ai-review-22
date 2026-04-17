import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Sparkles } from "lucide-react";
import type { NarrativeToken } from "@/data/cases";
import { cn } from "@/lib/utils";

const tagLabel: Record<NonNullable<NarrativeToken["tag"]>, string> = {
  drug: "Drug exposure",
  event: "Adverse event term",
  temporal: "Temporal relationship",
  dose: "Dose / regimen",
  lab: "Clinical / lab finding",
};

function Token({ t }: { t: NarrativeToken }) {
  if (t.weight === undefined) return <span>{t.text}</span>;
  const positive = t.weight > 0;
  const intensity = Math.min(Math.abs(t.weight), 1);
  // Map intensity to bg opacity tier
  const tier = intensity > 0.75 ? "strong" : intensity > 0.45 ? "med" : "weak";
  const bgClass = positive
    ? tier === "strong"
      ? "bg-destructive/25 text-destructive-foreground/90 ring-destructive/40"
      : tier === "med"
      ? "bg-destructive/15 ring-destructive/25"
      : "bg-destructive/8 ring-destructive/15"
    : tier === "strong"
    ? "bg-success/25 ring-success/40"
    : tier === "med"
    ? "bg-success/15 ring-success/25"
    : "bg-success/8 ring-success/15";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "rounded px-0.5 py-0.5 ring-1 ring-inset cursor-help transition-colors",
            bgClass,
            positive ? "text-foreground" : "text-foreground",
          )}
        >
          {t.text}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-medium">{t.tag ? tagLabel[t.tag] : "Contributing factor"}</span>
            <span className={cn("tabular-nums font-mono", positive ? "text-destructive" : "text-success")}>
              {positive ? "+" : ""}{t.weight!.toFixed(2)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {positive ? "Increases predicted risk" : "Reduces predicted risk"} · contribution to AI signal
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

interface Props {
  narrative: NarrativeToken[];
  prediction: { label: string; confidence: number; topDrivers: string[] };
}

export function NarrativePanel({ narrative, prediction }: Props) {
  const [showHighlights, setShowHighlights] = useState(true);
  return (
    <Card className="p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Case Narrative · XAI Highlights
          </div>
          <h3 className="mt-1 text-base font-semibold text-foreground">{prediction.label}</h3>
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
          <span>Show highlights</span>
          <Switch checked={showHighlights} onCheckedChange={setShowHighlights} />
        </label>
      </div>

      <div className="rounded-lg border border-border bg-muted/20 p-4">
        <p className="text-sm leading-relaxed text-foreground">
          {narrative.map((t, i) =>
            showHighlights ? <Token key={i} t={t} /> : <span key={i}>{t.text}</span>
          )}
        </p>
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Top Drivers</h4>
          <span className="text-xs tabular-nums font-medium text-primary">{prediction.confidence}% confidence</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {prediction.topDrivers.map((d) => (
            <span key={d} className="inline-flex items-center gap-1 rounded-md bg-primary/10 text-primary text-xs px-2 py-0.5 font-medium">
              {d}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-destructive/60" /> Risk-increasing</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-success/60" /> Protective</span>
        </div>
        <span>Hover any phrase for contribution score</span>
      </div>
    </Card>
  );
}
