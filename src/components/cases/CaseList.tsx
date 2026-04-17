import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ICSRCase } from "@/data/cases";

interface Props {
  cases: ICSRCase[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function CaseList({ cases, selectedId, onSelect }: Props) {
  return (
    <Card className="shadow-[var(--shadow-card)] overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">ICSR Queue</h3>
        <p className="text-xs text-muted-foreground">{cases.length} cases pending review</p>
      </div>
      <div className="divide-y divide-border max-h-[640px] overflow-y-auto">
        {cases.map((c) => {
          const active = c.id === selectedId;
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={cn(
                "w-full text-left px-4 py-3 transition-colors hover:bg-muted/40",
                active && "bg-primary/5 border-l-2 border-l-primary",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono text-muted-foreground">{c.id}</span>
                <Badge variant="outline" className="font-normal text-[10px] py-0 h-4">
                  {c.aiPrediction.confidence}%
                </Badge>
              </div>
              <div className="mt-1 text-sm font-medium text-foreground truncate">{c.suspectDrug.name}</div>
              <div className="text-xs text-muted-foreground truncate">{c.events[0].pt}</div>
              <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                <span>{c.patient.sex}, {c.patient.age}y</span>
                <span>·</span>
                <span>{c.reporter.country}</span>
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
