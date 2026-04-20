import { useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { AppRole, useAuth } from "@/contexts/AuthContext";

interface Row {
  id: string;
  display_name: string | null;
  organization: string | null;
  roles: AppRole[];
}

const ALL_ROLES: AppRole[] = ["admin", "medical_reviewer", "reviewer"];

export default function Admin() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: profs } = await supabase.from("profiles").select("id, display_name, organization");
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");
    const byUser: Record<string, AppRole[]> = {};
    (roles ?? []).forEach((r) => {
      byUser[r.user_id] = [...(byUser[r.user_id] ?? []), r.role as AppRole];
    });
    setRows((profs ?? []).map((p) => ({ ...p, roles: byUser[p.id] ?? [] })));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const addRole = async (uid: string, role: AppRole) => {
    const { error } = await supabase.from("user_roles").insert({ user_id: uid, role });
    if (error) return toast.error(error.message);
    toast.success(`Granted ${role}`);
    load();
  };
  const removeRole = async (uid: string, role: AppRole) => {
    if (uid === user?.id && role === "admin") {
      return toast.error("You cannot remove your own admin role");
    }
    const { error } = await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", role);
    if (error) return toast.error(error.message);
    toast.success(`Revoked ${role}`);
    load();
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[var(--gradient-subtle)]">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b border-border bg-card/80 backdrop-blur sticky top-0 z-10 flex items-center px-4 gap-3">
            <SidebarTrigger />
            <h1 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" /> Admin · Role management
            </h1>
          </header>
          <main className="flex-1 p-6 space-y-4">
            <p className="text-sm text-muted-foreground max-w-2xl">
              Grant or revoke roles for safety reviewers. <span className="font-medium text-foreground">Reviewers</span> triage cases and add notes;
              <span className="font-medium text-foreground"> medical reviewers</span> finalize causality; <span className="font-medium text-foreground">admins</span> manage users and cases.
            </p>
            <Card className="p-0 overflow-hidden shadow-[var(--shadow-card)]">
              <div className="grid grid-cols-[1fr_200px_1fr_auto] text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/40 px-4 py-2 border-b border-border">
                <div>Reviewer</div>
                <div>Organization</div>
                <div>Roles</div>
                <div className="text-right">Grant</div>
              </div>
              {loading ? (
                <div className="p-6 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : rows.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">No users yet.</div>
              ) : (
                rows.map((r) => (
                  <div key={r.id} className="grid grid-cols-[1fr_200px_1fr_auto] items-center px-4 py-3 border-b border-border last:border-0 text-sm">
                    <div className="font-medium text-foreground truncate">{r.display_name ?? "—"}</div>
                    <div className="text-muted-foreground truncate">{r.organization ?? "—"}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {r.roles.length === 0 ? (
                        <span className="text-xs text-muted-foreground">none</span>
                      ) : (
                        r.roles.map((role) => (
                          <Badge key={role} variant="outline" className="gap-1 pr-1">
                            {role}
                            <button onClick={() => removeRole(r.id, role)} className="rounded hover:bg-destructive/15 p-0.5">
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))
                      )}
                    </div>
                    <div className="flex gap-1.5 justify-end">
                      {ALL_ROLES.filter((role) => !r.roles.includes(role)).map((role) => (
                        <Button key={role} size="sm" variant="outline" className="h-7 gap-1" onClick={() => addRole(r.id, role)}>
                          <UserPlus className="h-3 w-3" /> {role}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </Card>
            {user && (
              <p className="text-[11px] text-muted-foreground">
                Tip: the first user account doesn't get admin automatically. Sign in with your account, then grant yourself admin via the Cloud database (one-time).
              </p>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}