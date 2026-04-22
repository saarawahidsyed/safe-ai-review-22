import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { ICSRCase } from "@/data/cases";
import { toast } from "@/hooks/use-toast";

interface Props {
  onAdd: (c: ICSRCase) => void;
}

export function AddCaseDialog({ onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    caseId: "",
    age: "",
    sex: "F" as "F" | "M",
    weightKg: "",
    drug: "",
    dose: "",
    indication: "",
    eventPt: "",
    soc: "",
    severity: "Moderate" as "Mild" | "Moderate" | "Severe" | "Life-threatening",
    narrative: "",
    country: "",
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    if (!form.caseId || !form.drug || !form.eventPt) {
      toast({ title: "Missing fields", description: "Case ID, drug, and event are required.", variant: "destructive" });
      return;
    }
    const newCase: ICSRCase = {
      id: form.caseId,
      patient: {
        age: Number(form.age) || 0,
        sex: form.sex,
        weightKg: Number(form.weightKg) || 0,
        ethnicity: "Unknown",
        medicalHistory: [],
      },
      reporter: { type: "Physician", country: form.country || "Unknown", date: new Date().toISOString().slice(0, 10) },
      suspectDrug: {
        name: form.drug,
        dose: form.dose || "Not specified",
        route: "Oral",
        indication: form.indication || "Not specified",
        startDate: new Date().toISOString().slice(0, 10),
      },
      concomitantDrugs: [],
      events: [{ pt: form.eventPt, soc: form.soc || "Unknown", severity: form.severity, outcome: "Unknown", causality: "Possible", onsetDays: 0 }],
      narrative: form.narrative ? [{ text: form.narrative }] : [{ text: "No narrative provided." }],
      aiPrediction: { label: "Manual entry — pending AI review", confidence: 0, topDrivers: [] },
      seriousness: form.severity === "Life-threatening" ? ["Life-threatening"] : [],
    };
    onAdd(newCase);
    toast({ title: "Case added", description: `${form.caseId} created locally.` });
    setOpen(false);
    setForm({ caseId: "", age: "", sex: "F", weightKg: "", drug: "", dose: "", indication: "", eventPt: "", soc: "", severity: "Moderate", narrative: "", country: "" });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add case
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add ICSR Manually</DialogTitle>
          <DialogDescription>Enter the minimum information to create a new case for review.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="col-span-2">
            <Label>Case ID *</Label>
            <Input value={form.caseId} onChange={(e) => set("caseId", e.target.value)} placeholder="ICSR-2024-XXXXX" />
          </div>
          <div>
            <Label>Age</Label>
            <Input type="number" value={form.age} onChange={(e) => set("age", e.target.value)} />
          </div>
          <div>
            <Label>Sex</Label>
            <Select value={form.sex} onValueChange={(v) => set("sex", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="F">Female</SelectItem>
                <SelectItem value="M">Male</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Weight (kg)</Label>
            <Input type="number" value={form.weightKg} onChange={(e) => set("weightKg", e.target.value)} />
          </div>
          <div>
            <Label>Reporter country</Label>
            <Input value={form.country} onChange={(e) => set("country", e.target.value)} />
          </div>
          <div className="col-span-2 border-t pt-3 mt-1">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">Suspect drug</p>
          </div>
          <div>
            <Label>Drug name *</Label>
            <Input value={form.drug} onChange={(e) => set("drug", e.target.value)} placeholder="e.g. Warfarin" />
          </div>
          <div>
            <Label>Dose</Label>
            <Input value={form.dose} onChange={(e) => set("dose", e.target.value)} placeholder="e.g. 5 mg daily" />
          </div>
          <div className="col-span-2">
            <Label>Indication</Label>
            <Input value={form.indication} onChange={(e) => set("indication", e.target.value)} />
          </div>
          <div className="col-span-2 border-t pt-3 mt-1">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">Adverse event</p>
          </div>
          <div>
            <Label>MedDRA PT *</Label>
            <Input value={form.eventPt} onChange={(e) => set("eventPt", e.target.value)} placeholder="e.g. Hepatotoxicity" />
          </div>
          <div>
            <Label>SOC</Label>
            <Input value={form.soc} onChange={(e) => set("soc", e.target.value)} />
          </div>
          <div>
            <Label>Severity</Label>
            <Select value={form.severity} onValueChange={(v) => set("severity", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Mild">Mild</SelectItem>
                <SelectItem value="Moderate">Moderate</SelectItem>
                <SelectItem value="Severe">Severe</SelectItem>
                <SelectItem value="Life-threatening">Life-threatening</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Narrative</Label>
            <Textarea rows={4} value={form.narrative} onChange={(e) => set("narrative", e.target.value)} placeholder="Clinical narrative…" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>Create case</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}