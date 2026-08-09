/** Scene units: 1 unit ≈ 1.2 m. Everything else derives from the box. */
export const BOX = { w: 0.9, h: 0.85, l: 2.1 };

export const STACK_PITCH_X = 1.06;
export const STACK_PITCH_Z = 2.28;

export const COL_PITCH = 6.7;
export const ROW_PITCH = 14.2;

/** Quay face: the line the ground stops at and the water begins. */
export const QUAY_Z = -18;

/** Clears the crane apron between the quay face and the first block row. */
export const YARD_OFFSET_Z = 6;

export function blockCenter(row: number, col: number): [number, number, number] {
  return [(col - 2.5) * COL_PITCH, 0, (row - 0.5) * ROW_PITCH + YARD_OFFSET_Z];
}

export const CAMERA_VIEWS = {
  yard: { pos: [31, 27, 55], target: [1, 3.5, 6] },
  quay: { pos: [64, 21, 12], target: [-10, 7, -25] },
  // Deliberately off vertical: OrbitControls' azimuth is unstable directly
  // overhead, and the tilt keeps stack height legible.
  plan: { pos: [0, 66, 27], target: [0, 0, 5] },
} as const;

export type CameraViewId = keyof typeof CAMERA_VIEWS;
