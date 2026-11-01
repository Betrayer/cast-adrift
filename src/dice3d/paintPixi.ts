import { BitmapFont, BitmapText, Container, Graphics } from "pixi.js";
import { hexToNumber } from "@/app/color";
import { faceColour, frontLabelScale, LABEL_SLOTS, labelPlacements, SIDE_LABEL_SCALE, type DiePalette } from "./paint";
import { POLYHEDRA, type DieShape } from "./polyhedra";
import { project } from "./projection";
import type { RollFrame, RollPlan } from "./spin";

export const DIE_LABEL_FONT = "caDieLabel";

let fontInstalled = false;

export const ensureDieLabelFont = (): void => {
  if (fontInstalled) return;
  BitmapFont.install({
    name: DIE_LABEL_FONT,
    style: {
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      fontSize: 48,
      fontWeight: "700",
      fill: "#ffffff",
    },
    chars: [["0", "9"]],
    resolution: 2,
  });
  fontInstalled = true;
};

export interface PolyPart {
  shape: DieShape;
  plan: RollPlan;
  offsetX: number;
  radius: number;
}

class PolyPartView {
  readonly body = new Graphics();
  readonly labels: BitmapText[];

  constructor(root: Container) {
    root.addChild(this.body);
    this.labels = Array.from({ length: LABEL_SLOTS }, () => {
      const text = new BitmapText({
        text: "",
        style: { fontFamily: DIE_LABEL_FONT, fontSize: 20 },
      });
      text.anchor.set(0.5);
      root.addChild(text);
      return text;
    });
  }

  draw(part: PolyPart, frame: RollFrame, palette: DiePalette): void {
    const radius = part.radius * frame.scale;
    const faces = project(POLYHEDRA[part.shape], frame.q, part.offsetX, 0, radius);
    const g = this.body;
    g.clear();
    const stroke = hexToNumber(palette.stroke);
    for (const face of faces) {
      g.poly(face.points.flatMap((point) => [point.x, point.y]));
      g.fill({ color: hexToNumber(faceColour(palette, face.shade)) });
      g.stroke({ color: stroke, width: Math.max(1, radius * 0.035), alpha: 0.85 });
    }
    if (frame.flash > 0) {
      g.circle(part.offsetX, 0, radius * 1.05);
      g.fill({ color: stroke, alpha: frame.flash * 0.45 });
    }
    const placements = labelPlacements(faces, frame.labels, frame.front, frame.labelAlpha);
    const tint = hexToNumber(palette.text);
    this.labels.forEach((label, slot) => {
      const placement = placements[slot];
      if (placement === undefined || placement.text === "" || placement.alpha <= 0) {
        label.visible = false;
        return;
      }
      label.visible = true;
      label.text = placement.text;
      label.style.fontSize = Math.max(8, Math.round(radius * (placement.front ? frontLabelScale(part.shape) : SIDE_LABEL_SCALE)));
      label.position.set(placement.x, placement.y);
      label.alpha = placement.alpha * (1 - frame.blur * 0.6);
      label.tint = tint;
    });
  }
}

export class PolyDie {
  readonly view = new Container();
  private readonly parts: PolyPartView[] = [];

  constructor(partCount: number) {
    ensureDieLabelFont();
    for (let i = 0; i < partCount; i += 1) this.parts.push(new PolyPartView(this.view));
    this.view.eventMode = "none";
  }

  draw(parts: readonly PolyPart[], ms: number, palette: DiePalette): void {
    parts.forEach((part, index) => {
      this.parts[index]?.draw(part, part.plan.at(ms), palette);
    });
  }

  destroy(): void {
    this.view.destroy({ children: true });
  }
}
