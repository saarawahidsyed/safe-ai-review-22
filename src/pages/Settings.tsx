import { useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings as SettingsIcon, Bell, Palette, Download, FileText, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { downloadPdfReport } from "@/lib/pdfExport";

type Prefs = {
  notifyNewSignals: boolean;
  notifyCaseAssigned: boolean;
  notifyWeeklyDigest: boolean;
  theme: "system" | "light" | "dark";
  density: "comfortable" | "compact";
  defaultExport: "pdf" | "csv";
};

const DEFAULT_PREFS: Prefs = {
  notifyNewSignals: true,
  notifyCaseAssigned: true,
  notifyWeeklyDigest: false,
  theme: "system",
  density: "comfortable",
  defaultExport: "pdf",
};

const PREFS_KEY = "pv-xai:prefs";

const Settings = () => {
  const { user, roles, signOut } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [organization, setOrganization] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState<Prefs>(() => {
    if (typeof window === "undefined") return DEFAULT_PREFS;
    try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") }; }
    catch { return DEFAULT_PREFS; }
  });

  const updatePref = <K extends keyof Prefs>(key: K, value: Prefs[K]) => {
    setPrefs((p) => {
      const next = { ...p, [key]: value };
      try { localStorage.setItem(PREFS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
    if (key === "theme") {
      const root = document.documentElement;
      const v = value as Prefs["theme"];
      if (v === "dark") root.classList.add("dark");
      else if (v === "light") root.classList.remove("dark");
      else {
        const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        root.classList.toggle("dark", dark);
      }
    }
  };

  useEffect(() => {
    // apply theme on mount
    updatePref("theme", prefs.theme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const exportProfilePdf = () => {
    downloadPdfReport({
      title: "Account Profile",
      subtitle: "PV-XAI account configuration export",
      filename: `pv-xai-profile-${new Date().toISOString().slice(0, 10)}.pdf`,
      meta: { Generated: new Date().toLocaleString(), Email: user?.email },
      sections: [
        {
          title: "Profile",
          table: {
            head: ["Field", "Value"],
            body: [
              ["Email", user?.email ?? "—"],
              ["Display name", displayName || "—"],
              ["Organization", organization || "—"],
              ["Roles", roles.join(", ") || "—"],
            ],
          },
        },
        {
          title: "Preferences",
          table: {
            head: ["Setting", "Value"],
            body: [
              ["Theme", prefs.theme],
              ["Density", prefs.density],
              ["Default export", prefs.defaultExport.toUpperCase()],
              ["Notify on new signals", prefs.notifyNewSignals ? "Yes" : "No"],
              ["Notify on case assignment", prefs.notifyCaseAssigned ? "Yes" : "No"],
              ["Weekly digest", prefs.notifyWeeklyDigest ? "Yes" : "No"],
            ],
          },
        },
      ],
    });
    toast({ title: "Profile exported" });
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[var(--gradient-subtle)]">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b border-border bg-card/80 backdrop-blur sticky top-0 z-10 flex items-center px-3 sm:px-4 gap-2 sm:gap-3">
            <SidebarTrigger />
            <div className="flex items-center gap-2 text-sm font-medium min-w-0 truncate">
              <SettingsIcon className="h-4 w-4 text-primary" /> Settings
            </div>
            <div className="ml-auto h-8 w-8 rounded-full bg-[var(--gradient-primary)] grid place-items-center text-primary-foreground text-xs font-semibold shrink-0">
              {(user?.email?.[0] ?? "U").toUpperCase()}
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 space-y-4 max-w-3xl w-full overflow-x-hidden">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Account</p>
              <h1 className="text-xl sm:text-2xl font-semibold text-foreground mt-1">Profile & Preferences</h1>
            </div>

            <Card className="p-4 md:p-5 space-y-4 shadow-[var(--shadow-card)]">
              <div className="min-w-0">
                <Label className="text-xs text-muted-foreground">Email</Label>
                <p className="text-sm font-medium text-foreground mt-1 break-all">{user?.email}</p>
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
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button onClick={save} disabled={saving || loading} size="sm" className="w-full sm:w-auto">
                  {saving ? "Saving…" : "Save changes"}
                </Button>
                <Button variant="outline" size="sm" className="w-full sm:w-auto gap-1.5" onClick={exportProfilePdf}>
                  <Download className="h-3.5 w-3.5" /> Export profile PDF
                </Button>
                <Button variant="outline" size="sm" onClick={() => signOut()} className="w-full sm:w-auto">Sign out</Button>
              </div>
            </Card>

            <Card className="p-4 md:p-5 space-y-4 shadow-[var(--shadow-card)]">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Notifications</h3>
              </div>
              <Separator />
              {[
                { k: "notifyNewSignals", label: "New signals detected", desc: "Email me when the detection engine flags a new disproportionality signal." },
                { k: "notifyCaseAssigned", label: "Case assigned to me", desc: "Notify me when a reviewer assigns an ICSR for my action." },
                { k: "notifyWeeklyDigest", label: "Weekly digest", desc: "A Monday morning summary of signal & case activity." },
              ].map((row) => (
                <div key={row.k} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{row.label}</div>
                    <div className="text-xs text-muted-foreground">{row.desc}</div>
                  </div>
                  <Switch
                    checked={prefs[row.k as keyof Prefs] as boolean}
                    onCheckedChange={(v) => updatePref(row.k as keyof Prefs, v as any)}
                  />
                </div>
              ))}
            </Card>

            <Card className="p-4 md:p-5 space-y-4 shadow-[var(--shadow-card)]">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Appearance & Defaults</h3>
              </div>
              <Separator />
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Theme</Label>
                  <Select value={prefs.theme} onValueChange={(v) => updatePref("theme", v as Prefs["theme"])}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system">System</SelectItem>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Density</Label>
                  <Select value={prefs.density} onValueChange={(v) => updatePref("density", v as Prefs["density"])}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="comfortable">Comfortable</SelectItem>
                      <SelectItem value="compact">Compact</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1"><FileText className="h-3 w-3" /> Default export</Label>
                  <Select value={prefs.defaultExport} onValueChange={(v) => updatePref("defaultExport", v as Prefs["defaultExport"])}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            <Card className="p-4 md:p-5 space-y-3 shadow-[var(--shadow-card)]">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Compliance</h3>
              </div>
              <Separator />
              <p className="text-xs text-muted-foreground">
                All exports include a footer with generation timestamp and confidentiality marker.
                User actions in the workspace are audit-logged per 21 CFR Part 11 and EU GVP Module VI.
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-[10px] uppercase tracking-wider">21 CFR Part 11</Badge>
                <Badge variant="outline" className="text-[10px] uppercase tracking-wider">EU GVP Module VI</Badge>
                <Badge variant="outline" className="text-[10px] uppercase tracking-wider">ICH E2B(R3)</Badge>
                <Badge variant="outline" className="text-[10px] uppercase tracking-wider">MedDRA v27.0</Badge>
              </div>
            </Card>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Settings;
