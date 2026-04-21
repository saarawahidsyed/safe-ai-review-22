import { useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, FileText, Gavel } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

type Entry = {
  id: string;
  kind: "note" | "decision";
  case_ref: string;
  user_id: string;
  created_at: string;
  detail: string;
};

const Audit = () => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: notes }, { data: decisions }] = await Promise.all([
        supabase.from("case_notes").select("id, case_ref, user_id, created_at, body").order("created_at", { ascending: false }).limit(100),
        supabase.from("case_decisions").select("id, case_ref, user_id, created_at, decision, rationale").order("created_at", { ascending: false }).limit(100),
      ]);
      const all: Entry[] = [
        ...(notes ?? []).map((n: any) => ({
          id: `n-${n.id}`, kind: "note" as const, case_ref: n.case_ref, user_id: n.user_id,
          created_at: n.created_at, detail: n.body,
        })),
        ...(decisions ?? []).map((d: any) => ({
          id: `d-${d.id}`, kind: "decision" as const, case_ref: d.case_ref, user_id: d.user_id,
          created_at: d.created_at, detail: `${d.decision}${d.rationale ? ` — ${d.rationale}` : ""}`,
        })),
      ].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
      setEntries(all);
      setLoading(false);
    })();
  }, []);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[var(--gradient-subtle)]">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b border-border bg-card/80 backdrop-blur sticky top-0 z-10 flex items-center px-3 sm:px-4 gap-2 sm:gap-3">
            <SidebarTrigger />
            <div className="flex items-center gap-2 text-sm font-medium min-w-0 truncate">
              <ShieldCheck className="h-4 w-4 text-primary" /> Audit & Compliance
            </div>
            <div className="ml-auto h-8 w-8 rounded-full bg-[var(--gradient-primary)] grid place-items-center text-primary-foreground text-xs font-semibold shrink-0">
              DR
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 space-y-4 overflow-x-hidden">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Compliance</p>
              <h1 className="text-xl sm:text-2xl font-semibold text-foreground mt-1">Reviewer Activity Log</h1>
              <p className="text-sm text-muted-foreground mt-1">Notes and causality decisions across all cases. Read-only.</p>
            </div>

            <Card className="shadow-[var(--shadow-card)]">
              {loading ? (
                <div className="p-10 text-center text-sm text-muted-foreground">Loading audit log…</div>
              ) : entries.length === 0 ? (
                <div className="p-10 text-center text-sm text-muted-foreground">No reviewer activity yet.</div>
              ) : (
                <ul className="divide-y divide-border">
                  {entries.map((e) => (
                    <li key={e.id} className="p-3 sm:p-4 flex gap-2 sm:gap-3">
                      <div className={`h-8 w-8 rounded-md grid place-items-center shrink-0 ${e.kind === "decision" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {e.kind === "decision" ? <Gavel className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                          <Badge variant="outline" className="font-normal capitalize">{e.kind}</Badge>
                          <span className="font-mono text-foreground truncate max-w-[160px]">{e.case_ref}</span>
                          <span className="hidden sm:inline">•</span>
                          <span title={new Date(e.created_at).toLocaleString()} className="whitespace-nowrap">
                            {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-foreground mt-1 break-words">{e.detail}</p>
                        <p className="text-[10px] text-muted-foreground/70 mt-1 font-mono truncate">user {e.user_id.slice(0, 8)}…</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Audit;
