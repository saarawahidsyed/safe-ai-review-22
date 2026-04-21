import { useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings as SettingsIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const Settings = () => {
  const { user, roles, signOut } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [organization, setOrganization] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, organization")
        .eq("id", user.id)
        .maybeSingle();
      setDisplayName(data?.display_name ?? "");
      setOrganization(data?.organization ?? "");
      setLoading(false);
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName, organization })
      .eq("id", user.id);
    setSaving(false);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else toast({ title: "Profile updated" });
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[var(--gradient-subtle)]">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b border-border bg-card/80 backdrop-blur sticky top-0 z-10 flex items-center px-4 gap-3">
            <SidebarTrigger />
            <div className="flex items-center gap-2 text-sm font-medium">
              <SettingsIcon className="h-4 w-4 text-primary" /> Settings
            </div>
          </header>
          <main className="flex-1 p-6 space-y-4 max-w-2xl">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Account</p>
              <h1 className="text-2xl font-semibold text-foreground mt-1">Profile & Preferences</h1>
            </div>

            <Card className="p-5 space-y-4 shadow-[var(--shadow-card)]">
              <div>
                <Label className="text-xs text-muted-foreground">Email</Label>
                <p className="text-sm font-medium text-foreground mt-1">{user?.email}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Roles</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {roles.length === 0 ? (
                    <span className="text-xs text-muted-foreground">No roles assigned</span>
                  ) : (
                    roles.map((r) => (
                      <Badge key={r} variant="outline" className="font-normal capitalize">
                        {r.replace("_", " ")}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dn" className="text-xs">Display name</Label>
                <Input id="dn" value={displayName} onChange={(e) => setDisplayName(e.target.value)} disabled={loading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org" className="text-xs">Organization</Label>
                <Input id="org" value={organization} onChange={(e) => setOrganization(e.target.value)} disabled={loading} />
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={save} disabled={saving || loading} size="sm">
                  {saving ? "Saving…" : "Save changes"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => signOut()}>Sign out</Button>
              </div>
            </Card>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Settings;
