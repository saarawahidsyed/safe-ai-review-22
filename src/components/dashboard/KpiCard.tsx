import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down" | "flat";
  icon: LucideIcon;
  intent?: "default" | "warning" | "destructive" | "success";
}

const intentMap = {
  default: "text-primary bg-primary/10",
  warning: "text-warning bg-warning/10",
  destructive: "text-destructive bg-destructive/10",
  success: "text-success bg-success/10",
};

export function KpiCard({ label, value, delta, trend, icon: Icon, intent = "default" }: KpiCardProps) {
  return (
    <Card className="p-5 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] transition-shadow">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold text-foreground">{value}</p>
          {delta && (
            <p className={cn(
              "text-xs font-medium",
              trend === "up" && "text-destructive",
              trend === "down" && "text-success",
              trend === "flat" && "text-muted-foreground",
            )}>
              {delta}
            </p>
          )}
        </div>
        <div className={cn("h-10 w-10 rounded-lg grid place-items-center", intentMap[intent])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}
