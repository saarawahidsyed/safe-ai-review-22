import { useMemo, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Pill, Sparkles, AlertTriangle, ShieldAlert, Stethoscope, Activity, Loader2, X, Download, Apple, UserSearch } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { downloadPdfReport } from "@/lib/pdfExport";
import { useCasesStore, listPatients, getPatientProfile } from "@/lib/casesStore";

interface SideEffect {
  effect: string;
  likelihood: "Common" | "Uncommon" | "Rare";
  severity: "Mild" | "Moderate" | "Severe";
}
interface Recommendation {
  drug: string;
  line: "first-line" | "alternative" | "adjunct";
  dose: string;
  rationale: string;
  comorbidityAdjustments?: string;
  sideEffects: SideEffect[];
  monitoring?: string[];
}
interface AvoidItem { drug: string; reason: string }
interface DietPlan {
  foodsToFavor: string[];
  foodsToAvoid: string[];
  hydration?: string;
  mealTiming?: string;
  lifestyleNotes?: string[];
}
interface Result {
  recommendations: Recommendation[];
  avoid: AvoidItem[];
  interactionAlerts?: string[];
  summary: string;
  dietPlan?: DietPlan;
  disclaimer: string;
}

const ChipInput = ({ label, placeholder, items, setItems }: { label: string; placeholder: string; items: string[]; setItems: (v: string[]) => void }) => {
  const [val, setVal] = useState("");
  const add = () => {
    const v = val.trim();
    if (!v) return;
    if (!items.includes(v)) setItems([...items, v]);
    setVal("");
  };
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder}
        />
        <Button type="button" variant="secondary" onClick={add}>Add</Button>
      </div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {items.map((it) => (
            <Badge key={it} variant="secondary" className="gap-1 pr-1">
              {it}
              <button onClick={() => setItems(items.filter((x) => x !== it))} className="hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

const sevColor = (s: string) =>
  s === "Severe" ? "bg-destructive/15 text-destructive border-destructive/30"
  : s === "Moderate" ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
  : "bg-muted text-muted-foreground border-border";

const lineColor = (l: string) =>
  l === "first-line" ? "bg-primary/15 text-primary border-primary/30"
  : l === "alternative" ? "bg-secondary text-secondary-foreground border-border"
  : "bg-muted text-muted-foreground border-border";

const Prescribe = () => {
  const { cases } = useCasesStore();
  const patients = useMemo(() => listPatients(cases), [cases]);
  const [patientId, setPatientId] = useState<string>("");
  const [disease, setDisease] = useState("");
  const [comorbidities, setComorbidities] = useState<string[]>([]);
  const [meds, setMeds] = useState<string[]>([]);
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("");
  const [allergies, setAllergies] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const applyPatient = (pid: string) => {
    setPatientId(pid);
    if (pid === "__none__") {
      setPatientId("");
      return;
    }
    const profile = getPatientProfile(cases, pid);
    if (!profile) return;
    setAge(String(profile.age));
    setSex(profile.sex);
    setComorbidities(profile.conditions);
    setMeds(profile.medications);
    if (!disease && profile.cases[0]?.suspectDrug?.indication) {
      setDisease(profile.cases[0].suspectDrug.indication);
    }
    toast({
      title: `Patient ${pid} loaded`,
      description: `${profile.medications.length} med(s) • ${profile.conditions.length} condition(s)`,
    });
  };

  const submit = async () => {
    if (!disease.trim()) {
      toast({ title: "Disease required", description: "Please enter a primary disease or condition.", variant: "destructive" });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("prescribe-recommendations", {
        body: {
          disease,
          comorbidities,
          currentMedications: meds,
          patient: {
            age: age ? Number(age) : undefined,
            sex: sex || undefined,
            allergies: allergies || undefined,
          },
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setResult(data as Result);
    } catch (e: any) {
      toast({ title: "Recommendation failed", description: e?.message ?? "Try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const exportPdf = () => {
    if (!result) return;
    const sections: any[] = [
      {
        title: "Patient",
        paragraphs: [
          `Primary indication: ${disease}.`,
          `Age: ${age || "—"} • Sex: ${sex || "—"} • Allergies: ${allergies || "None reported"}.`,
          `Comorbidities: ${comorbidities.length ? comorbidities.join(", ") : "None recorded"}.`,
          `Current medications: ${meds.length ? meds.join(", ") : "None recorded"}.`,
        ],
      },
      { title: "Clinical summary", paragraphs: [result.summary] },
      {
        title: "Recommended drugs",
        table: {
          head: ["Drug", "Line", "Dose", "Rationale"],
          body: result.recommendations.map((r) => [r.drug, r.line, r.dose, r.rationale]),
        },
      },
      {
        title: "Predicted side effects",
        table: {
          head: ["Drug", "Effect", "Likelihood", "Severity"],
          body: result.recommendations.flatMap((r) =>
            r.sideEffects.map((se) => [r.drug, se.effect, se.likelihood, se.severity])
          ),
        },
      },
    ];
    if (result.avoid?.length) {
      sections.push({
        title: "Drugs to avoid",
        table: { head: ["Drug", "Reason"], body: result.avoid.map((a) => [a.drug, a.reason]) },
      });
    }
    if (result.interactionAlerts?.length) {
      sections.push({ title: "Interaction alerts", paragraphs: result.interactionAlerts });
    }
    if (result.dietPlan) {
      const d = result.dietPlan;
      const para: string[] = [];
      if (d.foodsToFavor?.length) para.push(`Foods to favor: ${d.foodsToFavor.join(", ")}.`);
      if (d.foodsToAvoid?.length) para.push(`Foods to avoid: ${d.foodsToAvoid.join(", ")}.`);
      if (d.hydration) para.push(`Hydration: ${d.hydration}`);
      if (d.mealTiming) para.push(`Meal timing: ${d.mealTiming}`);
      if (d.lifestyleNotes?.length) para.push(`Lifestyle: ${d.lifestyleNotes.join(" • ")}`);
      sections.push({ title: "Dietary plan", paragraphs: para });
    }
    sections.push({ title: "Disclaimer", paragraphs: [result.disclaimer] });

    downloadPdfReport({
      title: "Treatment Plan",
      subtitle: `AI decision-support recommendations for ${disease}`,
      filename: `treatment-plan-${disease.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.pdf`,
      meta: { Generated: new Date().toLocaleString(), Comorbidities: comorbidities.length, "Active meds": meds.length },
      sections,
      footer: "PV-XAI Treatment Advisor • Not a substitute for clinical judgement",
    });
    toast({ title: "Treatment plan exported" });
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b border-border flex items-center px-4 gap-2 bg-card/40 backdrop-blur sticky top-0 z-10">
            <SidebarTrigger />
            <div className="flex items-center gap-2">
              <Pill className="h-4 w-4 text-primary" />
              <h1 className="text-sm font-semibold">Treatment Advisor</h1>
              <Badge variant="outline" className="ml-2 text-[10px] uppercase tracking-wider">AI decision support</Badge>
            </div>
          </header>

          <div className="p-4 md:p-6 space-y-6 max-w-6xl w-full mx-auto">
            <Card className="p-5 md:p-6 shadow-[var(--shadow-card)] space-y-5">
              <div>
                <h2 className="text-base font-semibold flex items-center gap-2"><Stethoscope className="h-4 w-4 text-primary" />Patient & Condition</h2>
                <p className="text-xs text-muted-foreground mt-1">Enter the primary disease and any comorbidities. The AI returns drug suggestions, contraindications, and predicted side effects.</p>
              </div>

              <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <UserSearch className="h-3.5 w-3.5 text-primary" />
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Load from existing patient</Label>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Select value={patientId || "__none__"} onValueChange={applyPatient}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select Patient ID…" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      <SelectItem value="__none__">— No patient (manual entry) —</SelectItem>
                      {patients.map((p) => (
                        <SelectItem key={p.patient.patientId} value={p.patient.patientId}>
                          {p.patient.patientId} · {p.patient.sex}, {p.patient.age}y · {p.suspectDrug.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {patientId && (
                    <Button variant="ghost" size="sm" onClick={() => { setPatientId(""); }} className="text-xs">
                      Clear patient
                    </Button>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Auto-fills age, sex, comorbidities and current medications from the linked ICSR case(s).
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="disease">Primary disease / indication *</Label>
                  <Input id="disease" value={disease} onChange={(e) => setDisease(e.target.value)} placeholder="e.g., Type 2 diabetes mellitus" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="age">Age</Label>
                    <Input id="age" type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="55" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sex">Sex</Label>
                    <Input id="sex" value={sex} onChange={(e) => setSex(e.target.value)} placeholder="M / F" />
                  </div>
                  <div className="space-y-2 col-span-2 sm:col-span-1">
                    <Label htmlFor="allergies">Allergies</Label>
                    <Input id="allergies" value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="Penicillin" />
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <ChipInput label="Comorbidities" placeholder="e.g., CKD stage 3, Hypertension" items={comorbidities} setItems={setComorbidities} />
                <ChipInput label="Current medications" placeholder="e.g., Metformin 1000 mg BID" items={meds} setItems={setMeds} />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 pt-2">
                {result && (
                  <Button variant="outline" onClick={exportPdf} className="gap-2 w-full sm:w-auto">
                    <Download className="h-4 w-4" /> Export PDF
                  </Button>
                )}
                <Button onClick={submit} disabled={loading} className="gap-2 w-full sm:w-auto">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {loading ? "Analyzing…" : "Get recommendations"}
                </Button>
              </div>
            </Card>

            {result && (
              <div className="space-y-5">
                <Card className="p-5 shadow-[var(--shadow-card)] space-y-2">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold">Clinical summary</h3>
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed">{result.summary}</p>
                </Card>

                <div className="grid gap-4">
                  {result.recommendations.map((r) => (
                    <Card key={r.drug} className="p-5 shadow-[var(--shadow-card)] space-y-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-base font-semibold">{r.drug}</h4>
                            <Badge variant="outline" className={`text-[10px] uppercase tracking-wider ${lineColor(r.line)}`}>{r.line}</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">Dose: <span className="text-foreground font-medium">{r.dose}</span></div>
                        </div>
                      </div>

                      <p className="text-sm text-foreground/90">{r.rationale}</p>

                      {r.comorbidityAdjustments && (
                        <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs">
                          <span className="font-medium text-foreground">Comorbidity adjustment: </span>
                          <span className="text-muted-foreground">{r.comorbidityAdjustments}</span>
                        </div>
                      )}

                      <Separator />

                      <div>
                        <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">Predicted side effects</div>
                        <div className="grid sm:grid-cols-2 gap-2">
                          {r.sideEffects.map((se, i) => (
                            <div key={i} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
                              <div className="text-sm truncate">{se.effect}</div>
                              <div className="flex gap-1 shrink-0">
                                <Badge variant="outline" className="text-[10px]">{se.likelihood}</Badge>
                                <Badge variant="outline" className={`text-[10px] ${sevColor(se.severity)}`}>{se.severity}</Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {r.monitoring && r.monitoring.length > 0 && (
                        <div>
                          <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1.5">Monitoring</div>
                          <ul className="text-sm space-y-1">
                            {r.monitoring.map((m, i) => (
                              <li key={i} className="flex gap-2"><span className="mt-1.5 h-1 w-1 rounded-full bg-muted-foreground shrink-0" />{m}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>

                {result.avoid?.length > 0 && (
                  <Card className="p-5 shadow-[var(--shadow-card)] space-y-3 border-destructive/30">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-destructive" />
                      <h3 className="text-sm font-semibold">Drugs to avoid</h3>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {result.avoid.map((a, i) => (
                        <div key={i} className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2">
                          <div className="text-sm font-medium">{a.drug}</div>
                          <div className="text-xs text-muted-foreground">{a.reason}</div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {result.interactionAlerts && result.interactionAlerts.length > 0 && (
                  <Card className="p-5 shadow-[var(--shadow-card)] space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <h3 className="text-sm font-semibold">Interaction alerts</h3>
                    </div>
                    <ul className="text-sm space-y-1">
                      {result.interactionAlerts.map((a, i) => (
                        <li key={i} className="flex gap-2"><span className="mt-1.5 h-1 w-1 rounded-full bg-amber-500 shrink-0" />{a}</li>
                      ))}
                    </ul>
                  </Card>
                )}

                <p className="text-[11px] text-muted-foreground italic px-1">{result.disclaimer}</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Prescribe;