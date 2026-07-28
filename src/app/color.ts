export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface Hsl {
  h: number;
  s: number;
  l: number;
}

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

const hex2 = (v: number): string =>
  Math.round(clamp01(v) * 255)
    .toString(16)
    .padStart(2, "0");

export const hexToRgb = (hex: string): Rgb => {
  const raw = hex.replace("#", "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  const int = Number.parseInt(full.slice(0, 6), 16);
  return {
    r: ((int >> 16) & 0xff) / 255,
    g: ((int >> 8) & 0xff) / 255,
    b: (int & 0xff) / 255,
  };
};

export const rgbToHex = ({ r, g, b }: Rgb): string =>
  `#${hex2(r)}${hex2(g)}${hex2(b)}`.toUpperCase();

export const hexToNumber = (hex: string): number => {
  const { r, g, b } = hexToRgb(hex);
  return (
    (Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255)
  );
};

export const rgbToHsl = ({ r, g, b }: Rgb): Hsl => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return { h, s, l };
};

export const hslToRgb = ({ h, s, l }: Hsl): Rgb => {
  const c = (1 - Math.abs(2 * l - 1)) * clamp01(s);
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const m = l - c / 2;
  let rgb: [number, number, number];
  if (hp < 1) rgb = [c, x, 0];
  else if (hp < 2) rgb = [x, c, 0];
  else if (hp < 3) rgb = [0, c, x];
  else if (hp < 4) rgb = [0, x, c];
  else if (hp < 5) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  return { r: rgb[0] + m, g: rgb[1] + m, b: rgb[2] + m };
};

export const hexToHsl = (hex: string): Hsl => rgbToHsl(hexToRgb(hex));
export const hslToHex = (hsl: Hsl): string => rgbToHex(hslToRgb(hsl));

export const mixHex = (a: string, b: string, t: number): string => {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const k = clamp01(t);
  return rgbToHex({
    r: ca.r + (cb.r - ca.r) * k,
    g: ca.g + (cb.g - ca.g) * k,
    b: ca.b + (cb.b - ca.b) * k,
  });
};

export const rgba = (hex: string, alpha: number): string => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${String(Math.round(r * 255))}, ${String(Math.round(g * 255))}, ${String(
    Math.round(b * 255),
  )}, ${String(clamp01(alpha))})`;
};

const channelLuminance = (c: number): number =>
  c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;

export const relativeLuminance = (hex: string): number => {
  const { r, g, b } = hexToRgb(hex);
  return (
    0.2126 * channelLuminance(r) +
    0.7152 * channelLuminance(g) +
    0.0722 * channelLuminance(b)
  );
};

export const contrastRatio = (a: string, b: string): number => {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
};

const shortestHueDelta = (from: number, to: number): number => {
  const raw = ((to - from + 540) % 360) - 180;
  return raw;
};

export interface HueTint {
  hue: number;
  hueMix: number;
  satScale: number;
  lightShift: number;
}

export const tintHex = (hex: string, tint: HueTint): string => {
  const hsl = hexToHsl(hex);
  const h = hsl.h + shortestHueDelta(hsl.h, tint.hue) * clamp01(tint.hueMix);
  return hslToHex({
    h,
    s: clamp01(hsl.s * tint.satScale),
    l: clamp01(hsl.l + tint.lightShift),
  });
};
