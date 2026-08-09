"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useConsole } from "@/lib/console-state";
import { useTheme } from "@/lib/theme";
import {
  SCENARIOS,
  dwellHex,
  formatShiftStamp,
  shiftFor,
  type Block,
} from "@/lib/data";
import {
  buildShiftReportCsv,
  downloadCsv,
  shiftReportFilename,
} from "@/lib/export";
import { DemoButton } from "@/components/demo-dialog";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BrandMark,
  CheckIcon,
  CloseIcon,
  DownloadIcon,
  MoonIcon,
  SearchIcon,
  SortIcon,
  SunIcon,
  SystemIcon,
} from "@/components/icons";

/* ================================================================
   Panel: the one surface every data module sits on
   ================================================================ */

export function Panel({
  title,
  note,
  question,
  action,
  flush,
  children,
}: {
  title: string;
  note?: string;
  /** The thing a reader is trying to find out by looking at this panel. */
  question?: string;
  action?: React.ReactNode;
  flush?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="panel" aria-label={title}>
      <header className={`panel__head${action ? " panel__head--tools" : ""}`}>
        <div className="panel__heading">
          <h3 className="panel__title">{title}</h3>
          {question && <p className="panel__question">{question}</p>}
        </div>
        {action ?? (note && <span className="eyebrow">{note}</span>)}
      </header>
      <div className={flush ? "panel__body panel__body--flush" : "panel__body"}>
        {children}
      </div>
    </section>
  );
}

/* ================================================================
   Masthead: product chrome above, operating controls below
   ================================================================ */

const THEME_ICON = { system: SystemIcon, light: SunIcon, dark: MoonIcon };
const THEME_LABEL = { system: "System", light: "Light", dark: "Dark" };

function ThemeToggle() {
  const { pref, cycle } = useTheme();
  const Icon = THEME_ICON[pref];

  return (
    <button
      type="button"
      className="btn btn--icon"
      onClick={cycle}
      title={`Appearance: ${THEME_LABEL[pref]}. Click to change.`}
    >
      <Icon size={15} />
      <span className="sr-only">
        Appearance: {THEME_LABEL[pref]}. Activate to switch theme.
      </span>
    </button>
  );
}

/* ---------------- live shift clock ---------------- */

/**
 * Ticks once a minute against the real clock, so "live" is not a claim the page
 * makes without backing it. Rendered empty on the server and filled after mount:
 * the alternative is a hydration mismatch on every load.
 */
function ShiftClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  if (!now) {
    return (
      <span className="meta" style={{ minWidth: 210 }} aria-hidden>
        Synchronising
      </span>
    );
  }

  return (
    <span className="meta" style={{ minWidth: 210 }}>
      <time className="meta__figure" dateTime={now.toISOString()}>
        {formatShiftStamp(now)}
      </time>
      <span className="meta__sep" aria-hidden>
        ·
      </span>
      Shift {shiftFor(now)}
    </span>
  );
}

/* ---------------- shift report export ---------------- */

function ExportButton() {
  const { scenario, kpis, blocks, cranes, gate, throughput } = useConsole();
  const [done, setDone] = useState(false);

  const onExport = useCallback(() => {
    const generatedAt = new Date();
    const csv = buildShiftReportCsv({
      scenario,
      kpis,
      blocks,
      cranes,
      gate,
      throughput,
      generatedAt,
    });
    downloadCsv(shiftReportFilename(scenario, generatedAt), csv);
    setDone(true);
  }, [scenario, kpis, blocks, cranes, gate, throughput]);

  // Reset the confirmation after a beat so the button is reusable.
  useEffect(() => {
    if (!done) return;
    const id = setTimeout(() => setDone(false), 2600);
    return () => clearTimeout(id);
  }, [done]);

  return (
    <button
      type="button"
      className="btn btn--collapse"
      onClick={onExport}
      style={done ? { borderColor: "var(--ok)", color: "var(--ok)" } : undefined}
    >
      {done ? <CheckIcon size={14} /> : <DownloadIcon size={14} />}
      <span className="btn__label-sm">
        {done ? "Report downloaded" : "Export shift report"}
      </span>
      <span aria-live="polite" className="sr-only">
        {done ? "Shift report downloaded as CSV." : ""}
      </span>
    </button>
  );
}

/* ---------------- masthead ---------------- */

const NAV = [
  { id: "console", label: "Console" },
  { id: "how", label: "How it works" },
  { id: "charts", label: "Chart library" },
  { id: "specs", label: "Specification" },
  { id: "contact", label: "How we start" },
];

/**
 * Marks the section currently occupying the top of the viewport.
 * rootMargin pulls the observation band just under the sticky nav so a section
 * is "current" when it is being read, not when its last pixel leaves.
 */
function useCurrentSection(ids: string[], headerH: number) {
  const [current, setCurrent] = useState(ids[0]);

  useEffect(() => {
    const nodes = ids
      .map((id) => document.getElementById(id))
      .filter((n): n is HTMLElement => Boolean(n));
    if (!nodes.length) return;

    const seen = new Map<string, number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) seen.set(e.target.id, e.intersectionRatio);
        let best = ids[0];
        let bestRatio = -1;
        for (const id of ids) {
          const r = seen.get(id) ?? 0;
          if (r > bestRatio) {
            bestRatio = r;
            best = id;
          }
        }
        if (bestRatio > 0) setCurrent(best);
      },
      {
        rootMargin: `-${Math.round(headerH)}px 0px -55% 0px`,
        threshold: [0, 0.15, 0.4, 0.75, 1],
      }
    );

    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [ids, headerH]);

  return current;
}

/**
 * Publishes the sticky header's height to the document and reports whether the
 * page has scrolled under it. The height feeds `scroll-padding-top` and the
 * scrollspy band, so neither has to guess.
 */
function useStickyHeader() {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(162);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const publish = (h: number) => {
      document.documentElement.style.setProperty("--header-h", `${Math.round(h)}px`);
      setHeight(h);
    };
    publish(el.getBoundingClientRect().height);

    const ro = new ResizeObserver(([entry]) =>
      publish(entry.contentRect.height + el.offsetHeight - el.clientHeight)
    );
    ro.observe(el);

    const onScroll = () => setStuck(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return { ref, height, stuck };
}

/** Header search. Filters the yard manifest and takes you to it. */
function ManifestSearch() {
  const { query, setQuery } = useConsole();

  const jump = () =>
    document.getElementById("manifest")?.scrollIntoView({ block: "start" });

  return (
    <div className="search">
      <SearchIcon size={15} />
      <label className="sr-only" htmlFor="masthead-search">
        Search the yard manifest by block or allocation
      </label>
      <input
        id="masthead-search"
        type="search"
        placeholder="Search blocks and allocations"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (e.target.value) jump();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") jump();
        }}
      />
      {query && (
        <button
          type="button"
          className="search__clear"
          onClick={() => setQuery("")}
          aria-label="Clear search"
        >
          <CloseIcon size={13} />
        </button>
      )}
    </div>
  );
}

const NAV_IDS = NAV.map((n) => n.id);

export function Masthead() {
  const { scenario, setScenario } = useConsole();
  const current = SCENARIOS.find((s) => s.id === scenario)!;
  const holding = scenario === "hold";
  const { ref, height, stuck } = useStickyHeader();
  const section = useCurrentSection(NAV_IDS, height);

  return (
    <>
      <div className="site-header" ref={ref} data-stuck={stuck}>
      <div className="demo-bar">
        <div className="shell demo-bar__inner">
          <span>
            <strong>Demonstration build.</strong> One screen from a larger terminal
            platform, running on synthetic figures. Built by Pixlotech.
          </span>
          <a href="https://pixlotech.com" target="_blank" rel="noreferrer noopener">
            Talk to us about your project
          </a>
        </div>
      </div>

      <header className="topbar">
        <div className="shell topbar__inner">
          <a className="brand" href="#top">
            <BrandMark size={30} />
            <span className="brand__name">Meridian</span>
            <span className="eyebrow brand__sub">Yard operations console</span>
          </a>

          <ManifestSearch />
          <ThemeToggle />
          <DemoButton>Request a demo</DemoButton>
        </div>
      </header>

      <nav className="navbar" aria-label="Sections">
        <div className="shell navbar__inner">
          <ul className="navbar__list">
            {NAV.map((n) => (
              <li key={n.id}>
                <a
                  className="navlink"
                  href={`#${n.id}`}
                  aria-current={section === n.id ? "page" : undefined}
                >
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="navbar__aside">
            <span className="meta meta--quiet">Built by</span>
            <a
              className="navlink navbar__credit"
              href="https://pixlotech.com"
              target="_blank"
              rel="noreferrer noopener"
            >
              Pixlotech
            </a>
          </div>
        </div>
      </nav>
      </div>

      <div className="subbar">
        <div className="shell subbar__inner">
          <div className="subbar__group">
            <span className="sr-only" id="scenario-label">
              Operating scenario
            </span>
            <div role="group" aria-labelledby="scenario-label" className="seg">
              {SCENARIOS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="seg__item"
                  onClick={() => setScenario(s.id)}
                  aria-pressed={scenario === s.id}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <span className="subbar__rule" aria-hidden />

          <div className="subbar__group">
            <span className={`badge ${holding ? "badge--warn" : "badge--ok"}`}>
              <span
                className={holding ? "dot" : "dot dot--live"}
                style={holding ? { background: "var(--warn)" } : undefined}
              />
              {holding ? "Metered" : "Live"}
            </span>
            <ShiftClock />
            <span className="meta meta--quiet">{current.note}</span>
          </div>

          <div className="subbar__spacer" />

          <ExportButton />
        </div>
      </div>
    </>
  );
}

/* ================================================================
   KPI strip
   ================================================================ */

function Sparkline({ points, positive }: { points: number[]; positive: boolean }) {
  const w = 120;
  const h = 26;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = w / Math.max(1, points.length - 1);
  const xy = points.map((v, i) => [i * step, h - ((v - min) / span) * (h - 3) - 1.5]);
  const line = xy.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const stroke = positive ? "var(--ok)" : "var(--crit)";
  const [lastX, lastY] = xy[xy.length - 1];

  return (
    <svg
      className="kpi__spark"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
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
        strokeWidth={1.4}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={lastX} cy={lastY} r={2} fill={stroke} />
    </svg>
  );
}

export function KpiRow() {
  const { kpis } = useConsole();

  return (
    <div className="kpi-grid">
      {kpis.map((k) => {
        const good = k.delta >= 0 === k.riseIsGood;
        const Arrow = k.delta >= 0 ? ArrowUpIcon : ArrowDownIcon;
        return (
          <article className="kpi" key={k.label}>
            <div className="kpi__top">
              <h3 className="eyebrow">{k.label}</h3>
              <span className="kpi__window num">{k.sparkWindow}</span>
            </div>

            <p className="kpi__value num">
              {k.value}
              <span className="kpi__unit">{k.unit}</span>
            </p>

            <Sparkline points={k.spark} positive={good} />

            <p className="kpi__foot">
              <span
                className={`kpi__delta num ${good ? "kpi__delta--up" : "kpi__delta--down"}`}
              >
                <Arrow size={11} />
                {k.delta > 0 ? "+" : ""}
                {k.delta.toFixed(1)}%
              </span>
              <span>{k.deltaLabel}</span>
            </p>
          </article>
        );
      })}
    </div>
  );
}

/* ================================================================
   Yard manifest: sortable, filterable, wired to the 3D yard
   ================================================================ */

type SortKey = "id" | "teu" | "fill" | "dwellDays" | "movesPerHour" | "status";
type Dir = "asc" | "desc";

const STATUS_RANK: Record<Block["status"], number> = {
  nominal: 0,
  watch: 1,
  over: 2,
};

const COLUMNS: { key: SortKey | null; label: string; right?: boolean }[] = [
  { key: "id", label: "Block" },
  { key: null, label: "Allocation" },
  { key: "teu", label: "Slots", right: true },
  { key: "fill", label: "Fill", right: true },
  { key: "dwellDays", label: "Dwell", right: true },
  { key: "movesPerHour", label: "Mv/h", right: true },
  { key: "status", label: "State", right: true },
];

const STATUS_LABEL: Record<Block["status"], string> = {
  nominal: "Nominal",
  watch: "Watch",
  over: "Over",
};

const STATUS_CLASS: Record<Block["status"], string> = {
  nominal: "badge--neutral",
  watch: "badge--warn",
  over: "badge--crit",
};

export function ManifestToolbar() {
  const { query, setQuery, onlyExceptions, setOnlyExceptions } = useConsole();

  return (
    <div style={{ display: "flex", gap: "var(--sp-2)", alignItems: "center" }}>
      <label
        className="btn"
        style={{ paddingInline: "var(--sp-3)", cursor: "text", gap: "var(--sp-2)" }}
      >
        <SearchIcon size={13} />
        <span className="sr-only">Filter blocks by id or allocation</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter blocks"
          style={{
            border: 0,
            outline: 0,
            background: "transparent",
            font: "inherit",
            color: "var(--ink)",
            width: 108,
            padding: 0,
          }}
        />
      </label>
      <button
        type="button"
        className="btn"
        aria-pressed={onlyExceptions}
        onClick={() => setOnlyExceptions(!onlyExceptions)}
        style={
          onlyExceptions
            ? {
                background: "var(--accent-wash)",
                borderColor: "var(--accent)",
                color: "var(--accent)",
              }
            : undefined
        }
      >
        Exceptions only
      </button>
    </div>
  );
}

export function Manifest() {
  const { blocks, hovered, selected, setHovered, setSelected, query, onlyExceptions } =
    useConsole();
  const [sort, setSort] = useState<{ key: SortKey; dir: Dir }>({
    key: "id",
    dir: "asc",
  });

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = blocks.filter(
      (b) =>
        (!onlyExceptions || b.status !== "nominal") &&
        (!q ||
          b.id.toLowerCase().includes(q) ||
          b.service.toLowerCase().includes(q))
    );

    const sign = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sort.key === "id") return sign * a.id.localeCompare(b.id);
      if (sort.key === "status")
        return sign * (STATUS_RANK[a.status] - STATUS_RANK[b.status]);
      return sign * ((a[sort.key] as number) - (b[sort.key] as number));
    });
  }, [blocks, query, onlyExceptions, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "id" ? "asc" : "desc" }
    );

  if (!rows.length) {
    return (
      <p className="empty-state">
        No block matches that filter. Clear it to see all twelve.
      </p>
    );
  }

  return (
    <div className="dt-wrap">
      <table className="dt">
        <caption className="sr-only">
          Yard manifest. Selecting a row pins the matching block in the 3D yard.
        </caption>
        <thead>
          <tr>
            {COLUMNS.map((c) => (
              <th
                key={c.label}
                className={`eyebrow ${c.right ? "r" : ""}`}
                aria-sort={
                  c.key && sort.key === c.key
                    ? sort.dir === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
              >
                {c.key ? (
                  <button
                    type="button"
                    className="dt__sort"
                    onClick={() => toggleSort(c.key!)}
                    data-dir={sort.key === c.key ? sort.dir : undefined}
                  >
                    {c.label}
                    <SortIcon dir={sort.key === c.key ? sort.dir : undefined} />
                  </button>
                ) : (
                  c.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => {
            const active = hovered === b.id || selected === b.id;
            const pinned = selected === b.id;
            return (
              <tr
                key={b.id}
                data-active={active}
                onMouseEnter={() => setHovered(b.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => setSelected(pinned ? null : b.id)}
              >
                <td>
                  {/* The real control lives here so keyboard users get proper
                      semantics; the row click is a pointer convenience. */}
                  <button
                    type="button"
                    className="num"
                    aria-pressed={pinned}
                    onFocus={() => setHovered(b.id)}
                    onBlur={() => setHovered(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected(pinned ? null : b.id);
                    }}
                    style={{
                      background: "none",
                      border: 0,
                      padding: 0,
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: "var(--fs-xs)",
                      color: pinned ? "var(--accent)" : "inherit",
                    }}
                  >
                    {b.id}
                    <span className="sr-only">
                      {pinned ? ", pinned. Activate to release." : ". Activate to pin."}
                    </span>
                  </button>
                </td>
                <td style={{ color: "var(--ink-2)" }}>{b.service}</td>
                <td className="num r">
                  {b.teu}
                  <span style={{ color: "var(--ink-3)" }}>/{b.capacity}</span>
                </td>
                <td className="r">
                  <span
                    className="meter"
                    style={{ width: 68, marginLeft: "auto" }}
                    title={`${Math.round(b.fill * 100)}% of ground slots in use`}
                  >
                    <span
                      className="meter__fill"
                      style={{
                        width: `${Math.round(b.fill * 100)}%`,
                        background:
                          b.fill > 0.92 ? "var(--crit)" : "var(--series-1)",
                      }}
                    />
                  </span>
                </td>
                <td className="num r">
                  <span
                    className="swatch"
                    style={{ background: dwellHex(b.dwellDays) }}
                    aria-hidden
                  />
                  {b.dwellDays.toFixed(1)} d
                </td>
                <td className="num r">{b.movesPerHour}</td>
                <td className="r">
                  <span className={`badge ${STATUS_CLASS[b.status]}`}>
                    {STATUS_LABEL[b.status]}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ================================================================
   Gate queue
   ================================================================ */

export function GateQueue() {
  const { gate } = useConsole();
  const worst = Math.max(...gate.map((g) => g.waitMin));

  return (
    <div>
      {gate.map((g) => {
        const late = g.waitMin > 25;
        return (
          <div
            key={g.lane}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 44px 1fr 46px",
              alignItems: "center",
              gap: "var(--sp-3)",
              padding: "var(--sp-2) 0",
              borderBottom: "1px solid var(--line-soft)",
            }}
          >
            <span style={{ fontSize: "var(--fs-xs)" }}>{g.lane}</span>
            <span
              className="num muted"
              style={{ fontSize: "var(--fs-2xs)", textAlign: "right" }}
            >
              {g.trucks}
            </span>
            <span className="meter meter--tall">
              <span
                className="meter__fill"
                style={{
                  width: `${(g.waitMin / worst) * 100}%`,
                  background: late ? "var(--crit)" : "var(--series-1)",
                }}
              />
            </span>
            <span
              className="num"
              style={{
                fontSize: "var(--fs-2xs)",
                textAlign: "right",
                color: late ? "var(--crit)" : "var(--ink)",
              }}
            >
              {g.waitMin}m
            </span>
          </div>
        );
      })}
      <p
        className="muted"
        style={{ marginTop: "var(--sp-3)", fontSize: "var(--fs-2xs)" }}
      >
        Trucks in queue and median turn time, by lane group. Lanes over 25 minutes
        are flagged.
      </p>
    </div>
  );
}
