import { Card } from "@/components/ui/card";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const data = [
  { m: "Jan", reports: 320, signals: 8 },
  { m: "Feb", reports: 410, signals: 11 },
  { m: "Mar", reports: 380, signals: 9 },
  { m: "Apr", reports: 520, signals: 14 },
  { m: "May", reports: 610, signals: 17 },
  { m: "Jun", reports: 580, signals: 15 },
  { m: "Jul", reports: 720, signals: 21 },
  { m: "Aug", reports: 690, signals: 19 },
  { m: "Sep", reports: 810, signals: 24 },
];

export function TrendChart() {
  return (
    <Card className="p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Adverse Event Reports</h3>
          <p className="text-xs text-muted-foreground">Monthly volume vs. AI-flagged signals</p>
        </div>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="reports" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="signals" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.4} />
                <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="m" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Area type="monotone" dataKey="reports" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#reports)" />
            <Area type="monotone" dataKey="signals" stroke="hsl(var(--accent))" strokeWidth={2} fill="url(#signals)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
