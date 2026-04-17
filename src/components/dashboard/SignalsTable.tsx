import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface Signal {
  id: string;
  drug: string;
  event: string;
  confidence: number;
  severity: "Low" | "Moderate" | "High" | "Critical";
  cases: number;
  status: "New" | "Reviewing" | "Validated";
}

const severityStyle: Record<Signal["severity"], string> = {
  Low: "bg-muted text-muted-foreground",
  Moderate: "bg-warning/15 text-warning",
  High: "bg-destructive/15 text-destructive",
  Critical: "bg-destructive text-destructive-foreground",
};

interface Props {
  signals: Signal[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function SignalsTable({ signals, selectedId, onSelect }: Props) {
  return (
    <Card className="overflow-hidden shadow-[var(--shadow-card)]">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Active Safety Signals</h3>
          <p className="text-xs text-muted-foreground">AI-detected drug-event associations awaiting safety review</p>
        </div>
        <Badge variant="outline" className="font-normal">{signals.length} signals</Badge>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-5 py-3 font-medium">Drug</th>
              <th className="text-left px-5 py-3 font-medium">Adverse Event</th>
              <th className="text-left px-5 py-3 font-medium">Confidence</th>
              <th className="text-left px-5 py-3 font-medium">Severity</th>
              <th className="text-right px-5 py-3 font-medium">Cases</th>
              <th className="text-left px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {signals.map((s) => (
              <tr
                key={s.id}
                onClick={() => onSelect(s.id)}
                className={cn(
                  "border-t border-border cursor-pointer transition-colors hover:bg-muted/30",
                  selectedId === s.id && "bg-primary/5 hover:bg-primary/10"
                )}
              >
                <td className="px-5 py-3 font-medium text-foreground">{s.drug}</td>
                <td className="px-5 py-3 text-muted-foreground">{s.event}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${s.confidence}%` }} />
                    </div>
                    <span className="text-xs tabular-nums text-foreground">{s.confidence}%</span>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <span className={cn("inline-flex px-2 py-0.5 rounded-md text-xs font-medium", severityStyle[s.severity])}>
                    {s.severity}
                  </span>
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-foreground">{s.cases}</td>
                <td className="px-5 py-3">
                  <Badge variant="outline" className="font-normal">{s.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
