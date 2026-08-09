"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getBerthCalls,
  getBlocks,
  getCranes,
  getDwellBuckets,
  getEnergy,
  getFleet,
  getGate,
  getKpis,
  getServiceRanking,
  getThroughput,
  getTurnTimes,
  getYardHeat,
  type Block,
  type ScenarioId,
} from "./data";

type CameraView = "yard" | "quay" | "plan";

type ConsoleState = {
  scenario: ScenarioId;
  setScenario: (s: ScenarioId) => void;
  /** Block the pointer is over, in the 3D yard *or* in the manifest table. */
  hovered: string | null;
  setHovered: (id: string | null) => void;
  selected: string | null;
  setSelected: (id: string | null) => void;
  view: CameraView;
  setView: (v: CameraView) => void;
  /** Manifest filter. Lives here so the masthead search and the table toolbar
      drive the same list rather than keeping two copies of it. */
  query: string;
  setQuery: (q: string) => void;
  onlyExceptions: boolean;
  setOnlyExceptions: (v: boolean) => void;
  blocks: Block[];
  blockById: (id: string | null) => Block | undefined;
  throughput: ReturnType<typeof getThroughput>;
  dwell: ReturnType<typeof getDwellBuckets>;
  cranes: ReturnType<typeof getCranes>;
  kpis: ReturnType<typeof getKpis>;
  gate: ReturnType<typeof getGate>;
  /* Gallery datasets: same store, so the chart library follows the scenario. */
  berthCalls: ReturnType<typeof getBerthCalls>;
  fleet: ReturnType<typeof getFleet>;
  yardHeat: ReturnType<typeof getYardHeat>;
  turnTimes: ReturnType<typeof getTurnTimes>;
  energy: ReturnType<typeof getEnergy>;
  serviceRanking: ReturnType<typeof getServiceRanking>;
};

const Ctx = createContext<ConsoleState | null>(null);

export function ConsoleProvider({ children }: { children: ReactNode }) {
  const [scenario, setScenario] = useState<ScenarioId>("live");
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<CameraView>("yard");
  const [query, setQuery] = useState("");
  const [onlyExceptions, setOnlyExceptions] = useState(false);

  const value = useMemo<ConsoleState>(() => {
    const blocks = getBlocks(scenario);
    return {
      scenario,
      setScenario,
      hovered,
      setHovered,
      selected,
      setSelected,
      view,
      setView,
      query,
      setQuery,
      onlyExceptions,
      setOnlyExceptions,
      blocks,
      blockById: (id) => blocks.find((b) => b.id === id),
      throughput: getThroughput(scenario),
      dwell: getDwellBuckets(scenario),
      cranes: getCranes(scenario),
      kpis: getKpis(scenario),
      gate: getGate(scenario),
      berthCalls: getBerthCalls(scenario),
      fleet: getFleet(scenario),
      yardHeat: getYardHeat(scenario),
      turnTimes: getTurnTimes(scenario),
      energy: getEnergy(scenario),
      serviceRanking: getServiceRanking(scenario),
    };
  }, [scenario, hovered, selected, view, query, onlyExceptions]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useConsole() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useConsole must be used inside <ConsoleProvider>");
  return ctx;
}
