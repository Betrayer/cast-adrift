import { MOTION_MS, REDUCED_MS } from "../src/app/motion";

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

interface ScopedDeclaration extends CssDeclaration {
  preludes: readonly string[];
}

const scopedDeclarations = (source: string): ScopedDeclaration[] => {
  const css = source.replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "));
  const lineStarts = [0];
  for (let i = 0; i < css.length; i += 1) if (css[i] === "\n") lineStarts.push(i + 1);
  const lineAt = (offset: number): number => {
    let line = 0;
    while (line + 1 < lineStarts.length && (lineStarts[line + 1] ?? 0) <= offset) line += 1;
    return line + 1;
  };
  const out: ScopedDeclaration[] = [];
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
      preludes: [...preludes],
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

export const cssDeclarations = (source: string): CssDeclaration[] =>
  scopedDeclarations(source).map(({ property, value, line, keyframes }) => ({ property, value, line, keyframes }));

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

const REDUCED_SCOPE = /data-ca-motion=['"]?reduced['"]?/;
const DURATION_PROPERTY = /^(?:-webkit-)?(animation|transition)(-duration)?$/;
const PLAIN_TIME = /^([+-]?(?:\d+\.?\d*|\.\d+))(m?s)$/;
const VARIABLE = /^var\(\s*(--[\w-]+)\s*(?:,[\s\S]*)?\)$/;
const COMPUTED_TIME = /^(?:calc|min|max|clamp)\(/;
const EASING_VARIABLE = /^--ca-ease/;

const MOTION_TOKEN_MS: Readonly<Record<string, number>> = {
  ...Object.fromEntries(Object.entries(MOTION_MS).map(([step, ms]) => [`--ca-motion-${step}`, ms])),
  "--ca-motion-reduced": REDUCED_MS,
};

const splitTop = (value: string, separator: string): string[] => {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of value) {
    if (ch === "(") depth += 1;
    else if (ch === ")") depth = Math.max(0, depth - 1);
    if (depth === 0 && (separator === " " ? /\s/.test(ch) : ch === separator)) {
      if (current.trim() !== "") parts.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim() !== "") parts.push(current.trim());
  return parts;
};

const timeOf = (token: string): number | "unknown" | null => {
  const plain = PLAIN_TIME.exec(token);
  if (plain !== null) return Number(plain[1]) * (plain[2] === "s" ? 1000 : 1);
  if (COMPUTED_TIME.test(token)) return "unknown";
  const name = VARIABLE.exec(token)?.[1];
  if (name === undefined || EASING_VARIABLE.test(name)) return null;
  return MOTION_TOKEN_MS[name] ?? "unknown";
};

const reducedDurations = (property: string, value: string): (number | "unknown")[] => {
  const kind = DURATION_PROPERTY.exec(property);
  if (kind === null) return [];
  const items = splitTop(value.replace(/!important\s*$/i, ""), ",");
  if (kind[2] !== undefined) return items.map((item) => timeOf(item) ?? "unknown");
  return items.flatMap((item) => {
    const time = splitTop(item, " ").map(timeOf).find((each) => each !== null);
    return time === undefined ? [] : [time];
  });
};

export const motionBudgetErrors = (path: string, source: string): string[] => {
  const errors: string[] = [];
  for (const declaration of scopedDeclarations(source)) {
    if (declaration.keyframes === null && declaration.preludes.some((prelude) => REDUCED_SCOPE.test(prelude))) {
      for (const duration of reducedDurations(declaration.property, declaration.value)) {
        if (duration === "unknown")
          errors.push(
            `motion: ${path}:${String(declaration.line)} sets a reduced-motion duration the budget cannot read (${declaration.value}); use var(--ca-motion-reduced), a time, or none`,
          );
        else if (duration > REDUCED_MS)
          errors.push(
            `motion: ${path}:${String(declaration.line)} runs ${String(duration)} ms under reduced motion, over REDUCED_MS ${String(REDUCED_MS)}; use var(--ca-motion-reduced) or none`,
          );
      }
    }
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
