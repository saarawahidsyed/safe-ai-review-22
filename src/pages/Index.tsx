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
import { downloadPdfReport } from "@/lib/pdfExport";

const aiSignals: Signal[] = [
  { id: "s1", drug: "Apixaban", event: "Intracranial hemorrhage", confidence: 92, severity: "Critical", cases: 47, status: "New" },
  { id: "s2", drug: "Semaglutide", event: "Acute pancreatitis", confidence: 86, severity: "High", cases: 134, status: "Reviewing" },
  { id: "s3", drug: "Atorvastatin", event: "Rhabdomyolysis", confidence: 78, severity: "High", cases: 62, status: "Reviewing" },
  { id: "s4", drug: "Metformin", event: "Lactic acidosis", confidence: 71, severity: "Moderate", cases: 28, status: "New" },
  { id: "s5", drug: "Sertraline", event: "QT prolongation", confidence: 64, severity: "Moderate", cases: 19, status: "Validated" },
  { id: "s6", drug: "Ibuprofen", event: "GI bleeding", confidence: 58, severity: "Low", cases: 211, status: "Validated" },
  { id: "s7", drug: "Warfarin", event: "Gastrointestinal hemorrhage", confidence: 89, severity: "Critical", cases: 73, status: "New" },
  { id: "s8", drug: "Lisinopril", event: "Angioedema", confidence: 94, severity: "Critical", cases: 41, status: "New" },
  { id: "s9", drug: "Pembrolizumab", event: "Immune-mediated colitis", confidence: 90, severity: "High", cases: 36, status: "Reviewing" },
  { id: "s10", drug: "Methotrexate", event: "Hepatotoxicity", confidence: 81, severity: "High", cases: 54, status: "Reviewing" },
  { id: "s11", drug: "Amoxicillin", event: "Stevens-Johnson syndrome", confidence: 92, severity: "Critical", cases: 22, status: "New" },
  { id: "s12", drug: "Clopidogrel", event: "Thrombotic thrombocytopenic purpura", confidence: 76, severity: "High", cases: 14, status: "Reviewing" },
  { id: "s13", drug: "Allopurinol", event: "DRESS syndrome", confidence: 91, severity: "Critical", cases: 19, status: "New" },
  { id: "s14", drug: "Carbamazepine", event: "Stevens-Johnson syndrome", confidence: 89, severity: "Critical", cases: 26, status: "Reviewing" },
  { id: "s15", drug: "Rivaroxaban", event: "Intracranial hemorrhage", confidence: 93, severity: "Critical", cases: 39, status: "New" },
  { id: "s16", drug: "Simvastatin", event: "Rhabdomyolysis", confidence: 84, severity: "High", cases: 47, status: "Validated" },
  { id: "s17", drug: "Vancomycin", event: "Acute kidney injury", confidence: 82, severity: "High", cases: 58, status: "Reviewing" },
  { id: "s18", drug: "Ciprofloxacin", event: "Tendon rupture", confidence: 80, severity: "High", cases: 31, status: "Reviewing" },
  { id: "s19", drug: "Omeprazole", event: "Clostridioides difficile infection", confidence: 68, severity: "Moderate", cases: 92, status: "Validated" },
  { id: "s20", drug: "Tramadol", event: "Serotonin syndrome", confidence: 85, severity: "High", cases: 24, status: "New" },
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
  s7: {
    rationale: "Bleeding risk amplified by concurrent NSAID use and supratherapeutic INR. Long treatment duration in elderly patients drives signal strength.",
    features: [
      { feature: "INR", value: "> 3.5", shap: 0.32 },
      { feature: "Concurrent NSAID", value: "Yes", shap: 0.27 },
      { feature: "Patient age", value: "≥ 70 years", shap: 0.21 },
      { feature: "PPI co-prescription", value: "Yes", shap: -0.15 },
    ],
  },
  s8: {
    rationale: "ACE-inhibitor angioedema is a class effect with strong association in patients of African or Asian ancestry. Onset is typically within first weeks of therapy.",
    features: [
      { feature: "Ancestry", value: "African / Asian", shap: 0.31 },
      { feature: "Onset window", value: "< 30 days", shap: 0.24 },
      { feature: "Prior ACE-I exposure", value: "Yes", shap: 0.18 },
      { feature: "Bradykinin level", value: "Elevated", shap: 0.16 },
    ],
  },
  s9: {
    rationale: "Checkpoint inhibitor immune-related adverse events cluster between weeks 6–12. GI involvement common with anti-PD-1 therapy.",
    features: [
      { feature: "Drug class", value: "Anti-PD-1", shap: 0.29 },
      { feature: "Onset window", value: "6–12 weeks", shap: 0.24 },
      { feature: "Prior autoimmune history", value: "Yes", shap: 0.19 },
      { feature: "Steroid responsiveness", value: "Yes", shap: -0.12 },
    ],
  },
  s10: {
    rationale: "Cumulative methotrexate dose with elevated transaminases. Risk increases with alcohol use and obesity.",
    features: [
      { feature: "Cumulative dose", value: "> 1.5 g", shap: 0.26 },
      { feature: "ALT", value: "> 3× ULN", shap: 0.23 },
      { feature: "BMI", value: "> 30", shap: 0.17 },
      { feature: "Folate supplementation", value: "Yes", shap: -0.18 },
    ],
  },
  s11: {
    rationale: "Severe cutaneous reaction with mucosal involvement following beta-lactam exposure. HLA association suspected.",
    features: [
      { feature: "Onset window", value: "4–14 days", shap: 0.30 },
      { feature: "Mucosal involvement", value: "Yes", shap: 0.27 },
      { feature: "Prior beta-lactam reaction", value: "Yes", shap: 0.19 },
    ],
  },
  s12: {
    rationale: "Rare hematologic signal supported by ADAMTS13 deficiency and microangiopathic features.",
    features: [
      { feature: "Schistocytes on smear", value: "Present", shap: 0.28 },
      { feature: "ADAMTS13 activity", value: "< 10%", shap: 0.25 },
      { feature: "Onset window", value: "< 4 weeks", shap: 0.18 },
    ],
  },
  s13: {
    rationale: "DRESS strongly associated with HLA-B*58:01 in Asian populations. Eosinophilia and visceral involvement support causality.",
    features: [
      { feature: "HLA-B*58:01", value: "Positive", shap: 0.34 },
      { feature: "Eosinophilia", value: "> 1500/µL", shap: 0.22 },
      { feature: "Onset window", value: "2–8 weeks", shap: 0.18 },
    ],
  },
  s14: {
    rationale: "HLA-B*15:02 confers strong risk for SJS/TEN with carbamazepine, especially in Han Chinese, Thai, and Malay populations.",
    features: [
      { feature: "HLA-B*15:02", value: "Positive", shap: 0.36 },
      { feature: "Onset window", value: "< 8 weeks", shap: 0.23 },
      { feature: "Mucosal lesions", value: "Yes", shap: 0.20 },
    ],
  },
  s15: {
    rationale: "DOAC-associated intracranial bleeding correlated with age, falls history, and renal impairment.",
    features: [
      { feature: "Patient age", value: "≥ 75", shap: 0.30 },
      { feature: "Recent fall", value: "Yes", shap: 0.24 },
      { feature: "CrCl", value: "< 50 mL/min", shap: 0.20 },
      { feature: "Dose-adjusted for renal", value: "Yes", shap: -0.14 },
    ],
  },
  s16: {
    rationale: "Simvastatin myopathy risk increased by CYP3A4 inhibitors and high dose. CK elevation diagnostic.",
    features: [
      { feature: "Daily dose", value: "≥ 40 mg", shap: 0.28 },
      { feature: "CYP3A4 inhibitor co-rx", value: "Amiodarone", shap: 0.25 },
      { feature: "Baseline CK", value: "Elevated", shap: 0.16 },
    ],
  },
  s17: {
    rationale: "Vancomycin-induced AKI driven by high troughs and combination with piperacillin-tazobactam.",
    features: [
      { feature: "Trough level", value: "> 20 mcg/mL", shap: 0.27 },
      { feature: "Concurrent pip-tazo", value: "Yes", shap: 0.23 },
      { feature: "Duration", value: "> 7 days", shap: 0.18 },
    ],
  },
  s18: {
    rationale: "Fluoroquinolone tendinopathy classically affects Achilles tendon; risk amplified by corticosteroid co-use and age.",
    features: [
      { feature: "Concurrent corticosteroid", value: "Yes", shap: 0.30 },
      { feature: "Patient age", value: "≥ 60", shap: 0.22 },
      { feature: "Achilles involvement", value: "Yes", shap: 0.19 },
    ],
  },
  s19: {
    rationale: "Long-term PPI use increases C. difficile risk via gastric acid suppression and microbiome disruption.",
    features: [
      { feature: "PPI duration", value: "> 1 year", shap: 0.24 },
      { feature: "Recent antibiotic", value: "Yes", shap: 0.22 },
      { feature: "Hospitalization", value: "Recent", shap: 0.17 },
    ],
  },
  s20: {
    rationale: "Tramadol's serotonergic activity precipitates serotonin syndrome when combined with SSRIs/SNRIs.",
    features: [
      { feature: "Concurrent SSRI", value: "Yes", shap: 0.32 },
      { feature: "Onset window", value: "< 14 days", shap: 0.22 },
      { feature: "Hyperreflexia / clonus", value: "Present", shap: 0.20 },
    ],
  },
};

const Index = () => {
  const [detected, setDetected] = useState<Signal[]>([]);
  const [running, setRunning] = useState(false);
  const [selectedId, setSelectedId] = useState<string>("s1");
  const [aiSignalState, setAiSignalState] = useState<Signal[]>(aiSignals);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, Signal["status"]>>({});

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

  const applyOverride = (s: Signal): Signal =>
    statusOverrides[s.id] ? { ...s, status: statusOverrides[s.id] } : s;
  const signals: Signal[] = [...detected, ...aiSignalState].map(applyOverride);
  const selected = signals.find((s) => s.id === selectedId) ?? signals[0];

  const setSelectedStatus = (status: Signal["status"], label: string) => {
    if (!selected) return;
    setStatusOverrides((prev) => ({ ...prev, [selected.id]: status }));
    toast({ title: label, description: `${selected.drug} → ${selected.event}` });
  };

  const exportSelectedReport = () => {
    if (!selected) return;
    downloadPdfReport({
      title: "Signal Explanation Report",
      subtitle: `${selected.drug} → ${selected.event}`,
      filename: `signal-${selected.drug.toLowerCase().replace(/\s+/g, "-")}-${selected.id}.pdf`,
      meta: {
        Generated: new Date().toLocaleString(),
        Confidence: `${selected.confidence}%`,
        Severity: selected.severity,
        Cases: String(selected.cases),
        Status: String(selected.status),
        PRR: selected.prr != null ? selected.prr.toFixed(2) : "—",
        ROR: selected.ror != null ? selected.ror.toFixed(2) : "—",
        IC: selected.ic != null ? selected.ic.toFixed(2) : "—",
      },
      sections: [
        { title: "Clinical rationale", paragraphs: [exp.rationale] },
        ...(exp.features.length
          ? [{
              title: "Feature contributions (SHAP)",
              table: {
                head: ["Feature", "Value", "SHAP"],
                body: exp.features.map((f) => [f.feature, f.value, f.shap.toFixed(2)]),
              },
            }]
          : []),
      ],
      footer: "PV-XAI • Confidential safety report",
    });
    toast({ title: "Report exported", description: "Signal explanation downloaded." });
  };

  const exportDashboard = () => {
    downloadPdfReport({
      title: "Pharmacovigilance Dashboard Snapshot",
      subtitle: "Active safety signals overview",
      filename: `dashboard-${new Date().toISOString().slice(0, 10)}.pdf`,
      meta: {
        Generated: new Date().toLocaleString(),
        "Total signals": String(signals.length),
      },
      sections: [
        {
          title: "Signals",
          table: {
            head: ["Drug", "Event", "Confidence", "Cases", "Severity", "Status"],
            body: signals.map((s) => [s.drug, s.event, `${s.confidence}%`, s.cases, s.severity, String(s.status)]),
          },
        },
      ],
      footer: "PV-XAI Dashboard • Confidential",
    });
    toast({ title: "Dashboard exported", description: "PDF downloaded." });
  };
  void aiSignalState; void setAiSignalState;
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

          <main className="flex-1 p-4 sm:p-6 space-y-6 overflow-x-hidden">
            <section
              aria-labelledby="mission-heading"
              className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 sm:p-6 shadow-[var(--shadow-card)]"
            >
              <div className="flex items-start gap-3">
                <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Brain className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-primary font-semibold">
                    PV-XAI Platform
                  </p>
                  <h1
                    id="mission-heading"
                    className="mt-1 text-xl sm:text-2xl font-semibold text-foreground leading-tight"
                  >
                    Explainable Artificial Intelligence for Patient Safety Review in Pharmacovigilance
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground max-w-3xl leading-relaxed">
                    A transparent, auditable AI system that detects adverse drug reaction signals from
                    ICSR reports, explains every prediction with SHAP-based feature attributions, and
                    supports clinicians and safety reviewers with evidence-grounded recommendations —
                    advancing patient safety across the drug lifecycle.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {[
                      "Signal Detection",
                      "Model Explainability (SHAP)",
                      "Adverse Event Analysis",
                      "Patient Safety Review",
                      "Regulatory-Ready Audit Trail",
                    ].map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full bg-background/70 border border-border px-2.5 py-0.5 text-[11px] font-medium text-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Safety Signals Overview</p>
                <h2 className="text-lg sm:text-xl font-semibold text-foreground mt-1">
                  Active AI-detected signals & explanations
                </h2>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={exportDashboard}>
                  <FileText className="h-3.5 w-3.5" /> Export
                </Button>
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
                  status={String(selected.status)}
                  onValidate={() => setSelectedStatus("Validated", "Signal validated")}
                  onReject={() => setSelectedStatus("Rejected", "Signal rejected")}
                  onDismiss={() => setSelectedStatus("Dismissed", "Signal dismissed")}
                  onExport={exportSelectedReport}
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
