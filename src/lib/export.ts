import type { Block, Crane, GateRow, HourPoint, Kpi, ScenarioId } from "./data";
import { SCENARIOS } from "./data";

/** RFC 4180: quote every field, double any embedded quote. */
function cell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function rows(lines: (string | number)[][]): string {
  return lines.map((line) => line.map(cell).join(",")).join("\r\n");
}

export type ShiftReport = {
  scenario: ScenarioId;
  kpis: Kpi[];
  blocks: Block[];
  cranes: Crane[];
  gate: GateRow[];
  throughput: HourPoint[];
  generatedAt: Date;
};

/**
 * One CSV holding every table on the page, section by section.
 *
 * A single file is deliberate: a shift supervisor forwards one attachment, and
 * Excel/Sheets open it without an import step. Swap this for an XLSX or a PDF
 * writer without touching the button.
 */
export function buildShiftReportCsv(r: ShiftReport): string {
  const scenario = SCENARIOS.find((s) => s.id === r.scenario);
  const stamp = r.generatedAt.toISOString();

  const sections: string[] = [
    rows([
      ["Meridian Terminal shift report"],
      ["Scenario", scenario?.label ?? r.scenario],
      ["Conditions", scenario?.note ?? ""],
      ["Generated", stamp],
      ["Note", "Demonstration data generated from a fixed seed. Not operational."],
    ]),

    rows([
      [],
      ["Key indicators"],
      ["Metric", "Value", "Unit", "Change %", "Compared with"],
      ...r.kpis.map((k) => [k.label, k.value, k.unit, k.delta.toFixed(1), k.deltaLabel]),
    ]),

    rows([
      [],
      ["Yard manifest"],
      [
        "Block",
        "Allocation",
        "Slots used",
        "Capacity",
        "Fill %",
        "Mean dwell (days)",
        "Reefer plugs",
        "Moves per hour",
        "State",
      ],
      ...r.blocks.map((b) => [
        b.id,
        b.service,
        b.teu,
        b.capacity,
        Math.round(b.fill * 100),
        b.dwellDays.toFixed(1),
        b.reefer,
        b.movesPerHour,
        b.status,
      ]),
    ]),

    rows([
      [],
      ["Quay cranes"],
      ["Crane", "Berth", "State", "Moves per hour"],
      ...r.cranes.map((c) => [c.id, c.berth, c.status, c.movesPerHour]),
    ]),

    rows([
      [],
      ["Gate queue"],
      ["Lane group", "Trucks waiting", "Median turn time (min)"],
      ...r.gate.map((g) => [g.lane, g.trucks, g.waitMin]),
    ]),

    rows([
      [],
      ["Moves per hour"],
      ["Hour (UTC)", "Import", "Export", "Transship", "Empty", "Total"],
      ...r.throughput.map((h) => [
        h.label,
        h.import,
        h.export,
        h.transship,
        h.empty,
        h.import + h.export + h.transship + h.empty,
      ]),
    ]),
  ];

  return sections.join("\r\n");
}

export function shiftReportFilename(scenario: ScenarioId, at: Date): string {
  const d = at.toISOString().slice(0, 10);
  const t = at.toISOString().slice(11, 16).replace(":", "");
  return `meridian-shift-report-${scenario}-${d}-${t}Z.csv`;
}

/** Triggers a client-side download without a network round trip. */
export function downloadCsv(filename: string, csv: string) {
  // The BOM keeps Excel from mangling non-ASCII characters (the em dashes in
  // the service names, for one).
  const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next frame so Safari has committed the navigation.
  requestAnimationFrame(() => URL.revokeObjectURL(url));
}
