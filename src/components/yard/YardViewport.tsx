"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { useConsole } from "@/lib/console-state";
import { DWELL_LEGEND } from "@/lib/data";
import { CollapseIcon, ExpandIcon } from "@/components/icons";
import { CAMERA_VIEWS, type CameraViewId } from "./constants";
import { SplineStage } from "./SplineStage";

/** Point this at a published .splinecode file to swap the stage. See README. */
const SPLINE_SCENE = process.env.NEXT_PUBLIC_SPLINE_SCENE;

const Scene = dynamic(() => import("./Scene"), {
  ssr: false,
  loading: () => (
    <div className="stage__loading">
      <div
        className="skeleton"
        style={{ width: 200, height: 6, borderRadius: 999 }}
      />
      <span className="eyebrow">Compiling yard model…</span>
    </div>
  ),
});

const VIEW_LABELS: Record<CameraViewId, string> = {
  yard: "Yard",
  quay: "Quay",
  plan: "Plan",
};

export function YardViewport() {
  const { view, setView, selected, setSelected, blockById, scenario } = useConsole();
  const frame = useRef<HTMLDivElement>(null);
  const [full, setFull] = useState(false);
  const pinned = blockById(selected);

  useEffect(() => {
    const onChange = () => setFull(document.fullscreenElement === frame.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFull = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen();
    else frame.current?.requestFullscreen?.().catch(() => setFull(false));
  }, []);

  return (
    <div className="stage" ref={frame}>
      {SPLINE_SCENE ? <SplineStage url={SPLINE_SCENE} /> : <Scene />}

      {/* A scrim so the headline never fights the yard behind it. */}
      <div aria-hidden className="hud-scrim" />

      <div className="hud-title">
        <span className="eyebrow">Yard model · live telemetry</span>
        <h2 className="display hud-headline">
          Meridian
          <br />
          Terminal
        </h2>
        <p
          className="hud-desc"
          style={{
            marginTop: "var(--sp-3)",
            fontSize: "var(--fs-xs)",
            color: "var(--ink-2)",
            maxWidth: 264,
            lineHeight: 1.55,
          }}
        >
          Stack height reads ground slots in use. Stack colour reads mean dwell.
          Hover a block, or pick one to pin the camera to it.
        </p>
      </div>

      <div className="hud-views">
        <div role="group" aria-label="Camera view" style={{ display: "flex", gap: "var(--sp-2)" }}>
          {(Object.keys(CAMERA_VIEWS) as CameraViewId[]).map((v) => (
            <button
              key={v}
              type="button"
              className="chip"
              onClick={() => {
                setSelected(null);
                setView(v);
              }}
              aria-pressed={!selected && view === v}
            >
              {VIEW_LABELS[v]}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="chip"
          onClick={toggleFull}
          title={full ? "Exit full screen" : "Full screen"}
          style={{ padding: "0 var(--sp-2)" }}
        >
          {full ? <CollapseIcon size={14} /> : <ExpandIcon size={14} />}
          <span className="sr-only">
            {full ? "Exit full screen" : "View yard full screen"}
          </span>
        </button>
      </div>

      <div className="hud-legend">
        <span className="eyebrow">Mean dwell · days</span>
        <div className="hud-ramp">
          {DWELL_LEGEND.map((step) => (
            <div key={step.label} className="hud-step">
              <div className="hud-step__swatch" style={{ background: step.hex }} />
              <div
                className="num muted"
                style={{ fontSize: "var(--fs-micro)", marginTop: 5 }}
              >
                {step.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="hud-pin">
        {pinned ? (
          <button
            type="button"
            className="chip chip--accent"
            onClick={() => setSelected(null)}
          >
            Release block {pinned.id}
          </button>
        ) : (
          <span className="chip chip--static hud-hint">
            Drag to orbit · scroll to zoom
          </span>
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        {`Scenario ${scenario}, camera view ${VIEW_LABELS[view]}. ${
          pinned
            ? `Block ${pinned.id} pinned: ${pinned.teu} of ${pinned.capacity} slots, ${pinned.dwellDays} day mean dwell.`
            : "No block pinned."
        }`}
      </p>
    </div>
  );
}
