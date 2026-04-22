import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { MeddraEvent } from "@/data/cases";
import { cn } from "@/lib/utils";
import { TruncatedText } from "@/components/ui/truncated-cell";

const sevColor: Record<MeddraEvent["severity"], string> = {
  Mild: "bg-muted text-muted-foreground",
  Moderate: "bg-warning/15 text-warning",
  Severe: "bg-destructive/15 text-destructive",
  "Life-threatening": "bg-destructive text-destructive-foreground",
};

const causalityColor: Record<MeddraEvent["causality"], string> = {
  Certain: "bg-destructive/15 text-destructive",
  Probable: "bg-primary/15 text-primary",
  Possible: "bg-accent/15 text-accent",
  Unlikely: "bg-muted text-muted-foreground",
};

export function MeddraTable({ events }: { events: MeddraEvent[] }) {
  return (
    <Card className="overflow-hidden shadow-[var(--shadow-card)]">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">MedDRA-Coded Adverse Events</h3>
        <p className="text-xs text-muted-foreground">Standardized terms (PT / SOC) with severity and causality</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-5 py-3 font-medium">Preferred Term (PT)</th>
              <th className="text-left px-5 py-3 font-medium">System Organ Class (SOC)</th>
              <th className="text-left px-5 py-3 font-medium">Severity</th>
              <th className="text-left px-5 py-3 font-medium">Causality</th>
              <th className="text-left px-5 py-3 font-medium">Outcome</th>
              <th className="text-right px-5 py-3 font-medium">Onset (days)</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e, i) => (
              <tr key={`${e.pt}-${i}`} className="border-t border-border">
                <td className="px-5 py-3">
                  <div className="font-medium text-foreground">{e.pt}</div>
                  {e.llt && <div className="text-xs text-muted-foreground">LLT: {e.llt}</div>}
                </td>
                <td className="px-5 py-3 text-muted-foreground">{e.soc}</td>
                <td className="px-5 py-3">
                  <span className={cn("inline-flex px-2 py-0.5 rounded-md text-xs font-medium", sevColor[e.severity])}>
                    {e.severity}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className={cn("inline-flex px-2 py-0.5 rounded-md text-xs font-medium", causalityColor[e.causality])}>
                    {e.causality}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <Badge variant="outline" className="font-normal">{e.outcome}</Badge>
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-foreground">{e.onsetDays}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
