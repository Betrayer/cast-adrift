export type Vec3 = readonly [number, number, number];

export type Quat = readonly [number, number, number, number];

export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

export const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];

export const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

export const length = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);

export const normalize = (a: Vec3): Vec3 => {
  const n = length(a);
  return n === 0 ? [0, 0, 1] : [a[0] / n, a[1] / n, a[2] / n];
};

export const IDENTITY: Quat = [1, 0, 0, 0];

export const quatMul = (a: Quat, b: Quat): Quat => [
  a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
  a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
  a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
  a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0],
];

export const quatNormalize = (q: Quat): Quat => {
  const n = Math.hypot(q[0], q[1], q[2], q[3]);
  return n === 0 ? IDENTITY : [q[0] / n, q[1] / n, q[2] / n, q[3] / n];
};

export const axisAngle = (axis: Vec3, angle: number): Quat => {
  const n = normalize(axis);
  const s = Math.sin(angle / 2);
  return [Math.cos(angle / 2), n[0] * s, n[1] * s, n[2] * s];
};

export const rotate = (q: Quat, v: Vec3): Vec3 => {
  const [w, x, y, z] = q;
  const ix = w * v[0] + y * v[2] - z * v[1];
  const iy = w * v[1] + z * v[0] - x * v[2];
  const iz = w * v[2] + x * v[1] - y * v[0];
  const iw = -x * v[0] - y * v[1] - z * v[2];
  return [
    ix * w + iw * -x + iy * -z - iz * -y,
    iy * w + iw * -y + iz * -x - ix * -z,
    iz * w + iw * -z + ix * -y - iy * -x,
  ];
};

export const arcBetween = (from: Vec3, to: Vec3): Quat => {
  const a = normalize(from);
  const b = normalize(to);
  const d = dot(a, b);
  if (d > 1 - 1e-9) return IDENTITY;
  if (d < -1 + 1e-9) {
    const helper: Vec3 = Math.abs(a[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    return axisAngle(cross(a, helper), Math.PI);
  }
  const axis = cross(a, b);
  return quatNormalize([1 + d, axis[0], axis[1], axis[2]]);
};

export const slerp = (a: Quat, b: Quat, t: number): Quat => {
  let cos = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  let end = b;
  if (cos < 0) {
    cos = -cos;
    end = [-b[0], -b[1], -b[2], -b[3]];
  }
  if (cos > 0.9995) {
    return quatNormalize([
      a[0] + (end[0] - a[0]) * t,
      a[1] + (end[1] - a[1]) * t,
      a[2] + (end[2] - a[2]) * t,
      a[3] + (end[3] - a[3]) * t,
    ]);
  }
  const angle = Math.acos(cos);
  const sin = Math.sin(angle);
  const wa = Math.sin((1 - t) * angle) / sin;
  const wb = Math.sin(t * angle) / sin;
  return [
    a[0] * wa + end[0] * wb,
    a[1] * wa + end[1] * wb,
    a[2] * wa + end[2] * wb,
    a[3] * wa + end[3] * wb,
  ];
};
