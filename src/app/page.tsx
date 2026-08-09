"use client";

import { ConsoleProvider, useConsole } from "@/lib/console-state";
import { ThemeProvider } from "@/lib/theme";
import { CraneStrip, DwellChart, ThroughputChart } from "@/components/charts";
import {
  GateQueue,
  KpiRow,
  Manifest,
  ManifestToolbar,
  Masthead,
  Panel,
} from "@/components/panels";
import {
  CallToAction,
  ChartGallery,
  HowItWorks,
  Specification,
  SiteFooter,
} from "@/components/sections";
import { DemoDialogProvider } from "@/components/demo-dialog";
import { YardViewport } from "@/components/yard/YardViewport";

export default function Page() {
  return (
    <ThemeProvider>
      <ConsoleProvider>
        <DemoDialogProvider>
          <div id="top">
            <Masthead />
            <main id="console">
              <Console />
              <HowItWorks />
              <ChartGallery />
              <Specification />
              <CallToAction />
            </main>
            <SiteFooter />
          </div>
        </DemoDialogProvider>
      </ConsoleProvider>
    </ThemeProvider>
  );
}

function Console() {
  const { throughput, dwell, cranes, scenario, blocks } = useConsole();
  const exceptions = blocks.filter((b) => b.status !== "nominal").length;

  return (
    <div
      className="shell"
      style={{ paddingBlock: "var(--sp-5) var(--sp-10)" }}
    >
      <div className="rise">
        <YardViewport />
      </div>

      <div className="rise rise-1" style={{ marginTop: "var(--sp-5)" }}>
        <KpiRow />
      </div>

      <div className="grid grid-3 rise rise-2" style={{ marginTop: "var(--sp-5)" }}>
        <div className="span-2">
          <Panel title="Moves per hour" note="Last 24 h · by move type">
            <ThroughputChart data={throughput} />
          </Panel>
        </div>

        <Panel title="Dwell distribution" note="All blocks · TEU">
          <DwellChart data={dwell} />
        </Panel>
      </div>

      <div style={{ marginTop: "var(--sp-5)" }}>
        <Panel title="Quay crane rate" note="Moves per hour · last 4 h" flush>
          <CraneStrip cranes={cranes} />
        </Panel>
      </div>

      <div className="grid grid-3" style={{ marginTop: "var(--sp-5)" }} id="manifest">
        <div className="span-2">
          <Panel title="Yard manifest" flush action={<ManifestToolbar />}>
            <Manifest />
            <p
              className="eyebrow"
              style={{
                padding: "var(--sp-3) var(--sp-5)",
                borderTop: "1px solid var(--line-soft)",
              }}
            >
              {scenario === "hold" ? "Metered" : "Working"} · 12 blocks ·{" "}
              {exceptions} needing attention
            </p>
          </Panel>
        </div>

        <Panel title="Gate queue" note="Landside">
          <GateQueue />
        </Panel>
      </div>
    </div>
  );
}
