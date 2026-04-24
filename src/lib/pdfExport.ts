import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface PdfSection {
  title?: string;
  paragraphs?: string[];
  table?: {
    head: string[];
    body: (string | number)[][];
  };
}

export interface PdfReportOptions {
  title: string;
  subtitle?: string;
  filename: string;
  meta?: Record<string, string | number | undefined>;
  sections: PdfSection[];
  footer?: string;
}

/** Generate a styled multi-section PDF and trigger download. */
export function downloadPdfReport(opts: PdfReportOptions) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = margin;

  // Brand strip
  doc.setFillColor(37, 99, 235); // primary-ish blue
  doc.rect(0, 0, pageW, 6, "F");

  // Title
  doc.setTextColor(17, 24, 39);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  y = margin + 14;
  doc.text(opts.title, margin, y);

  if (opts.subtitle) {
    y += 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(75, 85, 99);
    doc.text(opts.subtitle, margin, y);
  }

  // Meta block
  if (opts.meta) {
    y += 18;
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    const entries = Object.entries(opts.meta).filter(([, v]) => v !== undefined && v !== "");
    const line = entries.map(([k, v]) => `${k}: ${v}`).join("   •   ");
    const wrapped = doc.splitTextToSize(line, pageW - margin * 2);
    doc.text(wrapped, margin, y);
    y += wrapped.length * 11;
  }

  y += 8;
  doc.setDrawColor(229, 231, 235);
  doc.line(margin, y, pageW - margin, y);
  y += 12;

  // Sections
  for (const s of opts.sections) {
    if (y > doc.internal.pageSize.getHeight() - margin - 60) {
      doc.addPage();
      y = margin;
    }
    if (s.title) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(17, 24, 39);
      doc.text(s.title, margin, y);
      y += 14;
    }
    if (s.paragraphs && s.paragraphs.length) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(55, 65, 81);
      for (const p of s.paragraphs) {
        const lines = doc.splitTextToSize(p, pageW - margin * 2);
        if (y + lines.length * 12 > doc.internal.pageSize.getHeight() - margin - 30) {
          doc.addPage();
          y = margin;
        }
        doc.text(lines, margin, y);
        y += lines.length * 12 + 4;
      }
    }
    if (s.table) {
      autoTable(doc, {
        head: [s.table.head],
        body: s.table.body.map((r) => r.map((c) => (c === null || c === undefined ? "" : String(c)))),
        startY: y,
        margin: { left: margin, right: margin },
        styles: { fontSize: 9, cellPadding: 5, textColor: [55, 65, 81] },
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      });
      // @ts-ignore - lastAutoTable injected by autotable
      y = (doc as any).lastAutoTable.finalY + 14;
    }
    y += 6;
  }

  // Footer with page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    const footer = opts.footer ?? `Generated ${new Date().toLocaleString()} • PV-XAI`;
    doc.text(footer, margin, doc.internal.pageSize.getHeight() - 18);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageW - margin,
      doc.internal.pageSize.getHeight() - 18,
      { align: "right" }
    );
  }

  doc.save(opts.filename);
}