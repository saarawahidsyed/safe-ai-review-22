import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, Download, FileSearch } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export function AnalyzeFileDialog() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!file) {
      toast({ title: "Select a file", description: "Choose a CSV, JSON, or text file with case data.", variant: "destructive" });
      return;
    }
    setLoading(true);
    setReport(null);
    try {
      const content = await file.text();
      const { data, error } = await supabase.functions.invoke("analyze-signals-file", {
        body: { filename: file.name, content },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setReport(data.report);
      toast({ title: "Analysis complete", description: "Signal report generated." });
    } catch (e: any) {
      toast({ title: "Analysis failed", description: e.message ?? String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!report) return;
    const blob = new Blob([report], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `signal-report-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setReport(null); setFile(null); } }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <FileSearch className="h-3.5 w-3.5" /> Analyze file
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Analyze Case File for Signals</DialogTitle>
          <DialogDescription>
            Upload a CSV, JSON, or text file containing case-level data. AI will detect drug-event signals and produce a report.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="mb-2 block">Data file</Label>
            <Input
              type="file"
              accept=".csv,.json,.txt,.tsv,.md"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file && <p className="text-xs text-muted-foreground mt-1.5">{file.name} • {(file.size / 1024).toFixed(1)} KB</p>}
          </div>

          <Button onClick={handleAnalyze} disabled={!file || loading} className="gap-1.5 w-full">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing…</> : <><Upload className="h-4 w-4" /> Run signal analysis</>}
          </Button>

          {report && (
            <div className="border border-border rounded-md bg-muted/30">
              <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Signal Report</p>
                <Button variant="ghost" size="sm" onClick={handleDownload} className="h-7 gap-1.5">
                  <Download className="h-3.5 w-3.5" /> Download .md
                </Button>
              </div>
              <pre className="p-4 text-xs whitespace-pre-wrap font-mono text-foreground max-h-[50vh] overflow-y-auto">{report}</pre>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}