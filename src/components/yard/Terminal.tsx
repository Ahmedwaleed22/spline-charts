"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { StagePalette } from "@/lib/theme";
import { BOX, QUAY_Z } from "./constants";

const STEEL = "#3f5b69";
const CRANE = "#e8621f";

/* ---------------- ground, water, quay ---------------- */

export function Ground({ palette }: { palette: StagePalette }) {
  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.34, QUAY_Z - 60]}
        receiveShadow={false}
      >
        <planeGeometry args={[260, 120]} />
        <meshLambertMaterial color={palette.water} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, QUAY_Z + 45]} receiveShadow>
        <planeGeometry args={[200, 90]} />
        <meshLambertMaterial color={palette.apron} />
      </mesh>

      {/* Quay curb and the apron stripe cranes run on. */}
      <mesh position={[0, -0.17, QUAY_Z - 0.35]}>
        <boxGeometry args={[200, 0.7, 0.7]} />
        <meshLambertMaterial color={palette.curb} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.014, QUAY_Z + 3]}>
        <planeGeometry args={[200, 0.35]} />
        <meshBasicMaterial color={CRANE} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.014, QUAY_Z + 9]}>
        <planeGeometry args={[200, 0.35]} />
        <meshBasicMaterial color={CRANE} />
      </mesh>
    </group>
  );
}

/* ---------------- quay cranes ---------------- */

function Crane({ x, phase, working }: { x: number; phase: number; working: boolean }) {
  const trolley = useRef<THREE.Group>(null);
  const spreader = useRef<THREE.Mesh>(null);
  const cable = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!trolley.current || !spreader.current || !cable.current) return;
    if (!working) {
      trolley.current.position.z = -20;
      spreader.current.position.y = 13.4;
      cable.current.scale.y = 0.01;
      return;
    }
    const t = clock.elapsedTime * 0.32 + phase;
    // Trolley shuttles between the vessel and the quay drop point.
    const s = (Math.sin(t) + 1) / 2;
    const z = -32 + s * 16;
    trolley.current.position.z = z;
    // The spreader dips at each end of the run and rides high in between.
    const dip = Math.pow(Math.abs(Math.cos(t)), 6);
    const y = 13.6 - dip * 7.4;
    spreader.current.position.y = y;
    const len = 14.4 - y;
    cable.current.scale.y = Math.max(0.01, len);
    cable.current.position.y = 14.4 - len / 2;
  });

  return (
    <group position={[x, 0, 0]}>
      {/* Legs straddling the apron. */}
      {[
        [-3.4, QUAY_Z + 1.5],
        [3.4, QUAY_Z + 1.5],
        [-3.4, QUAY_Z + 10],
        [3.4, QUAY_Z + 10],
      ].map(([lx, lz], i) => (
        <mesh key={i} position={[lx, 7, lz]} castShadow>
          <boxGeometry args={[0.85, 14, 0.85]} />
          <meshLambertMaterial color={CRANE} />
        </mesh>
      ))}

      {/* Sill beams tying the legs together above the rail. */}
      {[QUAY_Z + 1.5, QUAY_Z + 10].map((lz) => (
        <mesh key={lz} position={[0, 2.4, lz]} castShadow>
          <boxGeometry args={[7.6, 0.7, 0.7]} />
          <meshLambertMaterial color={CRANE} />
        </mesh>
      ))}

      {/* Portal beams + sill. */}
      <mesh position={[0, 14.2, QUAY_Z + 1.5]} castShadow>
        <boxGeometry args={[7.9, 0.8, 0.6]} />
        <meshLambertMaterial color={CRANE} />
      </mesh>
      <mesh position={[0, 14.2, QUAY_Z + 10]} castShadow>
        <boxGeometry args={[7.9, 0.8, 0.6]} />
        <meshLambertMaterial color={CRANE} />
      </mesh>
      {[-3.4, 3.4].map((lx) => (
        <mesh key={lx} position={[lx, 14.5, QUAY_Z + 5.7]} castShadow>
          <boxGeometry args={[0.6, 0.6, 9]} />
          <meshLambertMaterial color={CRANE} />
        </mesh>
      ))}

      {/* Boom over the vessel, backreach over the yard, mast between them. */}
      <mesh position={[0, 14.9, QUAY_Z - 9]} castShadow>
        <boxGeometry args={[1.5, 0.7, 22]} />
        <meshLambertMaterial color={CRANE} />
      </mesh>
      <mesh position={[0, 14.9, QUAY_Z + 12]} castShadow>
        <boxGeometry args={[1.5, 0.7, 8]} />
        <meshLambertMaterial color={CRANE} />
      </mesh>
      <mesh position={[0, 18.2, QUAY_Z + 5.7]} castShadow>
        <boxGeometry args={[0.5, 7, 0.5]} />
        <meshLambertMaterial color={CRANE} />
      </mesh>
      {/* Machinery house. */}
      <mesh position={[2.4, 15.4, QUAY_Z + 9.4]} castShadow>
        <boxGeometry args={[2, 1.4, 2.8]} />
        <meshLambertMaterial color={CRANE} />
      </mesh>

      <group ref={trolley}>
        <mesh position={[0, 14.4, 0]} castShadow>
          <boxGeometry args={[2, 1, 2.4]} />
          <meshLambertMaterial color={STEEL} />
        </mesh>
        <mesh ref={cable} position={[0, 14, 0]}>
          <boxGeometry args={[0.09, 1, 0.09]} />
          <meshBasicMaterial color="#2b3f4a" />
        </mesh>
        <mesh ref={spreader} position={[0, 13.4, 0]} castShadow>
          <boxGeometry args={[1.3, 0.4, BOX.l + 0.3]} />
          <meshLambertMaterial color={CRANE} />
        </mesh>
      </group>
    </group>
  );
}

export function Cranes({ working }: { working: boolean }) {
  return (
    <group>
      <Crane x={-13} phase={0} working={working} />
      <Crane x={0.5} phase={2.1} working={working} />
      <Crane x={14} phase={4.3} working={working} />
    </group>
  );
}

/* ---------------- the vessel at berth ---------------- */

export function Vessel() {
  const hull = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-23, -5.2);
    s.lineTo(17, -5.2);
    s.lineTo(23.5, -2.6);
    s.lineTo(23.5, 2.6);
    s.lineTo(17, 5.2);
    s.lineTo(-23, 5.2);
    s.lineTo(-23, -5.2);
    return new THREE.ExtrudeGeometry(s, { depth: 5.6, bevelEnabled: false });
  }, []);

  const deck = useMemo(() => {
    const out: { key: string; pos: [number, number, number]; color: string }[] = [];
    const palette = ["#2c6fae", "#b8460f", "#12a074", "#4d6675", "#d99a06"];
    for (let bay = 0; bay < 13; bay++) {
      for (let row = 0; row < 7; row++) {
        const height = bay > 10 ? 2 : bay < 2 ? 2 : 3 + ((bay + row) % 2);
        for (let tier = 0; tier < height; tier++) {
          out.push({
            key: `${bay}-${row}-${tier}`,
            pos: [
              -17 + bay * 2.4,
              5.5 + tier * (BOX.h + 0.02),
              -3.3 + row * 1.1,
            ],
            color: palette[(bay * 3 + row * 5 + tier) % palette.length],
          });
        }
      }
    }
    return out;
  }, []);

  return (
    <group position={[-4, 0, QUAY_Z - 12]}>
      <mesh
        geometry={hull}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        castShadow
      >
        <meshLambertMaterial color="#1f3b4a" />
      </mesh>
      {/* Boot-top stripe at the waterline. */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[46.4, 1.1, 10.6]} />
        <meshLambertMaterial color="#8f2d1a" />
      </mesh>

      {deck.map((b) => (
        <mesh key={b.key} position={b.pos} castShadow>
          <boxGeometry args={[BOX.l, BOX.h, BOX.w]} />
          <meshLambertMaterial color={b.color} />
        </mesh>
      ))}

      {/* Accommodation block and funnel, aft. */}
      <mesh position={[-20, 9.6, 0]} castShadow>
        <boxGeometry args={[5, 8.8, 9]} />
        <meshLambertMaterial color="#e8eced" />
      </mesh>
      <mesh position={[-22.2, 15.6, 0]} castShadow>
        <boxGeometry args={[2.4, 3.6, 4.4]} />
        <meshLambertMaterial color="#e8621f" />
      </mesh>
      <mesh position={[16, 6.4, 0]} castShadow>
        <boxGeometry args={[9, 0.7, 9]} />
        <meshLambertMaterial color="#2b4c5c" />
      </mesh>
    </group>
  );
}
