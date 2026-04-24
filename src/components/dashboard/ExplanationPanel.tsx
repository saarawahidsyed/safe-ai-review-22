import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, Check, X, Ban, Download } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FeatureContribution {
  feature: string;
  value: string;
  shap: number; // -1 .. 1
}

interface Props {
  drug: string;
  event: string;
  confidence: number;
  features: FeatureContribution[];
  rationale: string;
  status?: string;
  onValidate?: () => void;
  onReject?: () => void;
  onDismiss?: () => void;
  onExport?: () => void;
}

export function ExplanationPanel({ drug, event, confidence, features, rationale, status, onValidate, onReject, onDismiss, onExport }: Props) {
  const max = Math.max(...features.map((f) => Math.abs(f.shap)));
  return (
    <Card className="p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <Brain className="h-3.5 w-3.5" />
            Model Explanation (SHAP)
          </div>
          <h3 className="mt-1 text-base font-semibold text-foreground">
            {drug} <span className="text-muted-foreground font-normal">→</span> {event}
          </h3>
        </div>
        <Badge className="bg-primary/10 text-primary hover:bg-primary/15 border-0">
          {confidence}% confidence
        </Badge>
      </div>

      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{rationale}</p>

      <div className="mt-5">
        <div className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground mb-3">
          <span>Feature Contribution</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-destructive" /> Risk</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-success" /> Protective</span>
          </div>
        </div>

        <div className="space-y-2.5">
          {features.map((f) => {
            const pct = (Math.abs(f.shap) / max) * 50;
            const positive = f.shap > 0;
            return (
              <div key={f.feature} className="grid grid-cols-[1fr_2fr_auto] items-center gap-3 text-sm">
                <div className="min-w-0">
                  <div className="font-medium text-foreground truncate">{f.feature}</div>
                  <div className="text-xs text-muted-foreground truncate">{f.value}</div>
                </div>
                <div className="relative h-6 bg-muted/50 rounded">
                  <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
                  <div
                    className={cn(
                      "absolute inset-y-1 rounded-sm",
                      positive ? "bg-destructive/80 left-1/2" : "bg-success/80 right-1/2"
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className={cn("text-xs tabular-nums font-medium w-12 text-right", positive ? "text-destructive" : "text-success")}>
                  {positive ? "+" : ""}{f.shap.toFixed(2)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2 pt-4 border-t border-border">
        <Button
          size="sm"
          className="gap-1.5"
          onClick={onValidate}
          disabled={!onValidate || status === "Validated"}
        >
          <Check className="h-3.5 w-3.5" /> {status === "Validated" ? "Validated" : "Validate Signal"}
        </Button>
        <Button
          size="sm"
          variant="destructive"
          className="gap-1.5"
          onClick={onReject}
          disabled={!onReject || status === "Rejected"}
        >
          <Ban className="h-3.5 w-3.5" /> Reject Signal
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={onDismiss}
          disabled={!onDismiss || status === "Dismissed"}
        >
          <X className="h-3.5 w-3.5" /> Dismiss
        </Button>
        <Button size="sm" variant="ghost" className="ml-auto gap-1.5" onClick={onExport} disabled={!onExport}>
          <Download className="h-3.5 w-3.5" /> Export Report
        </Button>
      </div>
    </Card>
  );
}
