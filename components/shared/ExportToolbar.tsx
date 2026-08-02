"use client";

import { useState } from "react";
import { Download, FileText, FileJson, Table, Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { exportJSON, exportCSV, printReport } from "@/lib/export";

interface ExportToolbarProps {
  request: Record<string, unknown>;
  result: Record<string, unknown>;
  productName: string;
}

export function ExportToolbar({ request, result, productName }: ExportToolbarProps) {
  const [exporting, setExporting] = useState<string | null>(null);
  const slug = productName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const filename = `smarkin-${slug}-${new Date().toISOString().slice(0, 10)}`;

  const handle = async (type: string, fn: () => void) => {
    setExporting(type);
    await new Promise((r) => setTimeout(r, 300));
    fn();
    setExporting(null);
  };

  return (
    <div className="bg-surface border border-border rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center flex-none">
          <Download size={14} className="text-primary" />
        </div>
        <div>
          <p className="font-heading font-semibold text-text-primary text-sm">Export Report</p>
          <p className="text-xs text-text-muted">Download your audience intelligence in any format</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Button
          variant="ghost"
          size="sm"
          loading={exporting === "pdf"}
          className="gap-2 border border-border"
          onClick={() => handle("pdf", printReport)}
        >
          <FileText size={14} />
          Export PDF
        </Button>
        <Button
          variant="ghost"
          size="sm"
          loading={exporting === "csv"}
          className="gap-2 border border-border"
          onClick={() => handle("csv", () => exportCSV({ request, result }, filename))}
        >
          <Table size={14} />
          Export CSV
        </Button>
        <Button
          variant="ghost"
          size="sm"
          loading={exporting === "json"}
          className="gap-2 border border-border"
          onClick={() => handle("json", () => exportJSON({ request, result }, filename))}
        >
          <FileJson size={14} />
          Export JSON
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 border border-border"
          onClick={printReport}
        >
          <Printer size={14} />
          Print Report
        </Button>
      </div>
    </div>
  );
}
