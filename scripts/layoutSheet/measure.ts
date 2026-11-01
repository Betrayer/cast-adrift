export const MIN_TARGET = 44;
export const CLIP_TOLERANCE = 4;
export const NAME_SHIM = "window.__name = window.__name || ((fn) => fn)";

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Measure {
  overflow: { what: string; box: Box }[];
  clippedText: { what: string; scroll: number; client: number }[];
  cut: { what: string; box: Box }[];
  smallTargets: { what: string; box: Box; effective: number; thief: string }[];
  textOverlaps: { a: string; b: string; area: number }[];
  insetIntrusions: { what: string; box: Box; band: "top" | "bottom" }[];
  safe: { top: number; bottom: number };
}

interface MeasureArgs {
  screenId: string;
  minTarget: number;
  tolerance: number;
}

export const measure = ({ screenId, minTarget, tolerance }: MeasureArgs): Measure => {
  const describe = (el: Element): string => {
    const tid = el.getAttribute("data-testid");
    if (tid !== null) return `[data-testid=${tid}]`;
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.startsWith("data-") && attr.name !== "data-rise" && attr.name !== "data-press") {
        return `${el.tagName.toLowerCase()}[${attr.name}${attr.value === "" ? "" : `=${attr.value.slice(0, 24)}`}]`;
      }
    }
    const text = (el.textContent ?? "").trim().slice(0, 32);
    return `${el.tagName.toLowerCase()}${text === "" ? "" : ` «${text}»`}`;
  };
  const box = (r: DOMRect): Box => ({ x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) });
  const visible = (el: Element): boolean => {
    const style = getComputedStyle(el);
    if (style.visibility === "hidden" || style.display === "none") return false;
    let node: Element | null = el;
    while (node !== null) {
      if (Number(getComputedStyle(node).opacity) < 0.05) return false;
      node = node.parentElement;
    }
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const clipRect = (el: Element, r: DOMRect): DOMRect => {
    let left = r.left;
    let right = r.right;
    let top = r.top;
    let bottom = r.bottom;
    let node: Element | null = el;
    while (node !== null) {
      const style = getComputedStyle(node);
      if (style.overflow !== "visible" || style.overflowX !== "visible" || style.overflowY !== "visible") {
        const box = node.getBoundingClientRect();
        left = Math.max(left, box.left);
        right = Math.min(right, box.right);
        top = Math.max(top, box.top);
        bottom = Math.min(bottom, box.bottom);
      }
      node = node.parentElement;
    }
    return new DOMRect(left, top, right - left, bottom - top);
  };
  const clippedAway = (el: Element, r: DOMRect): boolean => {
    const box = clipRect(el, r);
    return box.width <= 1 || box.height <= 1;
  };
  const probe = document.createElement("div");
  probe.style.cssText = "position:fixed;left:0;top:0;width:0;height:var(--ca-safe-top);visibility:hidden;pointer-events:none";
  document.body.appendChild(probe);
  const top = probe.getBoundingClientRect().height;
  probe.style.height = "var(--ca-safe-bottom)";
  const bottom = probe.getBoundingClientRect().height;
  probe.remove();
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  const root = document.querySelector(`[data-screen="${screenId}"]:not([data-parked-screen] *)`) ?? document.body;
  const layerSelector = "[role=dialog], [data-coach-mark], [data-tap-popover]";
  const candidates = [root, ...Array.from(document.querySelectorAll(layerSelector))];
  const scope = candidates.filter((node) => !candidates.some((other) => other !== node && other.contains(node)));
  const elements = scope.flatMap((node) => Array.from(node.querySelectorAll("*"))).filter(visible);
  const out: Measure = { overflow: [], clippedText: [], cut: [], smallTargets: [], textOverlaps: [], insetIntrusions: [], safe: { top, bottom } };
  for (const el of elements) {
    if (el.closest("svg") !== null && el.tagName.toLowerCase() !== "svg") continue;
    if (el.closest("canvas") !== null) continue;
    const r = el.getBoundingClientRect();
    if ((r.right > vw + 1 || r.left < -1) && !clippedAway(el, r)) out.overflow.push({ what: describe(el), box: box(r) });
    const style = getComputedStyle(el);
    const shown = clipRect(el, r);
    if (shown.width > 2 && shown.height > 2 && (style.overflowX === "hidden" || style.overflowX === "clip") && style.textOverflow !== "ellipsis" && el.scrollWidth > el.clientWidth + 1 && (el.textContent ?? "").trim() !== "" && el.children.length === 0) {
      out.clippedText.push({ what: describe(el), scroll: el.scrollWidth, client: el.clientWidth });
    }
  }
  const body = root.querySelector("[data-screen-body]");
  if (body !== null && getComputedStyle(body).overflowY !== "auto" && getComputedStyle(body).overflowY !== "scroll") {
    const b = body.getBoundingClientRect();
    for (const el of Array.from(body.querySelectorAll("*")).filter(visible)) {
      if (el.closest("svg") !== null || el.tagName.toLowerCase() === "canvas") continue;
      const r = el.getBoundingClientRect();
      if (r.bottom > b.bottom + tolerance || r.top < b.top - tolerance || r.right > b.right + tolerance || r.left < b.left - tolerance) {
        out.cut.push({ what: describe(el), box: box(r) });
      }
    }
  }
  const interactive = elements.filter((el) =>
    el.matches("button, a[href], [role=button], [role=tab], [role=menuitemradio], input:not([type=hidden]), select, textarea, [data-press], [tabindex]:not([tabindex='-1']), [data-node], [data-chart-node]") &&
    !el.matches(":disabled, [aria-hidden=true]") &&
    el.closest("[aria-hidden=true]") === null &&
    (!el.matches("[data-node], [data-chart-node]") || getComputedStyle(el).cursor === "pointer"),
  );
  const owns = (hit: Element | null, el: Element): boolean => hit !== null && (hit === el || el.contains(hit) || hit.contains(el));
  const sampleArea = (cx: number, cy: number, w: number, h: number, claim: (x: number, y: number) => true | string): { effective: number; thief: string } => {
    let hits = 0;
    let total = 0;
    const thieves = new Map<string, number>();
    for (let i = 0; i < 5; i += 1) {
      for (let j = 0; j < 5; j += 1) {
        const x = cx - w / 2 + (w * (i + 0.5)) / 5;
        const y = cy - h / 2 + (h * (j + 0.5)) / 5;
        if (x < 0 || y < 0 || x > vw || y > vh) continue;
        total += 1;
        const owner = claim(x, y);
        if (owner === true) {
          hits += 1;
          continue;
        }
        thieves.set(owner, (thieves.get(owner) ?? 0) + 1);
      }
    }
    return {
      effective: total === 0 ? 0 : Math.round(Math.sqrt((hits / total) * w * h)),
      thief: Array.from(thieves.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "",
    };
  };
  for (const el of interactive) {
    const r = el.getBoundingClientRect();
    if (r.width >= minTarget && r.height >= minTarget) continue;
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    if (cx < 0 || cy < 0 || cx > vw || cy > vh) continue;
    if (clippedAway(el, r)) continue;
    if (!owns(document.elementFromPoint(cx, cy), el)) continue;
    const span = (size: number): number => Math.max(size, minTarget);
    const w = span(r.width);
    const h = span(r.height);
    const { effective, thief } = sampleArea(cx, cy, w, h, (x, y) => {
      const at = document.elementFromPoint(x, y);
      return owns(at, el) ? true : at === null ? "nothing" : describe(at);
    });
    if (effective < minTarget) out.smallTargets.push({ what: describe(el), box: box(r), effective, thief });
  }
  const api = window.caTest;
  const anchors = api?.anchors() ?? null;
  if (api !== undefined && anchors !== null) {
    for (const die of anchors.dice) {
      const side = Math.max(die.size, minTarget);
      const { effective, thief } = sampleArea(die.x, die.y, side, side, (x, y) => {
        const owner = api.dieAt(x, y);
        if (owner === die.uid) return true;
        if (owner !== null) return `pixi die ${owner}`;
        const at = document.elementFromPoint(x, y);
        return at === null ? "nothing" : describe(at);
      });
      if (effective < minTarget) {
        out.smallTargets.push({
          what: `pixi die ${die.uid}`,
          box: { x: Math.round(die.x - die.size / 2), y: Math.round(die.y - die.size / 2), w: Math.round(die.size), h: Math.round(die.size) },
          effective,
          thief,
        });
      }
    }
  }
  const layerOf = (el: Element): Element => el.closest(layerSelector) ?? root;
  const texts: { el: Element; r: DOMRect; layer: Element }[] = [];
  for (const layerRoot of scope) {
    const walker = document.createTreeWalker(layerRoot, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
      if ((node.textContent ?? "").trim() === "") continue;
      const parent = node.parentElement;
      if (parent === null || !visible(parent)) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const r of Array.from(range.getClientRects())) {
        if (r.width <= 1 || r.height <= 1) continue;
        if (r.right < 0 || r.left > vw || r.bottom < 0 || r.top > vh) continue;
        const shown = clipRect(parent, r);
        if (shown.width <= 1 || shown.height <= 1) continue;
        texts.push({ el: parent, r: shown, layer: layerOf(parent) });
      }
    }
  }
  for (let i = 0; i < texts.length; i += 1) {
    for (let j = i + 1; j < texts.length; j += 1) {
      const a = texts[i];
      const b = texts[j];
      if (a === undefined || b === undefined) continue;
      if (a.layer !== b.layer) continue;
      if (a.el === b.el || a.el.contains(b.el) || b.el.contains(a.el)) continue;
      const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
      const h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
      if (w > 2 && h > 2) out.textOverlaps.push({ a: describe(a.el), b: describe(b.el), area: Math.round(w * h) });
    }
  }
  const paintedAt = (el: Element, r: DOMRect, y: number): boolean => {
    if (r.right < 0 || r.left > vw) return false;
    const x = Math.min(Math.max(r.left + r.width / 2, 1), vw - 1);
    if (y < 1 || y > vh - 1) return false;
    const at = document.elementFromPoint(x, y);
    return at !== null && (at === el || el.contains(at));
  };
  for (const el of [...interactive, ...texts.map((t) => t.el)]) {
    const r = el.getBoundingClientRect();
    if (top > 0 && r.top < top - 1 && r.bottom > 0 && paintedAt(el, r, Math.max(1, top - 2))) {
      out.insetIntrusions.push({ what: describe(el), box: box(r), band: "top" });
    }
    if (bottom > 0 && r.bottom > vh - bottom + 1 && r.top < vh && paintedAt(el, r, vh - bottom + 2)) {
      out.insetIntrusions.push({ what: describe(el), box: box(r), band: "bottom" });
    }
  }
  const dedupe = <T,>(list: T[]): T[] => Array.from(new Map(list.map((item) => [JSON.stringify(item), item])).values());
  out.insetIntrusions = dedupe(out.insetIntrusions);
  return out;
};
