import { Card } from "@/components/ui/card";
import type { ICSRCase } from "@/data/cases";

export function PatientPanel({ c }: { c: ICSRCase }) {
  const rows: [string, string][] = [
    ["Age", `${c.patient.age} years`],
    ["Sex", c.patient.sex === "F" ? "Female" : "Male"],
    ["Weight", `${c.patient.weightKg} kg`],
    ["Ethnicity", c.patient.ethnicity],
  ];
  return (
    <Card className="p-5 shadow-[var(--shadow-card)] space-y-4">
      <div>
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-3">Demographics</h3>
        <dl className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="flex flex-col">
              <dt className="text-xs text-muted-foreground">{k}</dt>
              <dd className="text-foreground font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="border-t border-border pt-4">
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">Medical History</h3>
        <ul className="space-y-1.5">
          {c.patient.medicalHistory.map((h) => (
            <li key={h} className="text-sm text-foreground flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 rounded-full bg-muted-foreground shrink-0" />
              {h}
            </li>
          ))}
        </ul>
      </div>
      <div className="border-t border-border pt-4">
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">Suspect Drug</h3>
        <div className="text-sm space-y-1">
          <div className="font-semibold text-foreground">{c.suspectDrug.name}</div>
          <div className="text-muted-foreground">{c.suspectDrug.dose} · {c.suspectDrug.route}</div>
          <div className="text-xs text-muted-foreground italic">Indication: {c.suspectDrug.indication}</div>
        </div>
      </div>
      <div className="border-t border-border pt-4">
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">Concomitant Medications</h3>
        <ul className="space-y-1">
          {c.concomitantDrugs.map((d) => (
            <li key={d} className="text-sm text-foreground">{d}</li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
