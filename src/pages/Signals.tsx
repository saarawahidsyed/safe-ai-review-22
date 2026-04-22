import { useEffect, useMemo, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SignalsTable, type Signal } from "@/components/dashboard/SignalsTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, Brain, Search, Activity, AlertTriangle, ShieldAlert, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { KpiCard } from "@/components/dashboard/KpiCard";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type StatusFilter = "all" | "new" | "updated" | "resolved";

const Signals = () => {
  const [rows, setRows] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [selectedId, setSelectedId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [drugFilter, setDrugFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [minPrr, setMinPrr] = useState<string>("0");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("signals")
      .select("id, drug, event_term, soc, case_count, prr, ror, ic, ic_lower, confidence, status, last_detected_at")
      .order("last_detected_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast({ title: "Failed to load signals", description: error.message, variant: "destructive" });
      return;
    }
    const mapped: Signal[] = (data ?? []).map((r: any) => {
      const prr = Number(r.prr ?? 0);
      const sev: Signal["severity"] =
        prr >= 5 ? "Critical" : prr >= 3 ? "High" : prr >= 2 ? "Moderate" : "Low";
      return {
        id: r.id,
        drug: r.drug,
        event: r.event_term,
        confidence: Math.round(r.confidence ?? 0),
        severity: sev,
        cases: r.case_count,
        status: r.status,
        detection: "statistical",
        prr,
        ror: Number(r.ror ?? 0),
        ic: Number(r.ic ?? 0),
        ic_lower: Number(r.ic_lower ?? 0),
      };
    });
    setRows(mapped);
    if (mapped.length && !selectedId) setSelectedId(mapped[0].id);
  };

  useEffect(() => {
    load();
  }, []);

  const runDetection = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("detect-signals");
      if (error) throw error;
      toast({
        title: "Detection complete",
        description: `Detected ${data?.detected ?? 0} • New ${data?.inserted ?? 0} • Updated ${data?.updated ?? 0} • Resolved ${data?.resolved ?? 0}`,
      });
      await load();
    } catch (e: any) {
      toast({ title: "Detection failed", description: e.message, variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  const filtered = useMemo(() => {
    const min = parseFloat(minPrr) || 0;
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (drugFilter !== "all" && r.drug !== drugFilter) return false;
      if ((r.prr ?? 0) < min) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!r.drug.toLowerCase().includes(q) && !r.event.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [rows, statusFilter, drugFilter, minPrr, search]);

  const drugOptions = useMemo(() => {
    const set = new Set(rows.map((r) => r.drug));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const topDrugs = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) map.set(r.drug, (map.get(r.drug) ?? 0) + (r.cases ?? 0));
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [rows]);

  const counts = useMemo(() => ({
    total: rows.length,
    new: rows.filter((r) => r.status === "new").length,
    updated: rows.filter((r) => r.status === "updated").length,
    resolved: rows.filter((r) => r.status === "resolved").length,
    strong: rows.filter((r) => (r.ic_lower ?? -Infinity) > 0).length,
    drugs: drugOptions.length,
  }), [rows, drugOptions]);

  const selected = filtered.find((s) => s.id === selectedId) ?? filtered[0];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[var(--gradient-subtle)]">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b border-border bg-card/80 backdrop-blur sticky top-0 z-10 flex items-center px-3 sm:px-4 gap-2 sm:gap-3">
            <SidebarTrigger />
            <div className="flex-1 min-w-0 max-w-md relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search drug or event…"
                className="pl-9 h-9 bg-muted/40 border-transparent focus-visible:bg-background"
              />
            </div>
            <Button variant="ghost" size="icon" className="relative shrink-0">
              <Bell className="h-4 w-4" />
            </Button>
            <div className="h-8 w-8 rounded-full bg-[var(--gradient-primary)] grid place-items-center text-primary-foreground text-xs font-semibold shrink-0">
              DR
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6 space-y-4 md:space-y-6 overflow-x-hidden">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Signal Detection</p>
                <h1 className="text-xl sm:text-2xl font-semibold text-foreground mt-1">Disproportionality Signals</h1>
                <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                  Statistical drug-event signals computed from current case data using PRR, ROR, and Bayesian IC (BCPNN).
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="gap-1.5" onClick={runDetection} disabled={running}>
                  <Brain className="h-3.5 w-3.5" /> {running ? "Detecting…" : "Run Detection"}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              <KpiCard label="Total Signals" value={String(counts.total)} delta="all statuses" trend="flat" icon={Activity} />
              <KpiCard label="New" value={String(counts.new)} delta="awaiting review" trend="up" icon={Sparkles} intent="warning" />
              <KpiCard label="Updated" value={String(counts.updated)} delta="case count grew" trend="up" icon={AlertTriangle} intent="warning" />
              <KpiCard label="Resolved" value={String(counts.resolved)} delta=">30d inactive" trend="flat" icon={ShieldAlert} />
              <KpiCard label="Strong (IC₀₂₅>0)" value={String(counts.strong)} delta="Bayesian threshold" trend="up" icon={Brain} intent="success" />
            </div>

            <Card className="p-3 flex flex-wrap items-center gap-2 sm:gap-3 shadow-[var(--shadow-card)]">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-full sm:w-auto">Filters</span>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="h-8 flex-1 sm:flex-none sm:w-[140px] min-w-[120px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="updated">Updated</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Min PRR</span>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  value={minPrr}
                  onChange={(e) => setMinPrr(e.target.value)}
                  className="h-8 w-20 text-xs"
                />
              </div>
              <Badge variant="outline" className="ml-auto font-normal shrink-0">
                {filtered.length} of {rows.length}
              </Badge>
            </Card>

            {loading ? (
              <Card className="p-10 text-center text-sm text-muted-foreground">Loading signals…</Card>
            ) : filtered.length === 0 ? (
              <Card className="p-10 text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  {rows.length === 0
                    ? "No signals detected yet. Run detection to compute PRR/ROR/IC across current cases."
                    : "No signals match the current filters."}
                </p>
                {rows.length === 0 && (
                  <Button size="sm" onClick={runDetection} disabled={running} className="gap-1.5">
                    <Brain className="h-3.5 w-3.5" /> Run Detection
                  </Button>
                )}
              </Card>
            ) : (
              <SignalsTable signals={filtered} selectedId={selected?.id ?? ""} onSelect={setSelectedId} />
            )}

            {selected && (
              <Card className="p-4 md:p-5 space-y-3 shadow-[var(--shadow-card)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-foreground break-words">
                      {selected.drug} → {selected.event}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Disproportionality detail</p>
                  </div>
                  <Badge variant="outline" className="capitalize shrink-0">{selected.status}</Badge>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 text-sm">
                  <Metric label="PRR" value={selected.prr?.toFixed(2)} hint="≥ 2 typical threshold" strong={(selected.prr ?? 0) >= 2} />
                  <Metric label="ROR" value={selected.ror?.toFixed(2)} hint="≥ 2 disproportionate" strong={(selected.ror ?? 0) >= 2} />
                  <Metric label="IC" value={selected.ic?.toFixed(2)} hint={`IC₀₂₅ ${selected.ic_lower?.toFixed(2)}`} strong={(selected.ic_lower ?? -1) > 0} />
                  <Metric label="Cases" value={String(selected.cases)} hint={`Confidence ${selected.confidence}%`} strong={selected.cases >= 5} />
                </div>
              </Card>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

function Metric({ label, value, hint, strong }: { label: string; value?: string; hint?: string; strong?: boolean }) {
  return (
    <div className="rounded-md border border-border p-3 bg-card">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-xl font-semibold tabular-nums mt-0.5 ${strong ? "text-primary" : "text-foreground"}`}>{value ?? "—"}</div>
      {hint && <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}

export default Signals;
