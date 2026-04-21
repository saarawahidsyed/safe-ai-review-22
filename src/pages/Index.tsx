import { useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { SignalsTable, type Signal } from "@/components/dashboard/SignalsTable";
import { ExplanationPanel, type FeatureContribution } from "@/components/dashboard/ExplanationPanel";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { Button } from "@/components/ui/button";
import { Activity, AlertTriangle, Bell, Brain, FileText, Search, ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const aiSignals: Signal[] = [
  { id: "s1", drug: "Apixaban", event: "Intracranial hemorrhage", confidence: 92, severity: "Critical", cases: 47, status: "New" },
  { id: "s2", drug: "Semaglutide", event: "Acute pancreatitis", confidence: 86, severity: "High", cases: 134, status: "Reviewing" },
  { id: "s3", drug: "Atorvastatin", event: "Rhabdomyolysis", confidence: 78, severity: "High", cases: 62, status: "Reviewing" },
  { id: "s4", drug: "Metformin", event: "Lactic acidosis", confidence: 71, severity: "Moderate", cases: 28, status: "New" },
  { id: "s5", drug: "Sertraline", event: "QT prolongation", confidence: 64, severity: "Moderate", cases: 19, status: "Validated" },
  { id: "s6", drug: "Ibuprofen", event: "GI bleeding", confidence: 58, severity: "Low", cases: 211, status: "Validated" },
];

const explanations: Record<string, { features: FeatureContribution[]; rationale: string }> = {
  s1: {
    rationale:
      "Model attributes elevated risk primarily to concomitant antiplatelet therapy and advanced patient age. Disproportionality analysis (PRR=4.2) and temporal clustering reinforce a likely causal association.",
    features: [
      { feature: "Concomitant aspirin", value: "Yes (62% of cases)", shap: 0.34 },
      { feature: "Patient age", value: "≥ 75 years", shap: 0.28 },
      { feature: "Renal impairment (CrCl)", value: "< 30 mL/min", shap: 0.22 },
      { feature: "Treatment duration", value: "> 6 months", shap: 0.15 },
      { feature: "INR monitoring", value: "Regular", shap: -0.18 },
      { feature: "Dose adjustment", value: "Per label", shap: -0.11 },
    ],
  },
  s2: {
    rationale:
      "Strong signal driven by reporting frequency in patients with prior pancreatic risk factors. Temporal onset within 90 days of initiation supports a probable association.",
    features: [
      { feature: "Onset window", value: "< 90 days", shap: 0.31 },
      { feature: "History of gallstones", value: "Present", shap: 0.26 },
      { feature: "Triglycerides", value: "> 500 mg/dL", shap: 0.21 },
      { feature: "Alcohol use", value: "Moderate", shap: 0.12 },
      { feature: "Prior GLP-1 tolerance", value: "Yes", shap: -0.14 },
    ],
  },
  s3: {
    rationale: "Elevated CK levels combined with high-intensity dosing and CYP3A4 inhibitor co-administration drive this signal.",
    features: [
      { feature: "Dose intensity", value: "80 mg daily", shap: 0.29 },
      { feature: "CYP3A4 inhibitor co-rx", value: "Clarithromycin", shap: 0.25 },
      { feature: "Baseline CK", value: "Elevated", shap: 0.18 },
      { feature: "Hypothyroidism", value: "Untreated", shap: 0.13 },
      { feature: "Statin tolerance history", value: "Stable", shap: -0.12 },
    ],
  },
  s4: {
    rationale: "Background incidence is low; signal is supported by renal function decline and contrast media exposure.",
    features: [
      { feature: "eGFR", value: "< 45", shap: 0.27 },
      { feature: "Contrast exposure", value: "Recent", shap: 0.19 },
      { feature: "Sepsis indicators", value: "Present", shap: 0.16 },
      { feature: "Adherence to hold protocol", value: "Yes", shap: -0.21 },
    ],
  },
  s5: {
    rationale: "Validated post review. Risk concentrated in patients with concurrent QT-prolonging agents.",
    features: [
      { feature: "Concurrent QT drugs", value: "Ondansetron", shap: 0.24 },
      { feature: "Baseline QTc", value: "> 450 ms", shap: 0.2 },
      { feature: "Electrolyte panel normal", value: "Yes", shap: -0.17 },
    ],
  },
  s6: {
    rationale: "Well-characterized class effect. Model confirms expected risk profile without novel signal components.",
    features: [
      { feature: "PPI co-prescription", value: "No", shap: 0.18 },
      { feature: "H. pylori positive", value: "Yes", shap: 0.16 },
      { feature: "Daily dose", value: "> 1200 mg", shap: 0.14 },
      { feature: "PPI co-prescription", value: "Yes", shap: -0.22 },
    ],
  },
};

const Index = () => {
  const [detected, setDetected] = useState<Signal[]>([]);
  const [running, setRunning] = useState(false);
  const [selectedId, setSelectedId] = useState<string>("s1");

  const loadDetected = async () => {
    const { data, error } = await supabase
      .from("signals")
      .select("id, drug, event_term, soc, case_count, prr, ror, ic, ic_lower, confidence, status")
      .order("last_detected_at", { ascending: false });
    if (error) return;
    const mapped: Signal[] = (data ?? []).map((r) => {
      const sev: Signal["severity"] =
        r.prr >= 5 ? "Critical" : r.prr >= 3 ? "High" : r.prr >= 2 ? "Moderate" : "Low";
      return {
        id: r.id,
        drug: r.drug,
        event: r.event_term,
        confidence: Math.round(r.confidence ?? 0),
        severity: sev,
        cases: r.case_count,
        status: r.status as Signal["status"],
        detection: "statistical",
        prr: Number(r.prr ?? 0),
        ror: Number((r as any).ror ?? 0),
        ic: Number((r as any).ic ?? 0),
        ic_lower: Number((r as any).ic_lower ?? 0),
      };
    });
    setDetected(mapped);
  };

  useEffect(() => {
    loadDetected();
  }, []);

  const runDetection = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("detect-signals");
      if (error) throw error;
      toast({
        title: "Signal detection complete",
        description: `Detected ${data?.detected ?? 0} • New ${data?.inserted ?? 0} • Updated ${data?.updated ?? 0} • Resolved ${data?.resolved ?? 0}`,
      });
      await loadDetected();
    } catch (e: any) {
      toast({ title: "Detection failed", description: e.message, variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  const signals: Signal[] = [...detected, ...aiSignals];
  const selected = signals.find((s) => s.id === selectedId) ?? signals[0];
  const exp = explanations[selected?.id] ?? {
    rationale: `Statistical signal: PRR-based detection from ${selected?.cases ?? 0} ICSR reports linking ${selected?.drug} to ${selected?.event}.`,
    features: [],
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[var(--gradient-subtle)]">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b border-border bg-card/80 backdrop-blur sticky top-0 z-10 flex items-center px-4 gap-3">
            <SidebarTrigger />
            <div className="flex-1 max-w-md relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search drugs, events, case IDs…" className="pl-9 h-9 bg-muted/40 border-transparent focus-visible:bg-background" />
            </div>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-destructive" />
            </Button>
            <div className="h-8 w-8 rounded-full bg-[var(--gradient-primary)] grid place-items-center text-primary-foreground text-xs font-semibold">
              DR
            </div>
          </header>

          <main className="flex-1 p-6 space-y-6 overflow-x-hidden">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Pharmacovigilance / Safety Review</p>
                <h1 className="text-2xl font-semibold text-foreground mt-1">
                  Explainable AI for Drug Safety Surveillance
                </h1>
                <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                  Transparent, auditable signal detection across global adverse event reports. Every prediction is traceable to its clinical evidence.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Export</Button>
                <Button size="sm" className="gap-1.5" onClick={runDetection} disabled={running}>
                  <Brain className="h-3.5 w-3.5" /> {running ? "Detecting…" : "Run Detection"}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard label="ICSR Reports (30d)" value="12,847" delta="↑ 8.3% vs prior" trend="up" icon={FileText} />
              <KpiCard label="Active Signals" value="24" delta="↑ 3 new this week" trend="up" icon={Activity} intent="warning" />
              <KpiCard label="Critical Findings" value="7" delta="2 require expedited review" trend="up" icon={ShieldAlert} intent="destructive" />
              <KpiCard label="Validated Signals" value="89%" delta="Model agreement with reviewers" trend="flat" icon={AlertTriangle} intent="success" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2"><TrendChart /></div>
              <div className="grid grid-cols-1 gap-4">
                <KpiCard label="Mean Time to Detection" value="4.2 days" delta="↓ 38% with XAI" trend="down" icon={Activity} intent="success" />
                <KpiCard label="Reviewer Trust Score" value="4.6 / 5" delta="Based on 312 reviews" trend="flat" icon={Brain} />
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
              <div className="xl:col-span-3">
                <SignalsTable signals={signals} selectedId={selectedId} onSelect={setSelectedId} />
              </div>
              <div className="xl:col-span-2">
                <ExplanationPanel
                  drug={selected.drug}
                  event={selected.event}
                  confidence={selected.confidence}
                  features={exp.features}
                  rationale={exp.rationale}
                />
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;
