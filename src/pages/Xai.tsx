import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, Brain, Database, Download, Search, Target } from "lucide-react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { GlobalFeatureImportance, type GlobalFeature } from "@/components/xai/GlobalFeatureImportance";
import { ForcePlot, type ForceContribution } from "@/components/xai/ForcePlot";
import { SignalsBySOC } from "@/components/xai/SignalsBySOC";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { downloadPdfReport } from "@/lib/pdfExport";
import { toast } from "@/hooks/use-toast";

const globalFeatures: GlobalFeature[] = [
  { feature: "Concomitant antiplatelet", category: "Co-medication", importance: 0.281, direction: 0.34 },
  { feature: "Patient age (>65)", category: "Patient", importance: 0.246, direction: 0.27 },
  { feature: "Renal function (eGFR)", category: "Lab", importance: 0.213, direction: 0.22 },
  { feature: "CYP3A4 inhibitor co-rx", category: "Co-medication", importance: 0.198, direction: 0.31 },
  { feature: "Treatment duration", category: "Temporal", importance: 0.176, direction: 0.18 },
  { feature: "Time-to-onset (<90d)", category: "Temporal", importance: 0.164, direction: 0.21 },
  { feature: "Baseline LFTs", category: "Lab", importance: 0.142, direction: 0.16 },
  { feature: "Drug dose intensity", category: "Drug", importance: 0.131, direction: 0.19 },
  { feature: "Adherence to monitoring", category: "Patient", importance: 0.118, direction: -0.21 },
  { feature: "Prior tolerance history", category: "Patient", importance: 0.094, direction: -0.17 },
  { feature: "Dose adjustment per label", category: "Drug", importance: 0.082, direction: -0.14 },
];

const caseForcePlots: Record<string, { label: string; base: number; final: number; contribs: ForceContribution[] }> = {
  "ICSR-2024-08412": {
    label: "ICSR-2024-08412 · Apixaban → Intracranial hemorrhage",
    base: 0.04,
    final: 0.92,
    contribs: [
      { feature: "Concomitant aspirin", value: "81 mg daily", shap: 0.34 },
      { feature: "Patient age", value: "78 years", shap: 0.28 },
      { feature: "Renal impairment", value: "eGFR 38 mL/min", shap: 0.22 },
      { feature: "Treatment duration", value: "6+ months", shap: 0.15 },
      { feature: "INR monitoring", value: "Regular per protocol", shap: -0.18 },
      { feature: "Dose adjustment", value: "Per label", shap: -0.11 },
    ],
  },
  "ICSR-2024-08510": {
    label: "ICSR-2024-08510 · Semaglutide → Acute pancreatitis",
    base: 0.06,
    final: 0.86,
    contribs: [
      { feature: "Onset window", value: "62 days post-init", shap: 0.31 },
      { feature: "History of cholelithiasis", value: "Present (2019)", shap: 0.26 },
      { feature: "Triglycerides", value: "580 mg/dL", shap: 0.21 },
      { feature: "Alcohol use", value: "Moderate", shap: 0.12 },
      { feature: "Prior GLP-1 tolerance", value: "None", shap: -0.04 },
    ],
  },
  "ICSR-2024-08623": {
    label: "ICSR-2024-08623 · Atorvastatin → Rhabdomyolysis",
    base: 0.05,
    final: 0.78,
    contribs: [
      { feature: "CYP3A4 inhibitor", value: "Clarithromycin 500 mg BID", shap: 0.29 },
      { feature: "Dose intensity", value: "80 mg daily", shap: 0.25 },
      { feature: "Baseline CK", value: "Elevated", shap: 0.18 },
      { feature: "Untreated hypothyroidism", value: "Present", shap: 0.13 },
      { feature: "Statin tolerance history", value: "Stable 4 months", shap: -0.12 },
    ],
  },
  "ICSR-2025-1009": {
    label: "ICSR-2025-1009 · Adalimumab → TB reactivation",
    base: 0.03,
    final: 0.81,
    contribs: [
      { feature: "Latent TB screen", value: "Not documented", shap: 0.32 },
      { feature: "Endemic region exposure", value: "Yes", shap: 0.22 },
      { feature: "TNF-α inhibitor duration", value: "9 months", shap: 0.18 },
      { feature: "Concomitant corticosteroid", value: "Prednisone 10 mg", shap: 0.14 },
      { feature: "Prior IGRA testing", value: "Negative 2y ago", shap: -0.06 },
    ],
  },
  "ICSR-2025-1016": {
    label: "ICSR-2025-1016 · Nivolumab → Immune-mediated colitis",
    base: 0.07,
    final: 0.88,
    contribs: [
      { feature: "Treatment cycle", value: "Cycle 4", shap: 0.30 },
      { feature: "Prior autoimmune history", value: "Psoriasis", shap: 0.21 },
      { feature: "Combination ipilimumab", value: "Yes", shap: 0.27 },
      { feature: "Baseline calprotectin", value: "Elevated", shap: 0.13 },
      { feature: "Prophylactic budesonide", value: "Not given", shap: 0.05 },
    ],
  },
};

const Xai = () => {
  const [caseId, setCaseId] = useState<keyof typeof caseForcePlots>("ICSR-2024-08412");
  const fp = caseForcePlots[caseId];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[var(--gradient-subtle)]">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b border-border bg-card/80 backdrop-blur sticky top-0 z-10 flex items-center px-3 sm:px-4 gap-2 sm:gap-3">
            <SidebarTrigger />
            <div className="flex-1 min-w-0 max-w-md relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search features…" className="pl-9 h-9 bg-muted/40 border-transparent focus-visible:bg-background" />
            </div>
            <Button variant="ghost" size="icon" className="relative shrink-0">
              <Bell className="h-4 w-4" />
              <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-destructive" />
            </Button>
            <div className="h-8 w-8 rounded-full bg-[var(--gradient-primary)] grid place-items-center text-primary-foreground text-xs font-semibold shrink-0">
              DR
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6 space-y-4 md:space-y-6 overflow-x-hidden">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Pharmacovigilance / Model Explainability</p>
                <h1 className="text-xl sm:text-2xl font-semibold text-foreground mt-1">Global &amp; Local XAI Analysis</h1>
                <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                  Understand what drives the safety-signal model across the population, and inspect individual predictions with SHAP force plots.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    downloadPdfReport({
                      title: "Model Card · PV-XAI v3.4.1",
                      subtitle: "Pharmacovigilance signal-detection model — explainability summary",
                      filename: `pv-xai-model-card-${new Date().toISOString().slice(0, 10)}.pdf`,
                      meta: {
                        Version: "PV-XAI v3.4.1",
                        Deployed: "12 days ago",
                        AUROC: "0.927",
                        "Precision @ 90% recall": "0.84",
                        "Training samples": "218,394",
                      },
                      sections: [
                        {
                          title: "Intended use",
                          paragraphs: [
                            "Decision-support model that ranks ICSRs by likelihood of being a true safety signal. Outputs include a calibrated probability and SHAP-based feature contributions to support medical reviewer triage. Not intended to replace clinical judgement or formal regulatory signal validation.",
                          ],
                        },
                        {
                          title: "Global feature importance",
                          table: {
                            head: ["Feature", "Category", "Importance", "Mean SHAP"],
                            body: globalFeatures
                              .slice()
                              .sort((a, b) => b.importance - a.importance)
                              .map((f) => [f.feature, f.category, f.importance.toFixed(3), (f.direction >= 0 ? "+" : "") + f.direction.toFixed(2)]),
                          },
                        },
                        {
                          title: `Local explanation · ${fp.label}`,
                          paragraphs: [
                            `Baseline risk: ${(fp.base * 100).toFixed(1)}% → final risk: ${(fp.final * 100).toFixed(1)}%.`,
                          ],
                          table: {
                            head: ["Feature", "Value", "SHAP"],
                            body: fp.contribs.map((c) => [c.feature, c.value, (c.shap >= 0 ? "+" : "") + c.shap.toFixed(2)]),
                          },
                        },
                        {
                          title: "Limitations",
                          paragraphs: [
                            "Performance was validated on retrospective ICSRs through 2024-09; pediatric (<18y) cohort under-represented. SHAP explanations reflect feature attribution to model output, not biological causality.",
                          ],
                        },
                      ],
                      footer: "PV-XAI Model Card • Confidential",
                    });
                    toast({ title: "Model card exported" });
                  }}
                >
                  <Download className="h-3.5 w-3.5" /> Export model card
                </Button>
                <Button size="sm" className="gap-1.5"><Brain className="h-3.5 w-3.5" /> Re-train</Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard label="Model Version" value="PV-XAI v3.4.1" delta="Deployed 12 days ago" trend="flat" icon={Brain} />
              <KpiCard label="AUROC" value="0.927" delta="+0.014 vs prior version" trend="down" icon={Target} intent="success" />
              <KpiCard label="Precision @ 90% recall" value="0.84" delta="Validated on 4,203 cases" trend="flat" icon={Target} />
              <KpiCard label="Training Samples" value="218,394" delta="ICSRs through 2024-09" trend="flat" icon={Database} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <div className="xl:col-span-2">
                <GlobalFeatureImportance features={globalFeatures} />
              </div>
              <SignalsBySOC />
            </div>

            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Local Explanation · Force Plot</h2>
                  <p className="text-xs text-muted-foreground">Trace a single prediction from baseline risk to final probability</p>
                </div>
                <Select value={caseId} onValueChange={(v) => setCaseId(v as typeof caseId)}>
                  <SelectTrigger className="w-full sm:w-[420px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(caseForcePlots).map(([id, v]) => (
                      <SelectItem key={id} value={id}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <ForcePlot caseLabel={fp.label} baseValue={fp.base} finalValue={fp.final} contributions={fp.contribs} />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Xai;
