import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, Download, FileText, Search } from "lucide-react";
import { cases as seedCases, ICSRCase } from "@/data/cases";
import { CaseList } from "@/components/cases/CaseList";
import { CaseHeader } from "@/components/cases/CaseHeader";
import { PatientPanel } from "@/components/cases/PatientPanel";
import { NarrativePanel } from "@/components/cases/NarrativePanel";
import { MeddraTable } from "@/components/cases/MeddraTable";
import { CaseNotes } from "@/components/cases/CaseNotes";
import { CaseDecisionBar } from "@/components/cases/CaseDecisionBar";
import { AddCaseDialog } from "@/components/cases/AddCaseDialog";
import { AnalyzeFileDialog } from "@/components/cases/AnalyzeFileDialog";

const Cases = () => {
  const [cases, setCases] = useState<ICSRCase[]>(seedCases);
  const [selectedId, setSelectedId] = useState(seedCases[0].id);
  const c = cases.find((x) => x.id === selectedId)!;

  const handleAdd = (nc: ICSRCase) => {
    setCases((prev) => [nc, ...prev]);
    setSelectedId(nc.id);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[var(--gradient-subtle)]">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b border-border bg-card/80 backdrop-blur sticky top-0 z-10 flex items-center px-4 gap-3">
            <SidebarTrigger />
            <div className="flex-1 max-w-md relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search case ID, drug, event…" className="pl-9 h-9 bg-muted/40 border-transparent focus-visible:bg-background" />
            </div>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-destructive" />
            </Button>
            <div className="h-8 w-8 rounded-full bg-[var(--gradient-primary)] grid place-items-center text-primary-foreground text-xs font-semibold">
              DR
            </div>
          </header>

          <main className="flex-1 p-6 space-y-6 overflow-x-hidden">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Pharmacovigilance / Case Review</p>
                <h1 className="text-2xl font-semibold text-foreground mt-1">Individual Case Safety Reports</h1>
                <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                  Review ICSRs with AI-assisted narrative analysis. Every highlighted phrase is traceable to the model's prediction.
                </p>
              </div>
              <div className="flex gap-2">
                <AnalyzeFileDialog />
                <AddCaseDialog onAdd={handleAdd} />
                <Button variant="outline" size="sm" className="gap-1.5"><Download className="h-3.5 w-3.5" /> CIOMS export</Button>
                <Button size="sm" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> E2B(R3) report</Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
              <div>
                <CaseList cases={cases} selectedId={selectedId} onSelect={setSelectedId} />
              </div>

              <div className="space-y-4 min-w-0">
                <CaseHeader c={c} />

                <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
                  <NarrativePanel narrative={c.narrative} prediction={c.aiPrediction} />
                  <PatientPanel c={c} />
                </div>

                <MeddraTable events={c.events} />

                <CaseNotes caseRef={c.id} />
                <CaseDecisionBar caseRef={c.id} />
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Cases;
