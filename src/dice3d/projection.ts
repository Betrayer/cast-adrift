import type { Polyhedron } from "./polyhedra";
import { dot, normalize, rotate, type Quat, type Vec3 } from "./vec";

export const LIGHT: Vec3 = normalize([-0.4, -0.6, 1]);

export const AMBIENT = 0.35;

export interface ScreenPoint {
  x: number;
  y: number;
}

export interface ProjectedFace {
  index: number;
  points: readonly ScreenPoint[];
  centre: ScreenPoint;
  depth: number;
  facing: number;
  shade: number;
}

export const toScreen = (v: Vec3, cx: number, cy: number, radius: number): ScreenPoint => ({
  x: cx + v[0] * radius,
  y: cy - v[1] * radius,
});

export const facingOf = (poly: Polyhedron, q: Quat, face: number): number =>
  rotate(q, poly.normals[face] ?? [0, 0, 1])[2];

export const topFace = (poly: Polyhedron, q: Quat): number => {
  let best = 0;
  let bestFacing = -Infinity;
  for (let face = 0; face < poly.faces.length; face += 1) {
    const facing = facingOf(poly, q, face);
    if (facing > bestFacing) {
      bestFacing = facing;
      best = face;
    }
  }
  return best;
};

export const project = (
  poly: Polyhedron,
  q: Quat,
  cx: number,
  cy: number,
  radius: number,
): ProjectedFace[] => {
  const rotated = poly.vertices.map((vertex) => rotate(q, vertex));
  const out: ProjectedFace[] = [];
  poly.faces.forEach((face, index) => {
    const normal = rotate(q, poly.normals[index] ?? [0, 0, 1]);
    if (normal[2] <= 0) return;
    const centroid = rotate(q, poly.centroids[index] ?? [0, 0, 0]);
    out.push({
      index,
      points: face.map((vi) => toScreen(rotated[vi] ?? [0, 0, 0], cx, cy, radius)),
      centre: toScreen(centroid, cx, cy, radius),
      depth: centroid[2],
      facing: normal[2],
      shade: AMBIENT + (1 - AMBIENT) * Math.max(0, dot(normal, LIGHT)),
    });
  });
  return out.sort((a, b) => a.depth - b.depth);
};
