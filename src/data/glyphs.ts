import type { School } from "@/types/content";

export interface SchoolGlyph {
  d: string;
  mode: "fill" | "stroke";
  width: number;
}

const n = (v: number): string => v.toFixed(3);

const circlePath = (cx: number, cy: number, r: number): string =>
  `M ${n(cx)} ${n(cy - r)} A ${n(r)} ${n(r)} 0 1 1 ${n(cx - 0.001)} ${n(
    cy - r,
  )} Z`;

const starPath = (cx: number, cy: number, r: number): string => {
  const points: string[] = [];
  for (let i = 0; i < 10; i += 1) {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const radius = i % 2 === 0 ? r : r * 0.44;
    points.push(
      `${n(cx + Math.cos(angle) * radius)} ${n(cy + Math.sin(angle) * radius)}`,
    );
  }
  return `M ${points.join(" L ")} Z`;
};

// One shape per school, defined once and rendered by both the Pixi die
// texture and the SVG legend in the Codex — identity that survives a
// monochrome theme and colour blindness alike.
export const schoolGlyphPath = (
  school: School,
  cx: number,
  cy: number,
  r: number,
): SchoolGlyph => {
  switch (school) {
    case "red":
      return {
        d: `M ${n(cx)} ${n(cy - r)} L ${n(cx + r)} ${n(cy + r * 0.8)} L ${n(
          cx - r,
        )} ${n(cy + r * 0.8)} Z`,
        mode: "fill",
        width: 0,
      };
    case "blue":
      return {
        d: `M ${n(cx - r * 0.85)} ${n(cy - r * 0.85)} H ${n(
          cx + r * 0.85,
        )} V ${n(cy + r * 0.85)} H ${n(cx - r * 0.85)} Z`,
        mode: "fill",
        width: 0,
      };
    case "green":
      return {
        d: `M ${n(cx)} ${n(cy - r)} Q ${n(cx + r)} ${n(cy - r * 0.2)} ${n(
          cx,
        )} ${n(cy + r)} Q ${n(cx - r)} ${n(cy - r * 0.2)} ${n(cx)} ${n(
          cy - r,
        )} Z`,
        mode: "fill",
        width: 0,
      };
    case "yellow":
      return {
        d: circlePath(cx, cy, r * 0.78),
        mode: "stroke",
        width: r * 0.42,
      };
    case "black":
      return {
        d: `M ${n(cx)} ${n(cy - r)} L ${n(cx + r * 0.42)} ${n(cy)} L ${n(
          cx,
        )} ${n(cy + r)} L ${n(cx - r * 0.42)} ${n(cy)} Z`,
        mode: "fill",
        width: 0,
      };
    case "grey":
      return { d: circlePath(cx, cy, r * 0.62), mode: "fill", width: 0 };
    case "prismatic":
      return { d: starPath(cx, cy, r), mode: "fill", width: 0 };
  }
};
