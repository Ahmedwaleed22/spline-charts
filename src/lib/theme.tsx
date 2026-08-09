"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type ThemePref = "system" | "light" | "dark";
export type Resolved = "light" | "dark";

const KEY = "meridian-theme";

/**
 * Runs before first paint so the console never flashes the wrong surface.
 * Kept as a string because it has to be inlined into <head> ahead of React.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var p=localStorage.getItem("${KEY}")||"system";var d=p==="dark"||(p==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.setAttribute("data-theme",d?"dark":"light");}catch(e){document.documentElement.setAttribute("data-theme","light");}})();`;

type ThemeState = {
  pref: ThemePref;
  resolved: Resolved;
  setPref: (p: ThemePref) => void;
  cycle: () => void;
};

const Ctx = createContext<ThemeState | null>(null);

const ORDER: ThemePref[] = ["system", "light", "dark"];

/* ---------- localStorage as an external store ----------
   Preference and OS setting both live outside React, so they are read with
   useSyncExternalStore rather than mirrored into state inside an effect. */

const subscribers = new Set<() => void>();

function writePref(p: ThemePref) {
  try {
    localStorage.setItem(KEY, p);
  } catch {
    /* private mode: the session still themes correctly, it just won't persist */
  }
  subscribers.forEach((fn) => fn());
}

function subscribePref(onChange: () => void) {
  subscribers.add(onChange);
  // Keep tabs in step when the preference changes in another one.
  window.addEventListener("storage", onChange);
  return () => {
    subscribers.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY) as ThemePref | null;
    return v && ORDER.includes(v) ? v : "system";
  } catch {
    return "system";
  }
}

const DARK_QUERY = "(prefers-color-scheme: dark)";

function subscribeSystem(onChange: () => void) {
  const mq = window.matchMedia(DARK_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

const readSystemDark = () => window.matchMedia(DARK_QUERY).matches;

/* Server snapshots: the boot script has already stamped the right attribute on
   <html>, so the first paint is correct regardless of what these return. */
const serverPref = (): ThemePref => "system";
const serverSystemDark = () => false;

export function ThemeProvider({ children }: { children: ReactNode }) {
  const pref = useSyncExternalStore(subscribePref, readPref, serverPref);
  const systemDark = useSyncExternalStore(
    subscribeSystem,
    readSystemDark,
    serverSystemDark
  );

  const resolved: Resolved =
    pref === "system" ? (systemDark ? "dark" : "light") : pref;

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", resolved);
  }, [resolved]);

  const setPref = useCallback((p: ThemePref) => writePref(p), []);

  const cycle = useCallback(
    () => writePref(ORDER[(ORDER.indexOf(readPref()) + 1) % ORDER.length]),
    []
  );

  const value = useMemo(
    () => ({ pref, resolved, setPref, cycle }),
    [pref, resolved, setPref, cycle]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}

/**
 * Palette handed to the WebGL stage.
 *
 * The scene cannot read CSS custom properties, so the two themes are mirrored
 * here. Container colours are deliberately absent, the dwell ramp is a data
 * encoding and stays identical in both themes.
 */
export const STAGE_PALETTE = {
  light: {
    sky: "#eef2f5",
    fog: "#eef2f5",
    fogNear: 70,
    fogFar: 210,
    water: "#a8c0c9",
    apron: "#dfe5e8",
    curb: "#cad3d7",
    slab: "#d6dee1",
    slabHot: "#c8d4d8",
    hemiSky: "#f7fafb",
    hemiGround: "#b2c0c6",
    hemiIntensity: 1.2,
    keyIntensity: 1.7,
    fillIntensity: 0.38,
    tagInk: "rgba(12,27,35,0.58)",
    tagBg: "rgba(238,242,245,0.82)",
  },
  dark: {
    sky: "#0a1219",
    fog: "#0a1219",
    fogNear: 70,
    fogFar: 210,
    water: "#152b39",
    apron: "#24343f",
    curb: "#2d3f4a",
    slab: "#273944",
    slabHot: "#354c58",
    hemiSky: "#6d8b9c",
    hemiGround: "#101c25",
    hemiIntensity: 0.95,
    keyIntensity: 1.55,
    fillIntensity: 0.5,
    tagInk: "rgba(231,238,241,0.72)",
    tagBg: "rgba(10,18,25,0.7)",
  },
} as const;

export type StagePalette = (typeof STAGE_PALETTE)[Resolved];
