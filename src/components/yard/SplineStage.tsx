"use client";

import dynamic from "next/dynamic";
import { useCallback } from "react";
import type { Application } from "@splinetool/runtime";
import { useConsole } from "@/lib/console-state";

const Spline = dynamic(() => import("@splinetool/react-spline"), { ssr: false });

/**
 * Drop-in replacement for the React Three Fiber yard.
 *
 * Set NEXT_PUBLIC_SPLINE_SCENE to a published .splinecode URL and the viewport
 * renders that scene instead. The contract with the Spline file is by object
 * name: one object per yard block, named `Block_A1` … `Block_B6`, and a state
 * named `Highlight` on each. Everything else, the console, the charts, the
 * manifest, keeps working unchanged, because both stages talk to the same
 * store.
 */
export function SplineStage({ url }: { url: string }) {
  const { blocks, setHovered, setSelected } = useConsole();

  const onLoad = useCallback(
    (app: Application) => {
      for (const block of blocks) {
        const obj = app.findObjectByName(`Block_${block.id}`);
        if (!obj) continue;
        // Height is the data channel: one tier per 20 % of block fill.
        obj.scale.y = Math.max(0.12, block.fill);
      }

      app.addEventListener("mouseHover", (e) => {
        const id = e.target.name.replace("Block_", "");
        setHovered(blocks.some((b) => b.id === id) ? id : null);
      });
      app.addEventListener("mouseDown", (e) => {
        const id = e.target.name.replace("Block_", "");
        if (blocks.some((b) => b.id === id)) setSelected(id);
      });
    },
    [blocks, setHovered, setSelected]
  );

  return <Spline scene={url} onLoad={onLoad} style={{ width: "100%", height: "100%" }} />;
}
