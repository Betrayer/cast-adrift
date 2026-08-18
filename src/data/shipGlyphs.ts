import type { ShipId } from "@/data/ships";

export type GlyphPoint = readonly [number, number];

export interface ShipGlyph {
  hull: readonly GlyphPoint[];
  fins: readonly (readonly GlyphPoint[])[];
  cockpit: { x: number; y: number; r: number };
}

export const SHIP_GLYPHS: Record<ShipId, ShipGlyph> = {
  wanderer: {
    hull: [
      [0, -0.5],
      [0.3, 0.28],
      [0, 0.12],
      [-0.3, 0.28],
    ],
    fins: [
      [
        [-0.3, 0.1],
        [-0.46, 0.34],
        [-0.2, 0.26],
      ],
      [
        [0.3, 0.1],
        [0.46, 0.34],
        [0.2, 0.26],
      ],
    ],
    cockpit: { x: 0, y: -0.12, r: 0.09 },
  },
  ram: {
    hull: [
      [0, -0.5],
      [0.24, -0.1],
      [0.44, 0.24],
      [0.2, 0.42],
      [-0.2, 0.42],
      [-0.44, 0.24],
      [-0.24, -0.1],
    ],
    fins: [
      [
        [-0.24, -0.1],
        [-0.5, 0.02],
        [-0.34, 0.16],
      ],
      [
        [0.24, -0.1],
        [0.5, 0.02],
        [0.34, 0.16],
      ],
    ],
    cockpit: { x: 0, y: 0.02, r: 0.1 },
  },
  ark: {
    hull: [
      [0, -0.4],
      [0.36, -0.16],
      [0.42, 0.3],
      [0.16, 0.44],
      [-0.16, 0.44],
      [-0.42, 0.3],
      [-0.36, -0.16],
    ],
    fins: [
      [
        [-0.42, 0.06],
        [-0.5, 0.34],
        [-0.3, 0.3],
      ],
      [
        [0.42, 0.06],
        [0.5, 0.34],
        [0.3, 0.3],
      ],
    ],
    cockpit: { x: 0, y: -0.02, r: 0.12 },
  },
  "ram-proto": {
    hull: [
      [0, -0.46],
      [0.3, 0.3],
      [-0.3, 0.3],
    ],
    fins: [],
    cockpit: { x: 0, y: 0.02, r: 0.08 },
  },
};

export const shipGlyphFor = (id: ShipId): ShipGlyph =>
  SHIP_GLYPHS[id] ?? SHIP_GLYPHS.wanderer;
