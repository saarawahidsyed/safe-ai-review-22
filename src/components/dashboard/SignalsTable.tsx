import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowUpDown, ArrowUp, ArrowDown, Info } from "lucide-react";
import { useMemo, useState } from "react";

export type SignalStatus = "New" | "Reviewing" | "Validated" | "new" | "updated" | "resolved";

export interface Signal {
  id: string;
  drug: string;
  event: string;
  confidence: number;
  severity: "Low" | "Moderate" | "High" | "Critical";
  cases: number;
  status: SignalStatus;
  detection?: "ai" | "statistical";
  prr?: number;
  ror?: number;
  ic?: number;
  ic_lower?: number;
}

const severityStyle: Record<Signal["severity"], string> = {
  Low: "bg-muted text-muted-foreground",
  Moderate: "bg-warning/15 text-warning",
  High: "bg-destructive/15 text-destructive",
  Critical: "bg-destructive text-destructive-foreground",
};

const statusStyle: Record<string, string> = {
  new: "bg-primary/15 text-primary border-primary/30",
  updated: "bg-warning/15 text-warning border-warning/30",
  resolved: "bg-muted text-muted-foreground border-border",
};

interface Props {
  signals: Signal[];
  selectedId: string;
  onSelect: (id: string) => void;
}

type SortKey = "drug" | "event" | "confidence" | "cases" | "prr" | "ror" | "ic" | "status";
type SortDir = "asc" | "desc";

function HeaderCell({
  label, tip, sortKey, currentKey, currentDir, onSort, align = "left",
}: {
  label: string; tip?: string; sortKey: SortKey; currentKey: SortKey; currentDir: SortDir;
  onSort: (k: SortKey) => void; align?: "left" | "right";
}) {
  const active = currentKey === sortKey;
  const Icon = !active ? ArrowUpDown : currentDir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th className={cn("px-5 py-3 font-medium select-none", align === "right" ? "text-right" : "text-left")}>
      <div className={cn("inline-flex items-center gap-1", align === "right" && "justify-end")}>
        <button
          type="button"
          onClick={() => onSort(sortKey)}
          className={cn("inline-flex items-center gap-1 hover:text-foreground transition-colors", active && "text-foreground")}
        >
          {label}
          <Icon className="h-3 w-3 opacity-60" />
        </button>
        {tip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" aria-label={`About ${label}`} className="text-muted-foreground hover:text-foreground">
                <Info className="h-3 w-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">{tip}</TooltipContent>
          </Tooltip>
        )}
      </div>
    </th>
  );
}

export function SignalsTable({ signals, selectedId, onSelect }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("confidence");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const onSort = (k: SortKey) => {
    if (k === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir(k === "drug" || k === "event" || k === "status" ? "asc" : "desc"); }
  };

  const sorted = useMemo(() => {
    const arr = [...signals];
    arr.sort((a, b) => {
      const av: any = (a as any)[sortKey] ?? (sortKey === "prr" || sortKey === "ror" || sortKey === "ic" ? -Infinity : "");
      const bv: any = (b as any)[sortKey] ?? (sortKey === "prr" || sortKey === "ror" || sortKey === "ic" ? -Infinity : "");
      if (typeof av === "number" && typeof bv === "number") return sortDir === "asc" ? av - bv : bv - av;
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return arr;
  }, [signals, sortKey, sortDir]);

  return (
    <TooltipProvider delayDuration={150}>
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
              <HeaderCell label="Drug" sortKey="drug" currentKey={sortKey} currentDir={sortDir} onSort={onSort} />
              <HeaderCell label="Adverse Event" sortKey="event" currentKey={sortKey} currentDir={sortDir} onSort={onSort} />
              <HeaderCell label="Confidence" sortKey="confidence" currentKey={sortKey} currentDir={sortDir} onSort={onSort}
                tip="Model confidence (0–100). Combines disproportionality strength with case volume." />
              <HeaderCell label="PRR" sortKey="prr" currentKey={sortKey} currentDir={sortDir} onSort={onSort} align="right"
                tip="Proportional Reporting Ratio. Compares the proportion of an event reported for a drug vs. all other drugs. PRR ≥ 2 with χ² ≥ 4 and ≥ 3 cases is a common signal threshold (MHRA)." />
              <HeaderCell label="ROR" sortKey="ror" currentKey={sortKey} currentDir={sortDir} onSort={onSort} align="right"
                tip="Reporting Odds Ratio. Odds of an event for the drug vs. odds for all other drugs. ROR > 1 (and lower 95% CI > 1) suggests disproportionate reporting." />
              <HeaderCell label="IC" sortKey="ic" currentKey={sortKey} currentDir={sortDir} onSort={onSort} align="right"
                tip="Information Component (BCPNN, Bate et al.). Bayesian disproportionality on a log₂ scale. IC > 0 indicates the pair is reported more often than expected; IC₀₂₅ (lower 95%) > 0 is a stronger signal." />
              <HeaderCell label="Cases" sortKey="cases" currentKey={sortKey} currentDir={sortDir} onSort={onSort} align="right" />
              <HeaderCell label="Status" sortKey="status" currentKey={sortKey} currentDir={sortDir} onSort={onSort} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((s) => (
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
                <td className="px-5 py-3 text-right tabular-nums">
                  {typeof s.prr === "number" ? (
                    <span className={cn(s.prr >= 2 ? "text-foreground font-medium" : "text-muted-foreground")}>{s.prr.toFixed(2)}</span>
                  ) : <span className="text-muted-foreground/60">—</span>}
                </td>
                <td className="px-5 py-3 text-right tabular-nums">
                  {typeof s.ror === "number" ? (
                    <span className={cn(s.ror >= 2 ? "text-foreground font-medium" : "text-muted-foreground")}>{s.ror.toFixed(2)}</span>
                  ) : <span className="text-muted-foreground/60">—</span>}
                </td>
                <td className="px-5 py-3 text-right tabular-nums">
                  {typeof s.ic === "number" ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className={cn(s.ic > 0 ? "text-foreground font-medium" : "text-muted-foreground")}>
                          {s.ic.toFixed(2)}
                        </span>
                      </TooltipTrigger>
                      {typeof s.ic_lower === "number" && (
                        <TooltipContent className="text-xs">IC₀₂₅ (lower 95% CI): {s.ic_lower.toFixed(2)}</TooltipContent>
                      )}
                    </Tooltip>
                  ) : <span className="text-muted-foreground/60">—</span>}
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-foreground">{s.cases}</td>
                <td className="px-5 py-3">
                  <Badge
                    variant="outline"
                    className={cn("font-normal capitalize", statusStyle[s.status as string])}
                  >
                    {s.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
    </TooltipProvider>
  );
}
