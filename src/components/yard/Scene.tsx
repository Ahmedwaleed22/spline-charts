"use client";

import { useEffect, useRef, type ComponentRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

/**
 * Taken from the component rather than imported from three-stdlib.
 *
 * three-stdlib is a transitive dependency of drei, so importing it directly
 * only resolves under a hoisted node_modules and fails under pnpm's isolated
 * layout. Deriving the ref type keeps it correct on both, and keeps it in step
 * with whatever version drei is actually using.
 */
type OrbitControlsImpl = ComponentRef<typeof OrbitControls>;
import { useConsole } from "@/lib/console-state";
import { dwellHex, type Block } from "@/lib/data";
import { STAGE_PALETTE, useTheme, type StagePalette } from "@/lib/theme";
import { CAMERA_VIEWS, blockCenter, type CameraViewId } from "./constants";
import { Cranes, Ground, Vessel } from "./Terminal";
import { YardBlock } from "./YardBlock";

/* ---------------- camera ---------------- */

function CameraRig({
  view,
  focus,
  reducedMotion,
}: {
  view: CameraViewId;
  focus: Block | null;
  reducedMotion: boolean;
}) {
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera, size } = useThree();
  const aspect = size.width / Math.max(1, size.height);
  const wantPos = useRef(new THREE.Vector3(...CAMERA_VIEWS.yard.pos));
  const wantTarget = useRef(new THREE.Vector3(...CAMERA_VIEWS.yard.target));
  const animating = useRef(true);

  useEffect(() => {
    if (focus) {
      const [x, , z] = blockCenter(focus.row, focus.col);
      wantTarget.current.set(x, 2, z);
      wantPos.current.set(x + 14, 16, z + 21);
    } else {
      const v = CAMERA_VIEWS[view];
      wantPos.current.set(v.pos[0], v.pos[1], v.pos[2]);
      wantTarget.current.set(v.target[0], v.target[1], v.target[2]);
    }
    // Narrow viewports see less of the scene per unit of distance, so back the
    // camera off along the same axis rather than re-authoring every view.
    if (aspect < 1.4) {
      const widen = Math.min(2.2, 1.4 / aspect);
      wantPos.current.sub(wantTarget.current).multiplyScalar(widen).add(wantTarget.current);
      // Pan up so the yard sits on the frame's centre line rather than its top.
      wantPos.current.y += 3;
      wantTarget.current.y += 3;
    }

    animating.current = true;
    if (reducedMotion) {
      camera.position.copy(wantPos.current);
      controls.current?.target.copy(wantTarget.current);
      controls.current?.update();
      animating.current = false;
    }
  }, [view, focus, camera, reducedMotion, aspect]);

  useFrame((_, delta) => {
    if (!animating.current || !controls.current) return;
    const k = 1 - Math.pow(0.0016, Math.min(delta, 0.05));
    camera.position.lerp(wantPos.current, k);
    controls.current.target.lerp(wantTarget.current, k);
    controls.current.update();
    if (
      camera.position.distanceTo(wantPos.current) < 0.06 &&
      controls.current.target.distanceTo(wantTarget.current) < 0.06
    ) {
      animating.current = false;
    }
  });

  return (
    <OrbitControls
      ref={controls}
      enableDamping
      dampingFactor={0.08}
      enablePan={false}
      minDistance={18}
      maxDistance={110}
      minPolarAngle={0.18}
      maxPolarAngle={Math.PI / 2 - 0.06}
      onStart={() => {
        animating.current = false;
      }}
    />
  );
}

/* ---------------- overlays ---------------- */

function BlockTag({ block, palette }: { block: Block; palette: StagePalette }) {
  const [x, , z] = blockCenter(block.row, block.col);
  return (
    <Html
      position={[x, 0.1, z + 7.4]}
      center
      zIndexRange={[8, 0]}
      style={{ pointerEvents: "none" }}
    >
      <span
        className="num"
        style={{
          fontSize: 10,
          letterSpacing: "0.12em",
          color: palette.tagInk,
          background: palette.tagBg,
          padding: "1px 5px",
          borderRadius: 2,
          whiteSpace: "nowrap",
        }}
      >
        {block.id}
      </span>
    </Html>
  );
}

const STATUS_META = {
  over: { label: "Over threshold", cls: "badge--crit" },
  watch: { label: "Watch", cls: "badge--warn" },
  nominal: { label: "Nominal", cls: "badge--ok" },
} as const;

function Callout({ block, pinned }: { block: Block; pinned: boolean }) {
  const [x, , z] = blockCenter(block.row, block.col);
  const status = STATUS_META[block.status];

  return (
    <Html
      position={[x, 4.8, z]}
      center
      zIndexRange={[40, 20]}
      style={{ pointerEvents: "none" }}
    >
      <div
        style={{
          width: 226,
          background: "var(--surface-3)",
          border: "1px solid var(--line)",
          borderTop: `2px solid ${dwellHex(block.dwellDays)}`,
          borderRadius: "var(--r-sm)",
          boxShadow: "var(--shadow-3)",
          padding: "var(--sp-3)",
          fontFamily: "var(--ff-body), sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: "var(--sp-2)",
          }}
        >
          <span
            className="display"
            style={{ fontSize: 19, color: "var(--ink)", lineHeight: 1 }}
          >
            Block {block.id}
          </span>
          <span className="eyebrow">{pinned ? "Pinned" : "Hover"}</span>
        </div>

        <div
          style={{
            fontSize: "var(--fs-2xs)",
            color: "var(--ink-2)",
            marginTop: 3,
          }}
        >
          {block.service}
        </div>

        <dl
          style={{
            margin: "var(--sp-3) 0 0",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "var(--sp-2) var(--sp-3)",
          }}
        >
          <Stat label="Ground slots" value={`${block.teu} / ${block.capacity}`} />
          <Stat label="Mean dwell" value={`${block.dwellDays} d`} />
          <Stat label="Reefer plugs" value={String(block.reefer)} />
          <Stat label="Moves / hr" value={String(block.movesPerHour)} />
        </dl>

        <div
          style={{
            marginTop: "var(--sp-3)",
            paddingTop: "var(--sp-2)",
            borderTop: "1px solid var(--line-soft)",
          }}
        >
          <span className={`badge ${status.cls}`}>{status.label}</span>
        </div>
      </div>
    </Html>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt
        style={{
          color: "var(--ink-3)",
          fontSize: 9.5,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          fontFamily: "var(--ff-mono), monospace",
        }}
      >
        {label}
      </dt>
      <dd
        className="num"
        style={{ margin: 0, fontSize: "var(--fs-xs)", color: "var(--ink)" }}
      >
        {value}
      </dd>
    </div>
  );
}

/* ---------------- scene ---------------- */

function SceneContents({
  reducedMotion,
  palette,
}: {
  reducedMotion: boolean;
  palette: StagePalette;
}) {
  const { blocks, hovered, selected, setHovered, setSelected, view, scenario, blockById } =
    useConsole();
  const focus = selected ? blockById(selected) ?? null : null;
  const shown = blockById(hovered) ?? focus;

  return (
    <>
      <color attach="background" args={[palette.sky]} />
      <fog attach="fog" args={[palette.fog, palette.fogNear, palette.fogFar]} />

      <hemisphereLight
        args={[palette.hemiSky, palette.hemiGround, palette.hemiIntensity]}
      />
      <directionalLight
        position={[34, 44, 22]}
        intensity={palette.keyIntensity}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-56}
        shadow-camera-right={56}
        shadow-camera-top={56}
        shadow-camera-bottom={-56}
        shadow-camera-far={140}
        shadow-bias={-0.0009}
      />
      <directionalLight position={[-30, 18, -30]} intensity={palette.fillIntensity} />

      <Ground palette={palette} />
      <Vessel />
      <Cranes working={scenario !== "hold"} />

      {blocks.map((b) => (
        <YardBlock
          key={b.id}
          block={b}
          hovered={hovered === b.id}
          selected={selected === b.id}
          settleKey={scenario}
          reducedMotion={reducedMotion}
          palette={palette}
          onHover={setHovered}
          onSelect={(id) => setSelected(selected === id ? null : id)}
        />
      ))}

      {blocks.map((b) => (
        <BlockTag key={b.id} block={b} palette={palette} />
      ))}

      {shown && <Callout block={shown} pinned={!!focus && shown.id === focus.id} />}

      {/* Clicking the ground clears the pin. */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.02, 0]}
        onClick={() => setSelected(null)}
      >
        <planeGeometry args={[240, 240]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <CameraRig view={view} focus={focus} reducedMotion={reducedMotion} />
    </>
  );
}

export default function Scene() {
  const { hovered } = useConsole();
  const { resolved } = useTheme();
  const palette = STAGE_PALETTE[resolved];
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      camera={{ position: [70, 54, 96], fov: 34, near: 0.5, far: 400 }}
      style={{ cursor: hovered ? "pointer" : "grab", touchAction: "pan-y" }}
    >
      <SceneContents reducedMotion={reducedMotion} palette={palette} />
    </Canvas>
  );
}
