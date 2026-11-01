import type { DieTier } from "@/types/content";
import { add, cross, dot, normalize, scale, type Vec3 } from "./vec";

export type DieShape = 4 | 6 | 8 | 10 | 12 | 20;

export interface Polyhedron {
  shape: DieShape;
  vertices: readonly Vec3[];
  faces: readonly (readonly number[])[];
  normals: readonly Vec3[];
  centroids: readonly Vec3[];
}

interface RawShape {
  v: Vec3[];
  f: number[][];
}

const PHI = (1 + Math.sqrt(5)) / 2;
const D10_ZIGZAG = 0.105;

const tetra = (): RawShape => ({
  v: (
    [
      [1, 1, 1],
      [1, -1, -1],
      [-1, 1, -1],
      [-1, -1, 1],
    ] as Vec3[]
  ).map(normalize),
  f: [
    [0, 1, 2],
    [0, 3, 1],
    [0, 2, 3],
    [1, 3, 2],
  ],
});

const cube = (): RawShape => {
  const v: Vec3[] = [];
  for (const x of [-1, 1]) {
    for (const y of [-1, 1]) {
      for (const z of [-1, 1]) v.push(normalize([x, y, z]));
    }
  }
  return {
    v,
    f: [
      [0, 1, 3, 2],
      [4, 6, 7, 5],
      [0, 4, 5, 1],
      [2, 3, 7, 6],
      [0, 2, 6, 4],
      [1, 5, 7, 3],
    ],
  };
};

const octa = (): RawShape => ({
  v: [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ],
  f: [
    [0, 2, 4],
    [2, 1, 4],
    [1, 3, 4],
    [3, 0, 4],
    [2, 0, 5],
    [1, 2, 5],
    [3, 1, 5],
    [0, 3, 5],
  ],
});

const icosa = (): RawShape => ({
  v: (
    [
      [-1, PHI, 0],
      [1, PHI, 0],
      [-1, -PHI, 0],
      [1, -PHI, 0],
      [0, -1, PHI],
      [0, 1, PHI],
      [0, -1, -PHI],
      [0, 1, -PHI],
      [PHI, 0, -1],
      [PHI, 0, 1],
      [-PHI, 0, -1],
      [-PHI, 0, 1],
    ] as Vec3[]
  ).map(normalize),
  f: [
    [0, 11, 5],
    [0, 5, 1],
    [0, 1, 7],
    [0, 7, 10],
    [0, 10, 11],
    [1, 5, 9],
    [5, 11, 4],
    [11, 10, 2],
    [10, 7, 6],
    [7, 1, 8],
    [3, 9, 4],
    [3, 4, 2],
    [3, 2, 6],
    [3, 6, 8],
    [3, 8, 9],
    [4, 9, 5],
    [2, 4, 11],
    [6, 2, 10],
    [8, 6, 7],
    [9, 8, 1],
  ],
});

const trapezohedron = (): RawShape => {
  const v: Vec3[] = [
    [0, 1, 0],
    [0, -1, 0],
  ];
  for (let i = 0; i < 10; i += 1) {
    const a = (i * Math.PI) / 5;
    v.push(normalize([Math.cos(a), i % 2 === 1 ? D10_ZIGZAG : -D10_ZIGZAG, Math.sin(a)]));
  }
  const f: number[][] = [];
  for (let i = 0; i < 10; i += 1) {
    f.push([i % 2 === 1 ? 1 : 0, 2 + ((i + 9) % 10), 2 + i, 2 + ((i + 1) % 10)]);
  }
  return { v, f };
};

const centroidOf = (v: readonly Vec3[], face: readonly number[]): Vec3 => {
  let c: Vec3 = [0, 0, 0];
  for (const index of face) c = add(c, v[index] ?? [0, 0, 0]);
  return scale(c, 1 / Math.max(1, face.length));
};

const dual = (p: RawShape): RawShape => {
  const v = p.f.map((face) => normalize(centroidOf(p.v, face)));
  const f = p.v.map((vertex, vi) => {
    const ring = p.f
      .map((face, fi) => (face.includes(vi) ? fi : -1))
      .filter((fi) => fi >= 0);
    const n = normalize(vertex);
    const helper: Vec3 = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    const t = normalize(cross(n, helper));
    const b = cross(n, t);
    return ring.sort((i, j) => {
      const vi2 = v[i] ?? [0, 0, 0];
      const vj2 = v[j] ?? [0, 0, 0];
      return Math.atan2(dot(vi2, b), dot(vi2, t)) - Math.atan2(dot(vj2, b), dot(vj2, t));
    });
  });
  return { v, f };
};

export const newellNormal = (v: readonly Vec3[], face: readonly number[]): Vec3 => {
  let nx = 0;
  let ny = 0;
  let nz = 0;
  for (let i = 0; i < face.length; i += 1) {
    const a = v[face[i] ?? 0] ?? [0, 0, 0];
    const b = v[face[(i + 1) % face.length] ?? 0] ?? [0, 0, 0];
    nx += (a[1] - b[1]) * (a[2] + b[2]);
    ny += (a[2] - b[2]) * (a[0] + b[0]);
    nz += (a[0] - b[0]) * (a[1] + b[1]);
  }
  return normalize([nx, ny, nz]);
};

const build = (shape: DieShape, raw: RawShape): Polyhedron => {
  const faces = raw.f.map((face) => {
    const n = newellNormal(raw.v, face);
    return dot(n, centroidOf(raw.v, face)) < 0 ? [...face].reverse() : face;
  });
  return {
    shape,
    vertices: raw.v,
    faces,
    normals: faces.map((face) => newellNormal(raw.v, face)),
    centroids: faces.map((face) => centroidOf(raw.v, face)),
  };
};

export const POLYHEDRA: Readonly<Record<DieShape, Polyhedron>> = {
  4: build(4, tetra()),
  6: build(6, cube()),
  8: build(8, octa()),
  10: build(10, trapezohedron()),
  12: build(12, dual(icosa())),
  20: build(20, icosa()),
};

export const DIE_SHAPES: readonly DieShape[] = [4, 6, 8, 10, 12, 20];

export const isPercentile = (tier: DieTier): boolean => tier === 100;

export const shapeFor = (tier: DieTier): DieShape => (tier === 100 ? 10 : tier);
