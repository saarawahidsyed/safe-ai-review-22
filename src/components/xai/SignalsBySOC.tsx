import { Card } from "@/components/ui/card";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const defaultData = [
  { soc: "GI disorders", count: 142 },
  { soc: "Nervous system", count: 118 },
  { soc: "Cardiac", count: 96 },
  { soc: "Hepatobiliary", count: 71 },
  { soc: "Renal", count: 64 },
  { soc: "Skin", count: 58 },
  { soc: "Musculoskeletal", count: 47 },
  { soc: "Psychiatric", count: 32 },
  { soc: "Endocrine", count: 28 },
  { soc: "Vascular", count: 24 },
  { soc: "Infections", count: 21 },
  { soc: "Investigations", count: 17 },
];

export function SignalsBySOC({ data = defaultData }: { data?: { soc: string; count: number }[] }) {
  return (
    <Card className="p-5 shadow-[var(--shadow-card)]">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-foreground">Signals by System Organ Class</h3>
        <p className="text-xs text-muted-foreground">Distribution of AI-detected signals · last 90 days</p>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
            <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis dataKey="soc" type="category" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} width={110} />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
              cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill="hsl(var(--primary))" fillOpacity={0.4 + (data.length - i) * 0.07} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
