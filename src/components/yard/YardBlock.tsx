"use client";

import { useEffect, useMemo, useRef } from "react";
import { Instance, Instances } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  BLOCK_BAYS,
  BLOCK_ROWS,
  SLOTS_PER_BLOCK,
  dwellHex,
  stackHeights,
  type Block,
} from "@/lib/data";
import type { StagePalette } from "@/lib/theme";
import { BOX, STACK_PITCH_X, STACK_PITCH_Z, blockCenter } from "./constants";

type Props = {
  block: Block;
  hovered: boolean;
  selected: boolean;
  /** Bumped whenever the dataset changes, to replay the settle animation. */
  settleKey: string;
  reducedMotion: boolean;
  /** Slab tones only: container colour is the dwell encoding and never varies. */
  palette: StagePalette;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
};

const FOOTPRINT_X = BLOCK_ROWS * STACK_PITCH_X;
const FOOTPRINT_Z = BLOCK_BAYS * STACK_PITCH_Z;

export function YardBlock({
  block,
  hovered,
  selected,
  settleKey,
  reducedMotion,
  palette,
  onHover,
  onSelect,
}: Props) {
  const group = useRef<THREE.Group>(null);
  const lift = useRef(0);
  const settle = useRef(reducedMotion ? 1 : 0);
  const [cx, , cz] = blockCenter(block.row, block.col);

  useEffect(() => {
    settle.current = reducedMotion ? 1 : -(block.col * 0.06 + block.row * 0.09);
  }, [settleKey, block.col, block.row, reducedMotion]);

  const boxes = useMemo(() => {
    const tiers = stackHeights(block);
    const base = new THREE.Color(dwellHex(block.dwellDays));
    const out: { key: string; pos: [number, number, number]; color: string }[] = [];

    tiers.forEach((tierCount, stackIndex) => {
      const r = stackIndex % BLOCK_ROWS;
      const b = Math.floor(stackIndex / BLOCK_ROWS);
      const x = (r - (BLOCK_ROWS - 1) / 2) * STACK_PITCH_X;
      const z = (b - (BLOCK_BAYS - 1) / 2) * STACK_PITCH_Z;

      for (let tier = 0; tier < tierCount; tier++) {
        // A touch of per-box lightness so the stacks read as separate steel,
        // not one extruded mass. The dwell step still carries the meaning.
        const shade = base
          .clone()
          .offsetHSL(0, 0, ((stackIndex * 7 + tier * 3) % 5) * 0.012 - 0.024);
        out.push({
          key: `${stackIndex}-${tier}`,
          pos: [x, BOX.h / 2 + tier * (BOX.h + 0.02), z],
          color: `#${shade.getHexString()}`,
        });
      }
    });
    return out;
  }, [block]);

  useFrame((_, delta) => {
    if (!group.current) return;
    const d = Math.min(delta, 0.05);

    const targetLift = hovered || selected ? 0.55 : 0;
    lift.current += (targetLift - lift.current) * Math.min(1, d * 12);
    group.current.position.y = lift.current;

    if (settle.current < 1) {
      settle.current = Math.min(1, settle.current + d * 1.5);
      const e = Math.max(0, settle.current);
      const eased = 1 - Math.pow(1 - e, 3);
      group.current.scale.y = 0.05 + eased * 0.95;
    } else {
      group.current.scale.y = 1;
    }
  });

  const accent = hovered || selected;

  return (
    <group position={[cx, 0, cz]}>
      {/* Painted yard slab under the block. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} receiveShadow>
        <planeGeometry args={[FOOTPRINT_X + 1.5, FOOTPRINT_Z + 1.2]} />
        <meshBasicMaterial color={accent ? palette.slabHot : palette.slab} />
      </mesh>

      {/* Corner brackets, the reticle on the block under inspection. */}
      {accent && <Brackets w={FOOTPRINT_X + 1.9} d={FOOTPRINT_Z + 1.6} solid={selected} />}

      <group ref={group} scale={[1, reducedMotion ? 1 : 0.05, 1]}>
        {/* Fixed limit + explicit range: resizing the buffer between datasets
            leaves stale matrices and black instance colours behind. The key
            remounts the pool when the dataset changes. */}
        <Instances
          key={settleKey}
          limit={SLOTS_PER_BLOCK}
          range={boxes.length}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[BOX.w, BOX.h, BOX.l]} />
          <meshLambertMaterial />
          {boxes.map((b) => (
            <Instance key={b.key} position={b.pos} color={b.color} />
          ))}
        </Instances>
      </group>

      {/* Pointer target: one volume for the whole block, so hovering is forgiving. */}
      <mesh
        position={[0, 2.4, 0]}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(block.id);
        }}
        onPointerOut={() => onHover(null)}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(block.id);
        }}
      >
        <boxGeometry args={[FOOTPRINT_X + 1.4, 5, FOOTPRINT_Z + 1.2]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Brackets({ w, d, solid }: { w: number; d: number; solid: boolean }) {
  const arm = 1.5;
  const t = 0.16;
  const y = 0.05;
  const color = solid ? "#e8621f" : "#7d2f0a";
  const corners: [number, number][] = [
    [-w / 2, -d / 2],
    [w / 2, -d / 2],
    [-w / 2, d / 2],
    [w / 2, d / 2],
  ];
  return (
    <group>
      {corners.map(([x, z], i) => (
        <group key={i} position={[x, y, z]}>
          <mesh position={[(-Math.sign(x) * arm) / 2, 0, 0]}>
            <boxGeometry args={[arm, t, t]} />
            <meshBasicMaterial color={color} />
          </mesh>
          <mesh position={[0, 0, (-Math.sign(z) * arm) / 2]}>
            <boxGeometry args={[t, t, arm]} />
            <meshBasicMaterial color={color} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
