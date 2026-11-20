import { faceColour, frontLabelScale, labelPlacements, SIDE_LABEL_SCALE, type DiePalette } from "./paint";
import { POLYHEDRA, type DieShape } from "./polyhedra";
import { project } from "./projection";
import type { RollFrame } from "./spin";

export interface CanvasDie {
  shape: DieShape;
  x: number;
  y: number;
  radius: number;
  palette: DiePalette;
}

const FONT = "700 {size}px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

export const paintDie = (
  ctx: CanvasRenderingContext2D,
  die: CanvasDie,
  frame: RollFrame,
): void => {
  const radius = die.radius * frame.scale;
  const faces = project(POLYHEDRA[die.shape], frame.q, die.x, die.y, radius);
  ctx.save();
  if (frame.blur > 0 && "filter" in ctx) {
    ctx.filter = `blur(${(frame.blur * radius * 0.12).toFixed(2)}px)`;
  }
  for (const face of faces) {
    const [first, ...rest] = face.points;
    if (first === undefined) continue;
    ctx.beginPath();
    ctx.moveTo(first.x, first.y);
    for (const point of rest) ctx.lineTo(point.x, point.y);
    ctx.closePath();
    ctx.fillStyle = faceColour(die.palette, face.shade);
    ctx.fill();
    ctx.lineWidth = Math.max(1, radius * 0.035);
    ctx.lineJoin = "round";
    ctx.strokeStyle = die.palette.stroke;
    ctx.globalAlpha = 0.85;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.filter = "none";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const label of labelPlacements(faces, frame.labels, frame.front, frame.labelAlpha)) {
    if (label.alpha <= 0 || label.text === "") continue;
    const size = Math.round(radius * (label.front ? frontLabelScale(die.shape) : SIDE_LABEL_SCALE));
    ctx.font = FONT.replace("{size}", String(size));
    ctx.globalAlpha = label.alpha;
    ctx.fillStyle = die.palette.text;
    ctx.fillText(label.text, label.x, label.y);
  }
  ctx.globalAlpha = 1;
  if (frame.flash > 0) {
    ctx.globalAlpha = frame.flash * 0.45;
    ctx.fillStyle = die.palette.stroke;
    ctx.beginPath();
    ctx.arc(die.x, die.y, radius * 1.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
};

export interface CanvasPart {
  shape: DieShape;
  offsetX: number;
  radius: number;
  frame: RollFrame;
}

export const paintParts = (
  ctx: CanvasRenderingContext2D,
  parts: readonly CanvasPart[],
  x: number,
  y: number,
  palette: DiePalette,
): void => {
  for (const part of parts) {
    paintDie(
      ctx,
      { shape: part.shape, x: x + part.offsetX, y, radius: part.radius, palette },
      part.frame,
    );
  }
};
