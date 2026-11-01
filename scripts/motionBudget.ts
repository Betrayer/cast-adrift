const MOTION_LAYOUT_PROPERTY =
  /^(?:top|left|right|bottom|inset(?:-[a-z]+)*|width|height|block-size|inline-size|(?:min|max)-[a-z]+(?:-[a-z]+)*|margin(?:-[a-z]+)*|padding(?:-[a-z]+)*|letter-spacing)$/;
const MOTION_TRANSITION_DECLARATION = /^(?:-webkit-)?transition(?:-property)?$/;
const KEYFRAMES_PRELUDE = /^@(?:-webkit-)?keyframes\s+(\S+)/;

export interface CssDeclaration {
  property: string;
  value: string;
  line: number;
  keyframes: string | null;
}

export const cssDeclarations = (source: string): CssDeclaration[] => {
  const css = source.replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "));
  const lineStarts = [0];
  for (let i = 0; i < css.length; i += 1) if (css[i] === "\n") lineStarts.push(i + 1);
  const lineAt = (offset: number): number => {
    let line = 0;
    while (line + 1 < lineStarts.length && (lineStarts[line + 1] ?? 0) <= offset) line += 1;
    return line + 1;
  };
  const out: CssDeclaration[] = [];
  const preludes: string[] = [];
  let start = 0;
  let quote: string | null = null;
  let parens = 0;
  const flush = (end: number): void => {
    const chunk = css.slice(start, end);
    const colon = chunk.indexOf(":");
    if (colon < 0 || preludes.length === 0) return;
    const keyframes = preludes
      .map((prelude) => KEYFRAMES_PRELUDE.exec(prelude)?.[1] ?? null)
      .find((name) => name !== null);
    out.push({
      property: chunk.slice(0, colon).trim().toLowerCase(),
      value: chunk.slice(colon + 1).trim(),
      line: lineAt(start + chunk.length - chunk.trimStart().length),
      keyframes: keyframes ?? null,
    });
  };
  for (let i = 0; i < css.length; i += 1) {
    const ch = css[i];
    if (quote !== null) {
      if (ch === quote && css[i - 1] !== "\\") quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === "(") parens += 1;
    else if (ch === ")") parens = Math.max(0, parens - 1);
    if (parens > 0) continue;
    if (ch === "{") {
      preludes.push(css.slice(start, i).trim());
      start = i + 1;
    } else if (ch === ";") {
      flush(i);
      start = i + 1;
    } else if (ch === "}") {
      flush(i);
      preludes.pop();
      start = i + 1;
    }
  }
  return out;
};

const withoutParens = (value: string): string => {
  let flat = value;
  for (;;) {
    const next = flat.replace(/\([^()]*\)/g, "");
    if (next === flat) return flat;
    flat = next;
  }
};

const TRANSITION_TIME = /^[+-]?(?:\d+\.?\d*|\.\d+)m?s$/;
const TRANSITION_NON_PROPERTY = new Set([
  "ease",
  "ease-in",
  "ease-out",
  "ease-in-out",
  "linear",
  "step-start",
  "step-end",
  "steps",
  "cubic-bezier",
  "var",
  "calc",
  "env",
  "min",
  "max",
  "clamp",
  "normal",
  "allow-discrete",
]);
const IMPLICIT_ALL = "implicit all";

const shorthandTokens = (item: string): string[] => {
  const tokens = item.split(/\s+/).filter((token) => token !== "");
  const lone = tokens.length === 1 ? tokens[0] : undefined;
  if (tokens.length === 0 || lone === "none" || lone === "var") return tokens;
  const namesProperty = tokens.some(
    (token) => !TRANSITION_TIME.test(token) && !TRANSITION_NON_PROPERTY.has(token),
  );
  return namesProperty ? tokens : [IMPLICIT_ALL];
};

const transitionedLayout = (declaration: CssDeclaration): string[] => {
  const items = withoutParens(declaration.value).toLowerCase().split(",");
  const tokens =
    declaration.property.endsWith("transition-property")
      ? items.map((item) => item.trim())
      : items.flatMap((item) => shorthandTokens(item.trim()));
  return tokens.filter(
    (token) => token === "all" || token === IMPLICIT_ALL || MOTION_LAYOUT_PROPERTY.test(token),
  );
};

const transitionedLayoutMessage = (token: string): string =>
  token === "all"
    ? '"all", which includes every layout property'
    : token === IMPLICIT_ALL
      ? 'an item that names no property, which means "all" and includes every layout property'
      : `the layout property "${token}"`;

export const motionBudgetErrors = (path: string, source: string): string[] => {
  const errors: string[] = [];
  for (const declaration of cssDeclarations(source)) {
    if (declaration.property.startsWith("--")) continue;
    if (declaration.keyframes !== null) {
      if (MOTION_LAYOUT_PROPERTY.test(declaration.property))
        errors.push(
          `motion: ${path}:${String(declaration.line)} animates the layout property "${declaration.property}" in @keyframes ${declaration.keyframes} (MOTION_LAYOUT_PROPERTY); move it with transform, opacity or a paint property`,
        );
      continue;
    }
    if (!MOTION_TRANSITION_DECLARATION.test(declaration.property)) continue;
    for (const token of transitionedLayout(declaration)) {
      errors.push(
        `motion: ${path}:${String(declaration.line)} transitions ${transitionedLayoutMessage(token)} (MOTION_LAYOUT_PROPERTY); list transform, opacity or a paint property instead`,
      );
    }
  }
  return errors;
};
