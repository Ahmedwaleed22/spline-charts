"use client";

import { useConsole } from "@/lib/console-state";
import {
  BerthTimeline,
  EnergyArea,
  FleetMix,
  ServiceRanking,
  TurnTimeHistogram,
  YardHeatmap,
} from "@/components/charts";
import { Panel } from "@/components/panels";
import { DemoButton } from "@/components/demo-dialog";
import {
  ArrowRightIcon,
  BarChartIcon,
  BrandMark,
  GridIcon,
  InfoIcon,
  LayersIcon,
  LinkIcon,
  PulseIcon,
  ShieldIcon,
} from "@/components/icons";

/* ================================================================
   How it works
   ================================================================ */

/** Each principle names the symbol in this repo that enforces it. */
const PRINCIPLES = [
  {
    Icon: LayersIcon,
    head: "The model is the chart",
    body: "Block geometry is generated from the records that fill the manifest. Stack height is ground-slot occupancy; stack colour is the dwell step. Nothing in the scene is decorative. Every box you see is a row you can query.",
    proof: "lib/data.ts, stackHeights() and dwellHex()",
  },
  {
    Icon: LinkIcon,
    head: "One store, two directions",
    body: "Hovering a block in 3D lights its row in the table; hovering a row lights the block. Both read and write a single client store, so a panel added later joins the same wiring without a new integration.",
    proof: "lib/console-state.tsx, one context, 6 subscribers",
  },
  {
    Icon: GridIcon,
    head: "Stage-agnostic",
    body: "The viewport renders a React Three Fiber stage by default and a published Spline scene when one is configured. The console around it does not change either way, because the contract is object names, not a renderer.",
    proof: "NEXT_PUBLIC_SPLINE_SCENE, objects Block_A1 to Block_B6",
  },
  {
    Icon: PulseIcon,
    head: "Deterministic by design",
    body: "Every figure comes from a fixed seed, so the server render and the client render agree and a scenario looks identical on reload. Swapping in a live feed replaces one data module, not the views.",
    proof: "mulberry32(hash(id + scenario)), no Math.random()",
  },
];

export function HowItWorks() {
  return (
    <section className="band" id="how">
      <div className="shell band__inner">
        <div className="section-head">
          <div>
            <span className="eyebrow">Design principles</span>
            <h2
              className="display"
              style={{
                fontSize: "clamp(28px, 3.2vw, 42px)",
                marginTop: "var(--sp-3)",
              }}
            >
              Built as an instrument,
              <br />
              not an illustration
            </h2>
          </div>
          <p className="lede" style={{ maxWidth: 440 }}>
            A terminal operations console has one job: let a shift supervisor find
            the block that is about to cost money, in under five seconds. Each
            principle below names the code that keeps it honest.
          </p>
        </div>

        <ol className="principles">
          {PRINCIPLES.map(({ Icon, head, body, proof }, i) => (
            <li className="principle" key={head}>
              <div className="principle__head">
                <span className="principle__index" aria-hidden>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <Icon size={20} className="principle__icon" />
              </div>
              <h3 className="display principle__title">{head}</h3>
              <p className="principle__body">{body}</p>
              <p className="principle__proof num">{proof}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ================================================================
   Chart gallery: the forms available, not the ones in use
   ================================================================ */

const OTHER_FORMS = [
  "Geospatial",
  "Sankey",
  "Funnel",
  "Cohort retention",
  "Small multiples",
  "Waterfall",
  "Box plot",
  "Scatter with fit",
  "Control chart",
];

export function ChartGallery() {
  const { berthCalls, fleet, yardHeat, turnTimes, energy, serviceRanking } =
    useConsole();

  return (
    <section className="band band--deep" id="charts">
      <div className="shell band__inner">
        <div className="section-head">
          <div>
            <span className="eyebrow">Chart library</span>
            <h2
              className="display"
              style={{
                fontSize: "clamp(28px, 3.2vw, 42px)",
                marginTop: "var(--sp-3)",
              }}
            >
              Every one of these is
              <br />
              a chart we can build you
            </h2>
          </div>
          <p className="lede" style={{ maxWidth: 460 }}>
            These six are examples, not fixed features. Each one is a form we fit
            to whatever your business actually measures. The terminal data below
            is only what we happened to plug in.
          </p>
        </div>

        <div className="form-index">
          <span className="eyebrow form-index__label">
            <InfoIcon size={12} /> Also available
          </span>
          {OTHER_FORMS.map((f) => (
            <span className="form-index__tag" key={f}>
              {f}
            </span>
          ))}
        </div>

        <div className="gallery">
          <Panel
            title="Berth utilisation"
            note="Timeline · Gantt"
            question="Which berth frees up first, and when?"
          >
            <BerthTimeline calls={berthCalls} />
          </Panel>

          <Panel
            title="Truck turn time"
            note="Distribution · histogram"
            question="Are we slow on average, or slow in the tail?"
          >
            <TurnTimeHistogram bins={turnTimes.bins} median={turnTimes.median} />
          </Panel>

          <Panel
            title="Yard occupancy"
            note="Matrix · heatmap"
            question="Which block fills up, and at what hour?"
          >
            <YardHeatmap cells={yardHeat} />
          </Panel>

          <Panel
            title="Electrical demand"
            note="Trend · stacked area"
            question="What drives the peak we are billed on?"
          >
            <EnergyArea data={energy} />
          </Panel>

          <Panel
            title="Equipment fleet"
            note="Composition · proportion bar"
            question="How much of the fleet is actually earning?"
          >
            <FleetMix fleet={fleet} />
          </Panel>

          <Panel
            title="Volume by service"
            note="Ranking · sorted bars"
            question="Which customer is taking the most ground?"
          >
            <ServiceRanking rows={serviceRanking} />
          </Panel>
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   Specification
   ================================================================ */

/** Every figure here is measured off this build, not estimated. */
const SPECS: { term: string; value: string; detail: string }[] = [
  {
    term: "Rendering",
    value: "12 instanced meshes",
    detail:
      "1,200 containers drawn from one geometry buffer per block, with shadows on a 2048 map. Adding a block adds a draw call, not a thousand.",
  },
  {
    term: "Data contract",
    value: "12 typed accessors",
    detail:
      "Blocks, throughput, dwell, cranes, gate, energy, berth calls, fleet, occupancy, turn times, ranking and KPIs. Point them at your TOS and the views never learn about it.",
  },
  {
    term: "State",
    value: "1 store, 0 polls",
    detail:
      "A single context holds scenario, hover, selection and camera. Panels subscribe to it; nothing duplicates and nothing polls on a timer.",
  },
  {
    term: "Colour",
    value: "ΔE 9.3 worst pair",
    detail:
      "Categorical palettes are run through a colour-vision validator per theme, above the deuteranopia and protanopia separation floor. Sequential ramps are re-stepped so the terminal step still clears its own surface.",
  },
  {
    term: "Contrast",
    value: "8.5:1 body text",
    detail:
      "WCAG 2.2 AA on both themes, with secondary text at 5.1:1. Focus rings are never removed, and forced-colors mode keeps its borders.",
  },
  {
    term: "Theming",
    value: "151 tokens, 2 themes",
    detail:
      "One token set drives the DOM and the WebGL stage together, so day shift and night shift cannot drift apart.",
  },
  {
    term: "Reporting",
    value: "CSV, no round trip",
    detail:
      "The shift report is assembled and downloaded in the browser. Swap the writer for XLSX or PDF without touching the button.",
  },
  {
    term: "Delivery",
    value: "Next.js 16, React 19",
    detail:
      "App Router, statically prerendered. The 3D stage is code-split and client-only, so the console shell paints before WebGL starts.",
  },
];

export function Specification() {
  return (
    <section className="band" id="specs">
      <div className="shell band__inner spec-layout">
        <div className="spec-intro">
          <span className="eyebrow">Specification</span>
          <h2
            className="display"
            style={{
              fontSize: "clamp(28px, 3vw, 40px)",
              marginTop: "var(--sp-3)",
            }}
          >
            What ships
          </h2>
          <p className="spec-intro__lede">
            Numbers measured off this build, not rounded up for a slide. If a
            figure below matters to your procurement team, we will show you where
            it comes from.
          </p>
          <div className="spec-intro__tag">
            <span className="badge badge--outline">
              <ShieldIcon size={12} />
              Synthetic data, fixed seed
            </span>
          </div>
        </div>

        <dl className="spec-sheet">
          {SPECS.map((s) => (
            <div className="spec-row" key={s.term}>
              <dt className="spec-row__term">{s.term}</dt>
              <dd className="spec-row__value num">{s.value}</dd>
              <dd className="spec-row__detail">{s.detail}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/* ================================================================
   Call to action
   ================================================================ */

const STEPS = [
  {
    title: "You send a sample",
    body: "One day of move history and a block layout, in whatever shape your system exports. CSV, a database dump or an API endpoint all work.",
    note: "Day 1, no integration work on your side",
  },
  {
    title: "We fit the model",
    body: "Your yard replaces ours in the 3D stage and your figures replace the seeded ones. We pick the chart forms that answer the questions your team actually asks.",
    note: "Days 2 to 4",
  },
  {
    title: "You click through it",
    body: "A working console on your own data, deployed behind your SSO. If it does not tell you something you did not already know, we say so and stop there.",
    note: "Day 5",
  },
];

export function CallToAction() {
  return (
    <section className="band band--deep" id="contact">
      <div className="shell band__inner">
        <div className="section-head">
          <div>
            <span className="eyebrow">How we start</span>
            <h2
              className="display"
              style={{
                fontSize: "clamp(28px, 3vw, 40px)",
                marginTop: "var(--sp-3)",
              }}
            >
              See it against your business
            </h2>
          </div>
          <p className="lede" style={{ maxWidth: 430 }}>
            One week, three steps, and a real answer at the end of it. No pilot
            programme, no statement of work to sign before anyone sees anything.
          </p>
        </div>

        <ol className="steps">
          {STEPS.map((s, i) => (
            <li className="step" key={s.title}>
              <div className="step__head">
                <span className="step__index" aria-hidden>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <ArrowRightIcon size={16} className="muted" />
              </div>
              <h3 className="display step__title">{s.title}</h3>
              <p className="step__body">{s.body}</p>
              <p className="step__note num">{s.note}</p>
            </li>
          ))}
        </ol>

        <div className="cta">
          <div>
            <h3
              className="display"
              style={{ fontSize: "var(--fs-xl)", marginBottom: "var(--sp-2)" }}
            >
              Send us a sample
            </h3>
            <p
              style={{
                color: "var(--ink-2)",
                maxWidth: "48ch",
                fontSize: "var(--fs-sm)",
                lineHeight: "var(--lh-snug)",
              }}
            >
              Built by Pixlotech. Tell us what your operation measures and we will
              tell you, honestly, whether a console like this is worth building for
              it.
            </p>
          </div>
          <div className="cta__actions">
            <DemoButton className="btn btn--accent btn--lg">
              Request a demo
              <ArrowRightIcon size={15} />
            </DemoButton>
            <a className="btn btn--lg" href="#charts">
              <BarChartIcon size={15} />
              Browse the chart library
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   Footer
   ================================================================ */

const FOOT_LINKS: { head: string; items: { label: string; href: string }[] }[] = [
  {
    head: "This demo",
    items: [
      { label: "Yard console", href: "#console" },
      { label: "How it works", href: "#how" },
      { label: "Chart library", href: "#charts" },
      { label: "Specification", href: "#specs" },
    ],
  },
  {
    head: "What we build",
    items: [
      { label: "Operations dashboards", href: "https://pixlotech.com" },
      { label: "3D and WebGL interfaces", href: "https://pixlotech.com" },
      { label: "Data visualisation", href: "https://pixlotech.com" },
      { label: "Web applications", href: "https://pixlotech.com" },
    ],
  },
  {
    head: "Pixlotech",
    items: [
      { label: "About the studio", href: "https://pixlotech.com" },
      { label: "Our work", href: "https://pixlotech.com" },
      { label: "Start a project", href: "https://pixlotech.com" },
    ],
  },
];

export function SiteFooter() {
  const year = 2026;

  return (
    <footer className="site-foot">
      <div className="shell">
        <div className="foot-grid">
          <div>
            <span className="foot-brand">
              <BrandMark size={24} />
              <span className="brand__name">Meridian</span>
            </span>
            <p
              style={{
                maxWidth: "44ch",
                fontSize: "var(--fs-sm)",
                color: "var(--ink-2)",
                lineHeight: "var(--lh-loose)",
              }}
            >
              A working terminal-operations console built around a live 3D yard.
              This page is one screen from a larger platform, shown on synthetic
              data so you can click through it without an account.
            </p>
            <span style={{ display: "inline-block", marginTop: "var(--sp-5)" }}>
              <DemoButton className="btn btn--accent">
                Request a demo
                <ArrowRightIcon size={14} />
              </DemoButton>
            </span>
          </div>

          {FOOT_LINKS.map((col) => (
            <nav className="foot-col" key={col.head} aria-label={col.head}>
              <span className="eyebrow eyebrow--ink">{col.head}</span>
              <ul>
                {col.items.map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      {...(item.href.startsWith("http")
                        ? { target: "_blank", rel: "noreferrer noopener" }
                        : {})}
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="foot-base">
          <p className="foot-credit">
            © {year}{" "}
            <a href="https://pixlotech.com" target="_blank" rel="noreferrer noopener">
              Pixlotech
            </a>
            . All rights reserved.
          </p>
          <p className="meta meta--quiet foot-legal">
            Demonstration build
            <span className="meta__sep" aria-hidden>
              ·
            </span>
            Synthetic data from a fixed seed
            <span className="meta__sep" aria-hidden>
              ·
            </span>
            Not an operational system
          </p>
        </div>
      </div>
    </footer>
  );
}
