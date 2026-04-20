import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Check, X, Forward, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

type Decision = "confirmed" | "rejected" | "forwarded";

interface Row {
  id: string;
  decision: Decision;
  user_id: string;
  created_at: string;
  display_name?: string;
}

export function CaseDecisionBar({ caseRef }: { caseRef: string }) {
  const { user, hasRole } = useAuth();
  const canDecide = hasRole("reviewer") || hasRole("medical_reviewer") || hasRole("admin");
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState<Decision | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("case_decisions")
      .select("id, decision, user_id, created_at")
      .eq("case_ref", caseRef)
      .order("created_at", { ascending: false });
    const ids = Array.from(new Set((data ?? []).map((r) => r.user_id)));
    let nameMap: Record<string, string> = {};
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, display_name").in("id", ids);
      nameMap = Object.fromEntries((profs ?? []).map((p) => [p.id, p.display_name ?? "Reviewer"]));
    }
    setRows((data ?? []).map((r) => ({ ...r, display_name: nameMap[r.user_id] })));
  };

  useEffect(() => {
    load();
  }, [caseRef]);

  const submit = async (decision: Decision) => {
    if (!user) return;
    setBusy(decision);
    const { error } = await supabase.from("case_decisions").insert({ case_ref: caseRef, user_id: user.id, decision });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(`Decision recorded: ${decision}`);
    load();
  };

  const variant: Record<Decision, string> = {
    confirmed: "bg-success/15 text-success border-success/30",
    rejected: "bg-destructive/15 text-destructive border-destructive/30",
    forwarded: "bg-primary/15 text-primary border-primary/30",
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" disabled={!canDecide || busy !== null} onClick={() => submit("confirmed")} className="gap-1.5">
          {busy === "confirmed" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Confirm causality
        </Button>
        <Button size="sm" variant="outline" disabled={!canDecide || busy !== null} onClick={() => submit("rejected")} className="gap-1.5">
          {busy === "rejected" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />} Reject signal
        </Button>
        <Button size="sm" variant="ghost" disabled={!canDecide || busy !== null} onClick={() => submit("forwarded")} className="ml-auto gap-1.5">
          {busy === "forwarded" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Forward className="h-3.5 w-3.5" />} Forward to Medical Review
        </Button>
      </div>
      {!canDecide && <p className="text-[11px] text-muted-foreground">You don't have a reviewer role; decisions are read-only.</p>}
      {rows.length > 0 && (
        <div className="rounded-md border border-border bg-muted/20 p-3 space-y-1.5">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Decision history</div>
          {rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={variant[r.decision]}>{r.decision}</Badge>
                <span className="text-foreground">{r.display_name ?? "Reviewer"}</span>
              </div>
              <span className="text-muted-foreground tabular-nums">{new Date(r.created_at).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}