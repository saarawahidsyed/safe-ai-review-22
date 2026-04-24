import { useEffect, useMemo, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, AlertTriangle, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { TruncatedCell } from "@/components/ui/truncated-cell";
import { Button } from "@/components/ui/button";
import { downloadPdfReport } from "@/lib/pdfExport";
import { toast } from "@/hooks/use-toast";

interface AggEvent {
  term: string;
  soc: string | null;
  count: number;
  drugs: Set<string>;
  serious: number;
}

const Events = () => {
  const [events, setEvents] = useState<AggEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("cases")
        .select("case_ref, suspect_drug, events, seriousness");
      const map = new Map<string, AggEvent>();
      for (const c of data ?? []) {
        const drug = (c.suspect_drug as any)?.name ?? (c.suspect_drug as any)?.drug ?? "Unknown";
        const isSerious = Array.isArray(c.seriousness) && c.seriousness.length > 0;
        for (const ev of (c.events as any[]) ?? []) {
          const term = ev?.term ?? ev?.pt ?? ev?.event;
          if (!term) continue;
          const soc = ev?.soc ?? null;
          const cur = map.get(term) ?? { term, soc, count: 0, drugs: new Set(), serious: 0 };
          cur.count += 1;
          cur.drugs.add(drug);
          if (isSerious) cur.serious += 1;
          map.set(term, cur);
        }
      }
      setEvents(Array.from(map.values()).sort((a, b) => b.count - a.count));
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(
    () => events.filter((e) => !q || e.term.toLowerCase().includes(q.toLowerCase()) || (e.soc ?? "").toLowerCase().includes(q.toLowerCase())),
    [events, q]
  );

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[var(--gradient-subtle)]">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b border-border bg-card/80 backdrop-blur sticky top-0 z-10 flex items-center px-3 sm:px-4 gap-2 sm:gap-3">
            <SidebarTrigger />
            <div className="flex-1 min-w-0 max-w-md relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search MedDRA term or SOC…" className="pl-9 h-9 bg-muted/40 border-transparent" />
            </div>
            <div className="h-8 w-8 rounded-full bg-[var(--gradient-primary)] grid place-items-center text-primary-foreground text-xs font-semibold shrink-0">
              DR
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 space-y-4 overflow-x-hidden">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Adverse Events</p>
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                <div>
                  <h1 className="text-xl sm:text-2xl font-semibold text-foreground mt-1">MedDRA Event Catalog</h1>
                  <p className="text-sm text-muted-foreground mt-1">Aggregated events across all ICSR cases.</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 w-full sm:w-auto"
                  disabled={filtered.length === 0}
                  onClick={() => {
                    downloadPdfReport({
                      title: "Adverse Event Catalog",
                      subtitle: "MedDRA preferred-term aggregation across ICSR cases",
                      filename: `event-catalog-${new Date().toISOString().slice(0, 10)}.pdf`,
                      meta: {
                        Generated: new Date().toLocaleString(),
                        Events: filtered.length,
                        "Search filter": q || "—",
                      },
                      sections: [
                        {
                          title: "Events",
                          table: {
                            head: ["Preferred Term", "SOC", "Reports", "Drugs", "Serious"],
                            body: filtered.map((e) => [e.term, e.soc ?? "—", e.count, e.drugs.size, e.serious]),
                          },
                        },
                      ],
                      footer: "PV-XAI Adverse Event Catalog • Confidential",
                    });
                    toast({ title: "Event catalog exported" });
                  }}
                >
                  <Download className="h-3.5 w-3.5" /> Export PDF
                </Button>
              </div>
            </div>

            <Card className="overflow-hidden shadow-[var(--shadow-card)]">
              <div className="px-4 sm:px-5 py-3 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-semibold">Events</h3>
                <Badge variant="outline" className="font-normal">{filtered.length}</Badge>
              </div>
              {loading ? (
                <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
              ) : filtered.length === 0 ? (
                <div className="p-10 text-center text-sm text-muted-foreground">No events found.</div>
              ) : (
                <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="text-left px-4 sm:px-5 py-3 font-medium whitespace-nowrap">Preferred Term</th>
                      <th className="text-left px-4 sm:px-5 py-3 font-medium whitespace-nowrap">SOC</th>
                      <th className="text-right px-4 sm:px-5 py-3 font-medium whitespace-nowrap">Reports</th>
                      <th className="text-right px-4 sm:px-5 py-3 font-medium whitespace-nowrap">Drugs</th>
                      <th className="text-right px-4 sm:px-5 py-3 font-medium whitespace-nowrap">Serious</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((e) => (
                    <tr key={e.term} className="border-t border-border hover:bg-muted/30">
                        <TruncatedCell className="font-medium text-foreground" tooltip={e.term}>{e.term}</TruncatedCell>
                        <TruncatedCell className="text-muted-foreground" tooltip={e.soc ?? undefined}>{e.soc ?? "—"}</TruncatedCell>
                        <td className="px-4 sm:px-5 py-3 text-right tabular-nums">{e.count}</td>
                        <td className="px-4 sm:px-5 py-3 text-right tabular-nums">{e.drugs.size}</td>
                        <td className={cn("px-4 sm:px-5 py-3 text-right tabular-nums", e.serious > 0 && "text-destructive font-medium")}>
                          {e.serious > 0 ? <span className="inline-flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{e.serious}</span> : "0"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
            </Card>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Events;
