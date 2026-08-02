"use client";

interface ExportData {
  request: Record<string, unknown>;
  result: Record<string, unknown>;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href    = url;
  a.download = filename;
  // Must be in the DOM for Firefox + Safari compatibility
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Small delay before revoking so the browser has time to start the download
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportJSON(data: ExportData, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  triggerDownload(blob, `${filename}.json`);
}

export function exportCSV(data: ExportData, filename: string) {
  const result    = data.result;
  const interests = (result.interests as { name: string; tier: string; buyingIntent: string; reason: string }[] | null) ?? [];
  const behaviors = (result.behaviors as { metaAudience: string; parent: string; child: string; score: number; reason: string }[] | null) ?? [];
  const personas  = (result.personas  as { name: string; goal: string; painPoint: string; buyingMotivation: string }[] | null) ?? [];
  const demographics = (result.demographics as { name: string; category: string; subcategory: string; metaPath: string }[] | null) ?? [];

  const esc = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const row = (cells: string[]) => cells.map(esc).join(",");

  const lines = [
    row(["Smarkin AI — Audience Intelligence Report"]),
    row(["Product",       String(data.request.product_name ?? "")]),
    row(["Industry",      String(result.industry ?? "")]),
    row(["Product Type",  String(result.product_type ?? "")]),
    row(["Overall Score", String(result.overall_score ?? "")]),
    row(["Generated",     new Date().toLocaleString()]),
    "",
    row(["INTERESTS", "Tier", "Buying Intent", "Reason"]),
    ...interests.map((i) => row([i.name, i.tier, i.buyingIntent, i.reason])),
    "",
    row(["BEHAVIORS", "Parent", "Child", "Score %", "Reason"]),
    ...behaviors.map((b) => row([b.metaAudience, b.parent, b.child, String(b.score), b.reason])),
    "",
    row(["DEMOGRAPHICS", "Category", "Subcategory", "Meta Path"]),
    ...demographics.map((d) => row([d.name, d.category, d.subcategory, d.metaPath])),
    "",
    row(["PERSONAS", "Goal", "Pain Point", "Buying Motivation"]),
    ...personas.map((p) => row([p.name, p.goal, p.painPoint, p.buyingMotivation])),
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, `${filename}.csv`);
}

export function printReport() {
  window.print();
}
