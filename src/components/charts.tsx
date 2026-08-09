"use client";

import { Fragment, useMemo, useState } from "react";
import {
  MOVE_TYPES,
  type BerthCall,
  type Crane,
  type DwellBucket,
  type EnergyPoint,
  type FleetSlice,
  type HeatCell,
  type HourPoint,
  type MoveTypeId,
  type ServiceRow,
  type TurnBin,
} from "@/lib/data";

const AXIS = "var(--ink-3)";
const GRID = "var(--line-soft)";
const MONO = "var(--ff-mono), monospace";

/**
 * Sequential ramp for DOM marks.
 *
 * The 3D yard paints containers with the raw dwell ramp; these are the same
 * hue re-stepped per theme so the terminal step still clears the panel it sits
 * on (validated at 2.18:1 light, 2.52:1 dark).
 */
const SEQ = [
  "var(--seq-1)",
  "var(--seq-2)",
  "var(--seq-3)",
  "var(--seq-4)",
  "var(--seq-5)",
];

/** Gridline step from the 1 / 2 / 5 / 10 sequence, so ticks are always round. */
function niceStep(range: number, target = 4) {
  const raw = Math.max(range, 1) / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return step * mag;
}

/* ================================================================
   Throughput: stacked hourly moves, with series toggling
   ================================================================ */

export function ThroughputChart({ data }: { data: HourPoint[] }) {
  const [idx, setIdx] = useState<number | null>(null);
  const [off, setOff] = useState<Set<MoveTypeId>>(new Set());

  const shown = MOVE_TYPES.filter((m) => !off.has(m.id));

  const W = 760;
  const H = 284;
  // Top padding leaves room for the peak callout even when a bar hits the ceiling.
  const pad = { t: 34, r: 14, b: 34, l: 46 };
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;

  const totals = useMemo(
    () => data.map((d) => shown.reduce((s, m) => s + d[m.id], 0)),
    [data, shown]
  );

  const max = Math.max(...totals, 1);
  const step = niceStep(max);
  const ceiling = Math.max(step, Math.ceil(max / step) * step);
  const bandW = plotW / data.length;
  const barW = Math.min(22, bandW - 6);
  const peak = totals.indexOf(max);

  const y = (v: number) => pad.t + plotH - (v / ceiling) * plotH;
  const ticks = Array.from({ length: ceiling / step + 1 }, (_, i) => i * step);
  const active = idx == null ? null : data[idx];

  const toggle = (id: MoveTypeId) =>
    setOff((prev) => {
      const next = new Set(prev);
      // Never let the operator empty the chart entirely.
      if (next.has(id)) next.delete(id);
      else if (next.size < MOVE_TYPES.length - 1) next.add(id);
      return next;
    });

  return (
    <div style={{ position: "relative" }}>
      <div className="legend">
        {MOVE_TYPES.map((m) => {
          const isOff = off.has(m.id);
          return (
            <button
              key={m.id}
              type="button"
              className="legend__item"
              data-off={isOff}
              aria-pressed={!isOff}
              onClick={() => toggle(m.id)}
            >
              <span
                className="swatch"
                style={{ background: m.color, marginRight: 0 }}
              />
              {m.label}
            </button>
          );
        })}
        <span
          className="eyebrow"
          style={{ marginLeft: "auto", alignSelf: "center" }}
        >
          Moves / hour · UTC
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label={`Container moves per hour by move type over 24 hours. Peak ${max} moves at ${data[peak].label}.`}
        onMouseLeave={() => setIdx(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={pad.l}
              x2={W - pad.r}
              y1={y(t)}
              y2={y(t)}
              stroke={GRID}
              strokeWidth={1}
            />
            <text
              x={pad.l - 10}
              y={y(t) + 3.5}
              textAnchor="end"
              fontSize={10}
              fill={AXIS}
              fontFamily={MONO}
            >
              {t}
            </text>
          </g>
        ))}

        {/* Hovered hour gets a band behind it rather than dimming everything. */}
        {idx != null && (
          <rect
            x={pad.l + idx * bandW}
            y={pad.t}
            width={bandW}
            height={plotH}
            fill="var(--accent-wash)"
          />
        )}

        {data.map((d, i) => {
          const x = pad.l + i * bandW + (bandW - barW) / 2;
          let cursor = 0;
          const dim = idx != null && idx !== i;
          return (
            <g
              key={d.hour}
              opacity={dim ? 0.5 : 1}
              style={{ transition: "opacity 120ms linear" }}
            >
              {shown.map((m, si) => {
                const v = d[m.id];
                const h = (v / ceiling) * plotH;
                const top = pad.t + plotH - cursor - h;
                cursor += h;
                const isTop = si === shown.length - 1;
                return (
                  <rect
                    key={m.id}
                    x={x}
                    y={top}
                    width={barW}
                    height={Math.max(0, h - 1.5)}
                    fill={m.color}
                    rx={isTop ? 1.5 : 0}
                  />
                );
              })}
            </g>
          );
        })}

        {/* One direct label: the number worth reading straight off the chart.
            The 34px top padding guarantees it clears even a ceiling-height bar. */}
        {idx == null &&
          (() => {
            const cx = pad.l + peak * bandW + bandW / 2;
            const barTop = y(max);
            const anchor =
              cx < pad.l + 44 ? "start" : cx > W - pad.r - 44 ? "end" : "middle";
            return (
              <g>
                <line
                  x1={cx}
                  x2={cx}
                  y1={barTop - 5}
                  y2={barTop - 15}
                  stroke="var(--line-strong)"
                />
                <text
                  x={cx}
                  y={barTop - 20}
                  textAnchor={anchor}
                  fontSize={10.5}
                  fill="var(--ink)"
                  fontFamily={MONO}
                >
                  {max} peak
                </text>
              </g>
            );
          })()}

        {data.map((d, i) =>
          i % 3 === 0 ? (
            <text
              key={d.hour}
              x={pad.l + i * bandW + bandW / 2}
              y={H - 12}
              textAnchor="middle"
              fontSize={10}
              fill={AXIS}
              fontFamily={MONO}
            >
              {d.label.slice(0, 2)}
            </text>
          ) : null
        )}

        <line
          x1={pad.l}
          x2={W - pad.r}
          y1={y(0)}
          y2={y(0)}
          stroke="var(--line-strong)"
        />

        {data.map((d, i) => (
          <rect
            key={`hit-${d.hour}`}
            x={pad.l + i * bandW}
            y={pad.t}
            width={bandW}
            height={plotH}
            fill="transparent"
            onMouseEnter={() => setIdx(i)}
          />
        ))}
      </svg>

      {active && (
        <div
          className="tooltip"
          style={{
            top: 34,
            left: `${((pad.l + (idx! + 0.5) * bandW) / W) * 100}%`,
            transform: `translateX(${idx! > data.length / 2 ? "-108%" : "8%"})`,
          }}
        >
          <div
            className="num"
            style={{ fontSize: "var(--fs-xs)", marginBottom: "var(--sp-2)" }}
          >
            {active.label}–{String((active.hour + 1) % 24).padStart(2, "0")}:00
          </div>
          {MOVE_TYPES.map((m) => (
            <div
              key={m.id}
              className="tooltip__row"
              style={{ opacity: off.has(m.id) ? 0.4 : 1 }}
            >
              <span
                className="swatch"
                style={{ background: m.color, marginRight: 0 }}
              />
              <span>{m.label}</span>
              <span className="num">{active[m.id]}</span>
            </div>
          ))}
          <div className="tooltip__total">
            <span className="muted">Total shown</span>
            <span className="num">{totals[idx!]}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================
   Dwell distribution: bars carry the same ramp as the 3D yard
   ================================================================ */

export function DwellChart({ data }: { data: DwellBucket[] }) {
  const max = Math.max(...data.map((d) => d.teu), 1);
  const total = data.reduce((s, d) => s + d.teu, 0);
  const overdue = data.filter((d) => d.overdue).reduce((s, d) => s + d.teu, 0);

  return (
    <div>
      {data.map((d, i) => (
        <div
          key={d.label}
          style={{
            display: "grid",
            gridTemplateColumns: "54px 1fr 42px 38px",
            alignItems: "center",
            gap: "var(--sp-3)",
            padding: "var(--sp-1) 0",
          }}
        >
          <span
            className="num muted"
            style={{ fontSize: "var(--fs-2xs)" }}
          >
            {d.label}
          </span>
          <span className="meter meter--tall">
            <span
              className="meter__fill"
              style={{
                width: `${(d.teu / max) * 100}%`,
                background: SEQ[Math.min(i, SEQ.length - 1)],
              }}
            />
          </span>
          <span
            className="num"
            style={{ fontSize: "var(--fs-2xs)", textAlign: "right" }}
          >
            {d.teu}
          </span>
          <span
            className="num muted"
            style={{ fontSize: "var(--fs-2xs)", textAlign: "right" }}
          >
            {Math.round((d.teu / Math.max(1, total)) * 100)}%
          </span>
        </div>
      ))}
      <p
        style={{
          marginTop: "var(--sp-4)",
          paddingTop: "var(--sp-3)",
          borderTop: "1px solid var(--line-soft)",
          fontSize: "var(--fs-xs)",
          color: "var(--ink-2)",
        }}
      >
        <strong
          className="num"
          style={{ color: "var(--ink)", fontWeight: 600 }}
        >
          {Math.round((overdue / Math.max(1, total)) * 100)}%
        </strong>{" "}
        of boxes are past the 6-day free period and accruing demurrage.
      </p>
    </div>
  );
}

/* ================================================================
   Quay cranes: small multiples
   ================================================================ */

const CRANE_STATUS: Record<Crane["status"], { cls: string; label: string }> = {
  working: { cls: "badge--ok", label: "Working" },
  idle: { cls: "badge--warn", label: "Idle" },
  stowed: { cls: "badge--neutral", label: "Stowed" },
};

export function CraneStrip({ cranes }: { cranes: Crane[] }) {
  const ceiling = Math.max(...cranes.flatMap((c) => c.series), 1);

  return (
    <div className="strip">
      {cranes.map((c) => {
        const w = 120;
        const h = 32;
        const step = w / Math.max(1, c.series.length - 1);
        const pts = c.series.map(
          (v, i) => [i * step, h - (v / ceiling) * (h - 2) - 1] as const
        );
        const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
        const stowed = c.status === "stowed";
        const stroke = stowed ? "var(--ink-3)" : "var(--series-1)";
        const status = CRANE_STATUS[c.status];

        return (
          <div className="strip__cell" key={c.id}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "var(--sp-2)",
              }}
            >
              <span className="num" style={{ fontSize: "var(--fs-2xs)" }}>
                {c.id}
              </span>
              <span className={`badge ${status.cls}`}>{status.label}</span>
            </div>

            <p
              className="num"
              style={{
                fontSize: "var(--fs-xl)",
                lineHeight: 1.15,
                marginTop: "var(--sp-2)",
              }}
            >
              {c.movesPerHour}
              <span
                className="muted"
                style={{
                  fontSize: "var(--fs-micro)",
                  marginLeft: 4,
                  fontFamily: "var(--ff-body), sans-serif",
                  letterSpacing: 0,
                }}
              >
                mv/h
              </span>
            </p>

            <svg
              viewBox={`0 0 ${w} ${h}`}
              width="100%"
              height={h}
              preserveAspectRatio="none"
              style={{ marginTop: "var(--sp-2)", display: "block" }}
              aria-hidden="true"
            >
              <polyline
                points={`0,${h} ${line} ${w},${h}`}
                fill={stroke}
                opacity={0.1}
                stroke="none"
              />
              <polyline
                points={line}
                fill="none"
                stroke={stroke}
                strokeWidth={1.6}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>

            <p
              className="muted"
              style={{ fontSize: "var(--fs-micro)", marginTop: "var(--sp-1)" }}
            >
              {c.berth} · last 4 h
            </p>
          </div>
        );
      })}
    </div>
  );
}

/* ================================================================
   GALLERY: additional chart forms
   ------------------------------------------------------------------
   Each one is picked for the job its data does, not for variety:
   spans over time → Gantt; parts of a whole → one proportion bar;
   magnitude across two categorical axes → sequential heatmap;
   a shape of a distribution → histogram with a reference line;
   two additive series over time → stacked area; ranking → sorted bars.
   ================================================================ */

const TONE: Record<FleetSlice["tone"], string> = {
  ok: "var(--ok)",
  warn: "var(--warn)",
  crit: "var(--crit)",
};

/* ---------------- berth calls, as a Gantt ---------------- */

export function BerthTimeline({ calls }: { calls: BerthCall[] }) {
  const berths = [...new Set(calls.map((c) => c.berth))];
  const colorOf = (m: MoveTypeId) =>
    MOVE_TYPES.find((t) => t.id === m)?.color ?? "var(--series-1)";

  return (
    <div>
      <div className="legend">
        {MOVE_TYPES.map((m) => (
          <span key={m.id} className="legend__item" style={{ cursor: "default" }}>
            <span className="swatch" style={{ background: m.color, marginRight: 0 }} />
            {m.label}
          </span>
        ))}
      </div>

      {berths.map((berth) => (
        <div className="gantt-row" key={berth}>
          <span className="num" style={{ fontSize: "var(--fs-2xs)" }}>
            {berth}
          </span>
          <div className="gantt-track">
            {calls
              .filter((c) => c.berth === berth)
              .map((c) => (
                <span
                  key={c.vessel}
                  className="gantt-bar"
                  style={{
                    left: `${(c.start / 24) * 100}%`,
                    width: `${((c.end - c.start) / 24) * 100}%`,
                    background: colorOf(c.moveType),
                  }}
                  title={`${c.vessel} · ${String(Math.floor(c.start)).padStart(2, "0")}:00–${String(Math.floor(c.end)).padStart(2, "0")}:00`}
                >
                  {c.vessel}
                </span>
              ))}
          </div>
        </div>
      ))}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "104px 1fr",
          gap: "var(--sp-3)",
          marginTop: "var(--sp-1)",
        }}
      >
        <span />
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {["00", "06", "12", "18", "24"].map((h) => (
            <span
              key={h}
              className="num"
              style={{ fontSize: "var(--fs-micro)", color: "var(--ink-3)" }}
            >
              {h}
            </span>
          ))}
        </div>
      </div>

      <p className="chart-note">
        Vessel calls against berth, across the working day. Bar colour is the
        dominant move type for the call.
      </p>
    </div>
  );
}

/* ---------------- fleet mix, as one proportion bar ---------------- */

export function FleetMix({ fleet }: { fleet: FleetSlice[] }) {
  const total = fleet.reduce((s, f) => s + f.count, 0) || 1;

  return (
    <div>
      <div
        className="proportion"
        role="img"
        aria-label={fleet
          .map((f) => `${f.label} ${f.count} of ${total}`)
          .join(", ")}
      >
        {fleet.map((f) => (
          <span
            key={f.label}
            className="proportion__seg"
            style={{
              width: `${(f.count / total) * 100}%`,
              background: TONE[f.tone],
            }}
          />
        ))}
      </div>

      <div className="legend-rows">
        {fleet.map((f) => (
          <div className="legend-row" key={f.label}>
            <span
              className="swatch"
              style={{ background: TONE[f.tone], marginRight: 0 }}
            />
            <span style={{ color: "var(--ink-2)" }}>{f.label}</span>
            <span className="num">{f.count}</span>
            <span className="num muted" style={{ minWidth: 34, textAlign: "right" }}>
              {Math.round((f.count / total) * 100)}%
            </span>
          </div>
        ))}
      </div>

      <p className="chart-note">
        {total} pieces of yard equipment by state. One bar rather than a pie: parts
        of a whole are easier to compare along a shared edge.
      </p>
    </div>
  );
}

/* ---------------- yard occupancy heatmap ---------------- */

export function YardHeatmap({ cells }: { cells: HeatCell[] }) {
  const blocks = [...new Set(cells.map((c) => c.block))];
  const hours = [...new Set(cells.map((c) => c.hour))].sort((a, b) => a - b);

  // Index every value into a lookup once, rather than scanning the array per cell.
  const byKey = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of cells) m.set(`${c.block}:${c.hour}`, c.value);
    return m;
  }, [cells]);

  // Step across the range the data actually occupies. Anchoring to 0–100 %
  // when nothing is below 35 % wastes two of the five steps.
  const values = cells.map((c) => c.value);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const stepOf = (v: number) =>
    SEQ[Math.min(SEQ.length - 1, Math.floor(((v - lo) / span) * SEQ.length))];

  return (
    <div>
      <div className="heat" style={{ gridTemplateColumns: `26px repeat(${hours.length}, 1fr)` }}>
        <span />
        {hours.map((h) => (
          <span
            key={h}
            className="num"
            style={{ color: "var(--ink-3)", textAlign: "center" }}
          >
            {String(h).padStart(2, "0")}
          </span>
        ))}

        {blocks.map((b) => (
          <Fragment key={b}>
            <span
              className="num"
              style={{ color: "var(--ink-3)", alignSelf: "center" }}
            >
              {b}
            </span>
            {hours.map((h) => {
              const v = byKey.get(`${b}:${h}`) ?? lo;
              return (
                <span
                  key={h}
                  className="heat__cell"
                  style={{ background: stepOf(v) }}
                  title={`Block ${b} at ${String(h).padStart(2, "0")}:00, ${Math.round(v * 100)}% occupied`}
                />
              );
            })}
          </Fragment>
        ))}
      </div>

      <div className="heat__scale">
        <span className="num muted">{Math.round(lo * 100)}%</span>
        <span className="heat__scale-ramp">
          {SEQ.map((c) => (
            <span key={c} className="heat__scale-step" style={{ background: c }} />
          ))}
        </span>
        <span className="num muted">{Math.round(hi * 100)}% occupied</span>
      </div>

      <p className="chart-note">
        Ground-slot occupancy by block and hour. One hue, light to
        dark, so magnitude never gets a second colour.
      </p>
    </div>
  );
}

/* ---------------- truck turn time histogram ---------------- */

export function TurnTimeHistogram({
  bins,
  median,
}: {
  bins: TurnBin[];
  median: number;
}) {
  const W = 360;
  const H = 168;
  const pad = { t: 24, r: 8, b: 26, l: 34 };
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;
  const max = Math.max(...bins.map((b) => b.trucks), 1);
  const step = niceStep(max);
  const ceiling = Math.max(step, Math.ceil(max / step) * step);
  const bandW = plotW / bins.length;
  const span = bins[bins.length - 1].to;

  const y = (v: number) => pad.t + plotH - (v / ceiling) * plotH;
  const medianX = pad.l + (median / span) * plotW;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label={`Truck turn time distribution. Median ${median} minutes.`}
      >
        {[0, ceiling / 2, ceiling].map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke={GRID} />
            <text
              x={pad.l - 6}
              y={y(t) + 3.5}
              textAnchor="end"
              fontSize={9}
              fill={AXIS}
              fontFamily={MONO}
            >
              {t}
            </text>
          </g>
        ))}

        {bins.map((b, i) => {
          const h = (b.trucks / ceiling) * plotH;
          return (
            <rect
              key={b.from}
              x={pad.l + i * bandW + 1}
              y={y(b.trucks)}
              width={bandW - 2}
              height={Math.max(0, h)}
              fill="var(--series-1)"
              rx={2}
            >
              <title>{`${b.from}–${b.to} min · ${b.trucks} trucks`}</title>
            </rect>
          );
        })}

        {/* Reference line: the one number a gate manager is judged on. */}
        <line
          x1={medianX}
          x2={medianX}
          y1={pad.t - 8}
          y2={pad.t + plotH}
          stroke="var(--accent)"
          strokeWidth={1.5}
          strokeDasharray="3 3"
        />
        <text
          x={medianX + 5}
          y={pad.t - 11}
          fontSize={9.5}
          fill="var(--accent)"
          fontFamily={MONO}
        >
          median {median}m
        </text>

        {bins.map((b, i) =>
          i % 2 === 0 ? (
            <text
              key={b.from}
              x={pad.l + i * bandW + bandW / 2}
              y={H - 9}
              textAnchor="middle"
              fontSize={9}
              fill={AXIS}
              fontFamily={MONO}
            >
              {b.from}
            </text>
          ) : null
        )}
        <line x1={pad.l} x2={W - pad.r} y1={y(0)} y2={y(0)} stroke="var(--line-strong)" />
      </svg>

      <p className="chart-note">
        Trucks by minutes from gate-in to gate-out. The dashed rule is the median.
        A distribution needs its summary drawn on it, not printed beside it.
      </p>
    </div>
  );
}

/* ---------------- energy draw, stacked area ---------------- */

export function EnergyArea({ data }: { data: EnergyPoint[] }) {
  const W = 360;
  const H = 176;
  const pad = { t: 14, r: 8, b: 26, l: 40 };
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;

  const totals = data.map((d) => d.cranes + d.reefer);
  const step = niceStep(Math.max(...totals));
  const ceiling = Math.max(step, Math.ceil(Math.max(...totals) / step) * step);
  const x = (i: number) => pad.l + (i / (data.length - 1)) * plotW;
  const y = (v: number) => pad.t + plotH - (v / ceiling) * plotH;

  const band = (upper: number[], lower: number[]) =>
    [
      ...upper.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`),
      ...lower
        .map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`)
        .reverse(),
    ].join(" ");

  const base = data.map(() => 0);
  const reefer = data.map((d) => d.reefer);

  return (
    <div>
      <div className="legend">
        <span className="legend__item" style={{ cursor: "default" }}>
          <span
            className="swatch"
            style={{ background: "var(--series-3)", marginRight: 0 }}
          />
          Reefer plugs
        </span>
        <span className="legend__item" style={{ cursor: "default" }}>
          <span
            className="swatch"
            style={{ background: "var(--series-1)", marginRight: 0 }}
          />
          Quay cranes
        </span>
        <span className="eyebrow" style={{ marginLeft: "auto", alignSelf: "center" }}>
          kW
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label="Electrical demand over 24 hours, split between reefer plugs and quay cranes."
      >
        {[0, ceiling / 2, ceiling].map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke={GRID} />
            <text
              x={pad.l - 6}
              y={y(t) + 3.5}
              textAnchor="end"
              fontSize={9}
              fill={AXIS}
              fontFamily={MONO}
            >
              {t}
            </text>
          </g>
        ))}

        <polygon points={band(reefer, base)} fill="var(--series-3)" opacity={0.85} />
        <polygon points={band(totals, reefer)} fill="var(--series-1)" opacity={0.85} />
        {/* 2px surface gap keeps the two fills from bleeding into each other. */}
        <polyline
          points={reefer.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ")}
          fill="none"
          stroke="var(--surface)"
          strokeWidth={2}
        />

        {[0, 6, 12, 18, 23].map((h) => (
          <text
            key={h}
            x={x(h)}
            y={H - 9}
            textAnchor="middle"
            fontSize={9}
            fill={AXIS}
            fontFamily={MONO}
          >
            {String(h).padStart(2, "0")}
          </text>
        ))}
        <line x1={pad.l} x2={W - pad.r} y1={y(0)} y2={y(0)} stroke="var(--line-strong)" />
      </svg>

      <p className="chart-note">
        Reefer load runs flat around the clock; crane draw follows the vessel
        window. Stacked, because the two add up to the site total.
      </p>
    </div>
  );
}

/* ---------------- service ranking ---------------- */

export function ServiceRanking({ rows }: { rows: ServiceRow[] }) {
  const max = Math.max(...rows.map((r) => r.teu), 1);

  return (
    <div>
      {rows.map((r, i) => (
        <div className="rank-row" key={r.service}>
          <span className="rank-row__name" title={r.service}>
            <span className="num muted">{i + 1}</span>
            <span>{r.service}</span>
          </span>
          <span className="meter meter--tall">
            <span
              className="meter__fill"
              style={{
                width: `${(r.teu / max) * 100}%`,
                background: i === 0 ? "var(--accent)" : "var(--series-1)",
              }}
            />
          </span>
          <span className="num" style={{ minWidth: 62, textAlign: "right" }}>
            {r.teu.toLocaleString("en-US")}
            <span className="muted" style={{ marginLeft: 5 }}>
              {Math.round(r.share * 100)}%
            </span>
          </span>
        </div>
      ))}
      <p className="chart-note">
        Ground slots held per service, ranked. The leading service is picked out so
        the answer is readable without counting bars.
      </p>
    </div>
  );
}
