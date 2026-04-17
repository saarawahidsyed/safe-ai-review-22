import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ICSRCase } from "@/data/cases";
import { Calendar, Globe, Pill, User } from "lucide-react";

export function CaseHeader({ c }: { c: ICSRCase }) {
  return (
    <Card className="p-5 shadow-[var(--shadow-card)]">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground">{c.id}</span>
            {c.seriousness.map((s) => (
              <Badge key={s} className="bg-destructive/10 text-destructive border-0 hover:bg-destructive/15 font-normal">
                {s}
              </Badge>
            ))}
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            {c.suspectDrug.name} <span className="text-muted-foreground font-normal">·</span>{" "}
            <span className="text-muted-foreground font-normal">{c.events[0].pt}</span>
          </h2>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" />{c.patient.sex}, {c.patient.age}y, {c.patient.weightKg} kg</span>
          <span className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" />{c.reporter.country}</span>
          <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />Reported {c.reporter.date}</span>
          <span className="flex items-center gap-1.5"><Pill className="h-3.5 w-3.5" />Started {c.suspectDrug.startDate}</span>
        </div>
      </div>
    </Card>
  );
}
