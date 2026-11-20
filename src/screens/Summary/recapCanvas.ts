import { rgba } from "@/app/color";
import { currentTheme, tokens } from "@/app/theme";
import { RECAP_HEIGHT, RECAP_WIDTH } from "@/game/run/recap";

export interface RecapTexts {
  brand: string;
  title: string;
  ship: string;
  rank: string;
  route: string;
  lines: readonly string[];
  footer: string;
}

const PAINT_PROPS: readonly string[] = [
  "fill",
  "fill-opacity",
  "stroke",
  "stroke-opacity",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-dasharray",
  "opacity",
];

const MARGIN = 72;
const MODEL_TOP = 250;
const MODEL_HEIGHT = 470;

const strokeScale = (live: SVGSVGElement): number => {
  const width = live.getBoundingClientRect().width;
  const view = live.viewBox.baseVal;
  return width > 0 && view.width > 0 ? view.width / width : 1;
};

export const selfContainedSvg = (live: SVGSVGElement): string => {
  const scale = strokeScale(live);
  const clone = live.cloneNode(true) as SVGSVGElement;
  const liveNodes: Element[] = [live, ...Array.from(live.querySelectorAll("*"))];
  const cloneNodes: Element[] = [clone, ...Array.from(clone.querySelectorAll("*"))];
  const hidden: Element[] = [];
  liveNodes.forEach((node, index) => {
    const twin = cloneNodes[index];
    if (twin === undefined) return;
    const style = getComputedStyle(node);
    if (style.display === "none") {
      hidden.push(twin);
      return;
    }
    const paint = PAINT_PROPS.map((prop) => `${prop}:${style.getPropertyValue(prop)}`);
    const width = Number.parseFloat(style.getPropertyValue("stroke-width"));
    const pixelStroke = style.getPropertyValue("vector-effect").trim() === "non-scaling-stroke";
    if (Number.isFinite(width)) paint.push(`stroke-width:${String(pixelStroke ? width * scale : width)}`);
    twin.setAttribute("style", paint.join(";"));
  });
  for (const node of hidden) node.remove();
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  return new XMLSerializer().serializeToString(clone);
};

const loadImage = (svg: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve(image);
    };
    image.onerror = () => {
      reject(new Error("recap: the ship model did not load"));
    };
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });

const fitFont = (ctx: CanvasRenderingContext2D, text: string, weight: number, size: number, family: string, max: number): void => {
  let px = size;
  ctx.font = `${String(weight)} ${String(px)}px ${family}`;
  while (px > 18 && ctx.measureText(text).width > max) {
    px -= 2;
    ctx.font = `${String(weight)} ${String(px)}px ${family}`;
  }
};

const centred = (
  ctx: CanvasRenderingContext2D,
  text: string,
  y: number,
  weight: number,
  size: number,
  family: string,
  colour: string,
): void => {
  fitFont(ctx, text, weight, size, family, RECAP_WIDTH - MARGIN * 2);
  ctx.fillStyle = colour;
  ctx.fillText(text, RECAP_WIDTH / 2, y);
};

const canvasBlob = (canvas: HTMLCanvasElement): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob === null) reject(new Error("recap: the canvas gave no image"));
      else resolve(blob);
    }, "image/png");
  });

export const drawRecap = async (
  texts: RecapTexts,
  win: boolean,
  accent: string,
  model: SVGSVGElement | null,
): Promise<Blob> => {
  const canvas = document.createElement("canvas");
  canvas.width = RECAP_WIDTH;
  canvas.height = RECAP_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (ctx === null) throw new Error("recap: no 2d context");
  const family = currentTheme().dieStyle.glyphFont;
  ctx.fillStyle = tokens.bg;
  ctx.fillRect(0, 0, RECAP_WIDTH, RECAP_HEIGHT);
  const wash = ctx.createRadialGradient(RECAP_WIDTH / 2, MODEL_TOP + MODEL_HEIGHT / 2, 40, RECAP_WIDTH / 2, MODEL_TOP + MODEL_HEIGHT / 2, 640);
  wash.addColorStop(0, rgba(accent, 0.3));
  wash.addColorStop(1, rgba(accent, 0));
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, RECAP_WIDTH, RECAP_HEIGHT);
  ctx.strokeStyle = rgba(accent, 0.75);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(36, 36, RECAP_WIDTH - 72, RECAP_HEIGHT - 72, 40);
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  centred(ctx, texts.brand.toUpperCase(), 128, 600, 34, family, tokens.dim);
  centred(ctx, texts.title, 210, 700, 76, family, win ? tokens.text : tokens.danger);
  if (model !== null) {
    try {
      const image = await loadImage(selfContainedSvg(model));
      const view = model.viewBox.baseVal;
      const aspect = view.height > 0 ? view.width / view.height : 2;
      const width = Math.min(RECAP_WIDTH - MARGIN * 2, MODEL_HEIGHT * aspect);
      const height = width / aspect;
      ctx.drawImage(image, (RECAP_WIDTH - width) / 2, MODEL_TOP + (MODEL_HEIGHT - height) / 2, width, height);
    } catch {
      ctx.strokeStyle = rgba(accent, 0.4);
      ctx.strokeRect(MARGIN, MODEL_TOP, RECAP_WIDTH - MARGIN * 2, MODEL_HEIGHT);
    }
  }
  centred(ctx, texts.ship, 800, 700, 56, family, tokens.text);
  centred(ctx, texts.rank, 858, 500, 36, family, accent);
  centred(ctx, texts.route, 918, 500, 36, family, tokens.dim);
  texts.lines.forEach((line, index) => {
    centred(ctx, line, 1010 + index * 58, 500, 38, family, tokens.text);
  });
  centred(ctx, texts.footer, RECAP_HEIGHT - 76, 500, 28, family, tokens.faint);
  return canvasBlob(canvas);
};
