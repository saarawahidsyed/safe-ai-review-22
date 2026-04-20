import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Note {
  id: string;
  case_ref: string;
  user_id: string;
  body: string;
  created_at: string;
  profiles?: { display_name: string | null } | null;
}

export function CaseNotes({ caseRef }: { caseRef: string }) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: rows } = await supabase
      .from("case_notes")
      .select("id, case_ref, user_id, body, created_at")
      .eq("case_ref", caseRef)
      .order("created_at", { ascending: false });
    const ids = Array.from(new Set((rows ?? []).map((r) => r.user_id)));
    let nameMap: Record<string, string> = {};
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, display_name").in("id", ids);
      nameMap = Object.fromEntries((profs ?? []).map((p) => [p.id, p.display_name ?? "Reviewer"]));
    }
    setNotes((rows ?? []).map((r) => ({ ...r, profiles: { display_name: nameMap[r.user_id] ?? "Reviewer" } })));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [caseRef]);

  const submit = async () => {
    if (!user || !body.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("case_notes").insert({ case_ref: caseRef, user_id: user.id, body: body.trim() });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setBody("");
    toast.success("Note added");
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("case_notes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <Card className="p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-3">
        <MessageSquare className="h-3.5 w-3.5" /> Reviewer notes
      </div>
      <div className="space-y-2">
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Add clinical commentary, additional context, or follow-up actions…" rows={3} />
        <div className="flex justify-end">
          <Button size="sm" onClick={submit} disabled={submitting || !body.trim()}>
            {submitting && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />} Save note
          </Button>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {loading ? (
          <p className="text-xs text-muted-foreground">Loading notes…</p>
        ) : notes.length === 0 ? (
          <p className="text-xs text-muted-foreground">No notes yet for this case.</p>
        ) : (
          notes.map((n) => (
            <div key={n.id} className="rounded-md border border-border bg-muted/30 p-3 text-sm">
              <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground mb-1">
                <span className="font-medium text-foreground">{n.profiles?.display_name ?? "Reviewer"}</span>
                <div className="flex items-center gap-2">
                  <span>{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</span>
                  {user?.id === n.user_id && (
                    <button onClick={() => remove(n.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-foreground whitespace-pre-wrap">{n.body}</p>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}