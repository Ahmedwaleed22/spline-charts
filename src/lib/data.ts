/**
 * Synthetic terminal telemetry.
 *
 * Everything here is generated from a fixed seed so the server render and the
 * client render agree, and so a scenario always looks the same on reload.
 * Swap these functions for your API layer: the components only read the shapes
 * declared at the bottom of this file.
 */

export type ScenarioId = "live" | "peak" | "hold";

export const SCENARIOS: { id: ScenarioId; label: string; note: string }[] = [
  { id: "live", label: "Live shift", note: "Normal working conditions" },
  { id: "peak", label: "Peak arrival", note: "Vessel bunching, three berths worked" },
  { id: "hold", label: "Storm hold", note: "Gantries stowed, gate metered" },
];

/** Terminals run three eight-hour shifts; A starts at 06:00 UTC. */
export function shiftFor(date: Date): "A" | "B" | "C" {
  const h = date.getUTCHours();
  if (h >= 6 && h < 14) return "A";
  if (h >= 14 && h < 22) return "B";
  return "C";
}

/**
 * "Sat 9 Aug · 14:32 UTC", the way a supervisor writes it on a handover sheet.
 * Explicit UTC parts so the string never depends on the reader's timezone.
 */
export function formatShiftStamp(date: Date): string {
  const day = date.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
  const dayNum = date.toLocaleDateString("en-GB", { day: "numeric", timeZone: "UTC" });
  const month = date.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  return `${day} ${dayNum} ${month} · ${hh}:${mm} UTC`;
}

export const MOVE_TYPES = [
  { id: "import", label: "Import", color: "var(--series-1)" },
  { id: "export", label: "Export", color: "var(--series-2)" },
  { id: "transship", label: "Transship", color: "var(--series-3)" },
  { id: "empty", label: "Empty", color: "var(--series-4)" },
] as const;

export type MoveTypeId = (typeof MOVE_TYPES)[number]["id"];

/* ---------- deterministic noise ---------- */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* ---------- yard geometry ---------- */

export const YARD_ROWS = ["A", "B"] as const;
export const YARD_COLS = [1, 2, 3, 4, 5, 6] as const;

/** Stacks per block: 4 rows across, 5 bays deep. */
export const BLOCK_ROWS = 4;
export const BLOCK_BAYS = 5;
export const MAX_TIER = 5;
export const SLOTS_PER_BLOCK = BLOCK_ROWS * BLOCK_BAYS * MAX_TIER;

export type Block = {
  id: string;
  row: number;
  col: number;
  /** Containers on the ground, in TEU. */
  teu: number;
  capacity: number;
  /** 0–1 */
  fill: number;
  /** Mean days a box has been sitting in this block. */
  dwellDays: number;
  /** Powered reefer plugs in use. */
  reefer: number;
  movesPerHour: number;
  /** Which service the block is currently allocated to. */
  service: string;
  status: "nominal" | "watch" | "over";
};

const SERVICES = [
  "MRD-7 Northbound",
  "Cape Loop 2",
  "Feeder Gulf",
  "MRD-3 Eastbound",
  "Reefer block",
  "Empty depot",
];

export function getBlocks(scenario: ScenarioId): Block[] {
  const blocks: Block[] = [];
  const bias = scenario === "peak" ? 0.22 : scenario === "hold" ? 0.1 : 0;
  const dwellBias = scenario === "hold" ? 2.6 : scenario === "peak" ? 0.7 : 0;

  YARD_ROWS.forEach((rowLabel, row) => {
    YARD_COLS.forEach((colLabel, col) => {
      const id = `${rowLabel}${colLabel}`;
      const rnd = mulberry32(hash(id + scenario));
      const base = 0.36 + rnd() * 0.48 + bias;
      const fill = Math.min(0.98, base);
      const capacity = SLOTS_PER_BLOCK;
      const teu = Math.round(fill * capacity);
      const dwellDays = Math.round((1.4 + rnd() * 5.2 + dwellBias) * 10) / 10;
      const status: Block["status"] =
        dwellDays > 6.5 || fill > 0.92 ? "over" : dwellDays > 4.4 || fill > 0.82 ? "watch" : "nominal";

      blocks.push({
        id,
        row,
        col,
        teu,
        capacity,
        fill,
        dwellDays,
        reefer: Math.round(rnd() * 44),
        movesPerHour:
          scenario === "hold"
            ? Math.round(rnd() * 9)
            : Math.round(14 + rnd() * 26 + (scenario === "peak" ? 12 : 0)),
        service: SERVICES[(hash(id) + col) % SERVICES.length],
        status,
      });
    });
  });

  return blocks;
}

/** Per-stack tier counts, so the 3D yard has texture instead of flat plateaus. */
export function stackHeights(block: Block): number[] {
  const rnd = mulberry32(hash(block.id + "stacks"));
  const stacks = BLOCK_ROWS * BLOCK_BAYS;
  const target = block.fill * MAX_TIER;
  return Array.from({ length: stacks }, () => {
    const jitter = (rnd() - 0.5) * 2.1;
    return Math.max(0, Math.min(MAX_TIER, Math.round(target + jitter)));
  });
}

/* ---------- time series ---------- */

export type HourPoint = { hour: number; label: string } & Record<MoveTypeId, number>;

export function getThroughput(scenario: ScenarioId): HourPoint[] {
  const rnd = mulberry32(hash("throughput" + scenario));
  return Array.from({ length: 24 }, (_, hour) => {
    // Two working peaks: morning gate rush and the evening vessel window.
    const shape =
      0.42 +
      0.58 * Math.exp(-((hour - 9) ** 2) / 12) +
      0.72 * Math.exp(-((hour - 18) ** 2) / 16);
    const damp = scenario === "hold" ? (hour > 10 && hour < 20 ? 0.22 : 0.7) : 1;
    const gain = scenario === "peak" ? 1.38 : 1;
    const s = shape * damp * gain;
    return {
      hour,
      label: `${String(hour).padStart(2, "0")}:00`,
      import: Math.round(s * (58 + rnd() * 22)),
      export: Math.round(s * (46 + rnd() * 20)),
      transship: Math.round(s * (24 + rnd() * 18)),
      empty: Math.round(s * (14 + rnd() * 12)),
    };
  });
}

export type DwellBucket = { label: string; teu: number; overdue: boolean };

export function getDwellBuckets(scenario: ScenarioId): DwellBucket[] {
  const blocks = getBlocks(scenario);
  const buckets = [
    { label: "0–1 d", min: 0, max: 1 },
    { label: "1–2 d", min: 1, max: 2 },
    { label: "2–4 d", min: 2, max: 4 },
    { label: "4–6 d", min: 4, max: 6 },
    { label: "6–8 d", min: 6, max: 8 },
    { label: "8 d +", min: 8, max: 99 },
  ];
  const rnd = mulberry32(hash("dwell" + scenario));
  const total = blocks.reduce((sum, b) => sum + b.teu, 0);
  const weights = buckets.map((b, i) => {
    const mean = blocks.reduce((s, blk) => s + blk.dwellDays, 0) / blocks.length;
    const centre = (b.min + Math.min(b.max, 10)) / 2;
    return Math.exp(-((centre - mean) ** 2) / 9) * (0.8 + rnd() * 0.4) + (i === 5 ? 0.05 : 0);
  });
  const sum = weights.reduce((a, b) => a + b, 0);
  return buckets.map((b, i) => ({
    label: b.label,
    teu: Math.round((weights[i] / sum) * total),
    overdue: b.min >= 6,
  }));
}

export type Crane = {
  id: string;
  berth: string;
  status: "working" | "idle" | "stowed";
  movesPerHour: number;
  series: number[];
};

export function getCranes(scenario: ScenarioId): Crane[] {
  return ["QC-01", "QC-02", "QC-03", "QC-04", "QC-05", "QC-06"].map((id, i) => {
    const rnd = mulberry32(hash(id + scenario));
    const stowed = scenario === "hold";
    const idle = !stowed && (scenario === "live" ? i >= 4 : i >= 5);
    const ceiling = stowed ? 0 : idle ? 6 : scenario === "peak" ? 38 : 32;
    const series = Array.from({ length: 16 }, (_, t) =>
      Math.max(0, Math.round(ceiling * (0.62 + 0.38 * Math.sin(t / 2.4 + i)) * (0.8 + rnd() * 0.35)))
    );
    return {
      id,
      berth: `Berth ${String.fromCharCode(65 + Math.floor(i / 2))}`,
      status: stowed ? "stowed" : idle ? "idle" : "working",
      movesPerHour: series[series.length - 1],
      series,
    };
  });
}

export type Kpi = {
  label: string;
  value: string;
  unit: string;
  delta: number;
  deltaLabel: string;
  /** Whether a rise in this number is a good thing. */
  riseIsGood: boolean;
  /** Recent trend behind the headline figure, oldest first. */
  spark: number[];
  /** What the trend is measured over, for the sparkline's accessible name. */
  sparkWindow: string;
};

export function getKpis(scenario: ScenarioId): Kpi[] {
  const throughput = getThroughput(scenario);
  const blocks = getBlocks(scenario);
  const cranes = getCranes(scenario);

  const teuToday = throughput.reduce(
    (s, h) => s + h.import + h.export + h.transship + h.empty,
    0
  );
  const avgDwell =
    Math.round((blocks.reduce((s, b) => s + b.dwellDays, 0) / blocks.length) * 10) / 10;
  const yardUse = Math.round(
    (blocks.reduce((s, b) => s + b.teu, 0) / blocks.reduce((s, b) => s + b.capacity, 0)) * 100
  );
  const craneRate = Math.round(
    cranes.filter((c) => c.status === "working").reduce((s, c) => s + c.movesPerHour, 0) /
      Math.max(1, cranes.filter((c) => c.status === "working").length)
  );

  const deltas: Record<ScenarioId, number[]> = {
    live: [4.1, -2.4, 1.8, 3.2],
    peak: [18.6, 9.7, 7.4, 11.3],
    hold: [-41.2, 34.8, 4.9, -63.5],
  };
  const d = deltas[scenario];

  /** A 14-point run-up that lands exactly on the current figure. */
  const trend = (key: string, end: number, drift: number) => {
    const rnd = mulberry32(hash(key + scenario));
    const start = end / (1 + drift / 100);
    return Array.from({ length: 14 }, (_, i) => {
      const t = i / 13;
      const wobble = (rnd() - 0.5) * Math.abs(end) * 0.09 * (1 - t * 0.7);
      return Math.max(0, start + (end - start) * t + wobble);
    });
  };

  // Crane rate is the mean of the working gantries, hour by hour.
  const working = cranes.filter((c) => c.status === "working");
  const craneTrend = working.length
    ? working[0].series.map(
        (_, t) => working.reduce((s, c) => s + c.series[t], 0) / working.length
      )
    : trend("crane", craneRate, d[3]);

  return [
    {
      label: "Moves today",
      value: teuToday.toLocaleString("en-US"),
      unit: "moves",
      delta: d[0],
      deltaLabel: "vs. 7-day mean",
      riseIsGood: true,
      spark: throughput.map((h) => h.import + h.export + h.transship + h.empty),
      sparkWindow: "24 h",
    },
    {
      label: "Mean dwell",
      value: avgDwell.toFixed(1),
      unit: "days",
      delta: d[1],
      deltaLabel: "vs. 7-day mean",
      riseIsGood: false,
      spark: trend("dwell", avgDwell, d[1]),
      sparkWindow: "14 d",
    },
    {
      label: "Yard occupancy",
      value: String(yardUse),
      unit: "%",
      delta: d[2],
      deltaLabel: "vs. 7-day mean",
      riseIsGood: false,
      spark: trend("occupancy", yardUse, d[2]),
      sparkWindow: "14 d",
    },
    {
      label: "Crane rate",
      value: String(craneRate),
      unit: "moves / hr",
      delta: d[3],
      deltaLabel: "vs. 7-day mean",
      riseIsGood: true,
      spark: craneTrend,
      sparkWindow: "4 h",
    },
  ];
}

export type GateRow = { time: string; lane: string; trucks: number; waitMin: number };

export function getGate(scenario: ScenarioId): GateRow[] {
  const rnd = mulberry32(hash("gate" + scenario));
  const lanes = ["In 1–4", "In 5–8", "Out 1–3", "Out 4–6", "Reefer", "OOG"];
  const load = scenario === "peak" ? 1.5 : scenario === "hold" ? 0.35 : 1;
  return lanes.map((lane, i) => ({
    time: `${String(14 - i).padStart(2, "0")}:30`,
    lane,
    trucks: Math.round((8 + rnd() * 26) * load),
    waitMin: Math.round((6 + rnd() * 22) * (scenario === "hold" ? 1.9 : load)),
  }));
}

/* ==================================================================
   Gallery datasets
   ------------------------------------------------------------------
   These back the "chart types we can build" section. They use the same
   seeded generator as the console above, so every example is stable
   across renders and reloads.
   ================================================================== */

/* ---------- berth timeline (Gantt) ---------- */

export type BerthCall = {
  vessel: string;
  berth: string;
  /** Hours from 00:00, may be fractional. */
  start: number;
  end: number;
  moveType: MoveTypeId;
};

export function getBerthCalls(scenario: ScenarioId): BerthCall[] {
  const rnd = mulberry32(hash("berth" + scenario));
  const vessels = [
    ["MV Kestrel", "Berth A", "import"],
    ["MV Ardent", "Berth A", "export"],
    ["MV Solveig", "Berth B", "transship"],
    ["MV Corvid", "Berth B", "import"],
    ["MV Tamar", "Berth C", "empty"],
    ["MV Nordkapp", "Berth C", "export"],
  ] as const;

  let cursorByBerth: Record<string, number> = {};
  return vessels.map(([vessel, berth, moveType]) => {
    const from = cursorByBerth[berth] ?? rnd() * 3;
    const length =
      scenario === "hold" ? 3 + rnd() * 3 : 6 + rnd() * (scenario === "peak" ? 7 : 5);
    const end = Math.min(24, from + length);
    cursorByBerth = { ...cursorByBerth, [berth]: end + 1 + rnd() * 2 };
    return { vessel, berth, start: from, end, moveType };
  });
}

/* ---------- fleet status (100% stacked) ---------- */

export type FleetSlice = { label: string; count: number; tone: "ok" | "warn" | "crit" };

export function getFleet(scenario: ScenarioId): FleetSlice[] {
  const total = 64;
  if (scenario === "hold")
    return [
      { label: "Stowed", count: 46, tone: "warn" },
      { label: "Available", count: 12, tone: "ok" },
      { label: "In maintenance", count: 6, tone: "crit" },
    ];
  const working = scenario === "peak" ? 49 : 41;
  const maintenance = scenario === "peak" ? 5 : 7;
  return [
    { label: "Working", count: working, tone: "ok" },
    { label: "Available", count: total - working - maintenance, tone: "warn" },
    { label: "In maintenance", count: maintenance, tone: "crit" },
  ];
}

/* ---------- yard heatmap (block × hour occupancy) ---------- */

export type HeatCell = { block: string; hour: number; value: number };

export function getYardHeat(scenario: ScenarioId): HeatCell[] {
  const blocks = getBlocks(scenario);
  const out: HeatCell[] = [];
  for (const b of blocks) {
    const rnd = mulberry32(hash(b.id + "heat" + scenario));
    for (let hour = 0; hour < 24; hour += 2) {
      // Occupancy tracks the block's own fill, modulated by the shift shape.
      const shape = 0.72 + 0.28 * Math.sin((hour - 4) / 3.8);
      const v = Math.max(0, Math.min(1, b.fill * shape + (rnd() - 0.5) * 0.12));
      out.push({ block: b.id, hour, value: v });
    }
  }
  return out;
}

/* ---------- truck turn time (histogram) ---------- */

export type TurnBin = { from: number; to: number; trucks: number };

export function getTurnTimes(scenario: ScenarioId): {
  bins: TurnBin[];
  median: number;
} {
  const rnd = mulberry32(hash("turn" + scenario));
  const shift = scenario === "hold" ? 16 : scenario === "peak" ? 8 : 0;
  const bins: TurnBin[] = [];
  for (let from = 0; from < 80; from += 10) {
    const centre = from + 5;
    // Right-skewed: most trucks clear quickly, a tail waits.
    const peak = 26 + shift;
    const w = Math.exp(-((centre - peak) ** 2) / (2 * 15 ** 2));
    bins.push({
      from,
      to: from + 10,
      trucks: Math.round(w * (180 + rnd() * 60)),
    });
  }
  const total = bins.reduce((s, b) => s + b.trucks, 0);
  let running = 0;
  let median = 0;
  for (const b of bins) {
    running += b.trucks;
    if (running >= total / 2) {
      median = b.from + 5;
      break;
    }
  }
  return { bins, median };
}

/* ---------- energy draw (stacked area) ---------- */

export type EnergyPoint = { hour: number; cranes: number; reefer: number };

export function getEnergy(scenario: ScenarioId): EnergyPoint[] {
  const rnd = mulberry32(hash("energy" + scenario));
  return Array.from({ length: 24 }, (_, hour) => {
    const working =
      scenario === "hold" ? 0.18 : 0.5 + 0.5 * Math.exp(-((hour - 15) ** 2) / 40);
    return {
      hour,
      cranes: Math.round(working * (620 + rnd() * 160) * (scenario === "peak" ? 1.3 : 1)),
      // Reefer load is near-constant: the boxes are plugged in around the clock.
      reefer: Math.round(340 + rnd() * 40 + Math.sin(hour / 3) * 25),
    };
  });
}

/* ---------- service ranking (ranked bars) ---------- */

export type ServiceRow = { service: string; teu: number; share: number };

export function getServiceRanking(scenario: ScenarioId): ServiceRow[] {
  const blocks = getBlocks(scenario);
  const totals = new Map<string, number>();
  for (const b of blocks) {
    totals.set(b.service, (totals.get(b.service) ?? 0) + b.teu);
  }
  const grand = [...totals.values()].reduce((a, b) => a + b, 0) || 1;
  return [...totals.entries()]
    .map(([service, teu]) => ({ service, teu, share: teu / grand }))
    .sort((a, b) => b.teu - a.teu);
}

/* ---------- shared scales ---------- */

/** Sequential ramp, light → dark, keyed to mean dwell days. */
export function dwellColor(days: number): string {
  if (days < 2) return "var(--dwell-1)";
  if (days < 3.5) return "var(--dwell-2)";
  if (days < 5) return "var(--dwell-3)";
  if (days < 7) return "var(--dwell-4)";
  return "var(--dwell-5)";
}

export const DWELL_HEX = ["#f7d6c1", "#f0a878", "#e8621f", "#b8460f", "#7d2f0a"];

export function dwellHex(days: number): string {
  if (days < 2) return DWELL_HEX[0];
  if (days < 3.5) return DWELL_HEX[1];
  if (days < 5) return DWELL_HEX[2];
  if (days < 7) return DWELL_HEX[3];
  return DWELL_HEX[4];
}

export const DWELL_LEGEND = [
  { hex: DWELL_HEX[0], label: "< 2" },
  { hex: DWELL_HEX[1], label: "2–3.5" },
  { hex: DWELL_HEX[2], label: "3.5–5" },
  { hex: DWELL_HEX[3], label: "5–7" },
  { hex: DWELL_HEX[4], label: "7 +" },
];
