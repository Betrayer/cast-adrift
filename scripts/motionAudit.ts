import { readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { filesUnder } from "./files";

export interface MotionFinding {
  kind: "list" | "pressable";
  file: string;
  line: number;
  tag: string;
  key: string;
}

const ROOTS = [join("src", "screens"), join("src", "components")];

const INLINE_TAGS = new Set([
  "span",
  "Text",
  "Badge",
  "option",
  "path",
  "circle",
  "g",
  "line",
  "rect",
  "text",
  "tspan",
  "polygon",
  "polyline",
  "ellipse",
  "stop",
  "use",
  "defs",
  "Fragment",
  "Tooltip",
  "Kbd",
  "Code",
  "br",
  "strong",
  "em",
  "b",
  "i",
  "img",
  "canvas",
  "Title",
  "ThemeIcon",
  "Progress",
  "Divider",
  "Loader",
  "Skeleton",
  "ColorSwatch",
  "Image",
  "TagChips",
  "DieGlyph",
  "SchoolDot",
]);

const BUTTONISH = new Set([
  "Button",
  "ActionIcon",
  "UnstyledButton",
  "button",
  "a",
  "Anchor",
  "Chip",
  "Checkbox",
  "Switch",
  "Radio",
  "SegmentedControl",
  "CloseButton",
  "Menu.Item",
  "Tabs.Tab",
  "NavLink",
  "Burger",
  "input",
  "select",
  "textarea",
]);

const scanCode = (text: string, from: number, limit: number, found: (at: number) => boolean): number => {
  let quote: string | null = null;
  for (let i = from; i < limit; i += 1) {
    const ch = text[i];
    if (quote !== null) {
      if (ch === quote && text[i - 1] !== "\\") quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      continue;
    }
    if (found(i)) return i;
  }
  return -1;
};

const scanTopLevel = (text: string, from: number, limit: number, found: (at: number) => boolean): number => {
  let depth = 0;
  return scanCode(text, from, limit, (i) => {
    const ch = text[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") depth -= 1;
    else return depth === 0 && found(i);
    return false;
  });
};

const closingBrace = (text: string, open: number): number => {
  let depth = 0;
  return scanCode(text, open, text.length, (i) => {
    if (text[i] === "{") depth += 1;
    else if (text[i] === "}") depth -= 1;
    return depth === 0;
  });
};

const openingTag = (source: string, at: number): { tag: string; text: string } | null => {
  if (source[at] !== "<") return null;
  const name = /^<([A-Za-z][\w.]*)/.exec(source.slice(at, at + 64));
  if (name === null) return null;
  const end = scanTopLevel(source, at + 1, Math.min(source.length, at + 4000), (i) => source[i] === ">");
  return end < 0 ? null : { tag: name[1] ?? "", text: source.slice(at, end + 1) };
};

const skipSpace = (source: string, at: number): number => {
  let i = at;
  while (i < source.length && /[\s(]/.test(source[i] ?? "")) i += 1;
  return i;
};

const lineOf = (source: string, at: number): number =>
  source.slice(0, at).split("\n").length;

const keyOf = (file: string, text: string): string =>
  `${file}::${text.replace(/\s+/g, " ").slice(0, 96)}`;

const RISE_MARK = /data-rise|riseStyle\(|riseIndex=|rise=/;

const MAP_CALL = ".map(";

const RETURN = "return";

const callOwnsArrow = (source: string, from: number, arrow: number): boolean => {
  let depth = 0;
  return (
    scanCode(source, from, arrow, (i) => {
      if (source[i] === "(") depth += 1;
      else if (source[i] === ")") depth -= 1;
      return depth < 0;
    }) < 0
  );
};

const blockReturns = (source: string, open: number, close: number): number[] => {
  const out: number[] = [];
  let resumeAt = open + 1;
  scanCode(source, open + 1, close, (i) => {
    if (i < resumeAt) return false;
    if (source[i] === "{" && /=>\s*$/.test(source.slice(Math.max(open, i - 64), i))) {
      resumeAt = closingBrace(source, i) + 1;
      return false;
    }
    if (
      source.startsWith(RETURN, i) &&
      !/[\w$.]/.test(source[i - 1] ?? "") &&
      !/[\w$]/.test(source[i + RETURN.length] ?? "")
    ) {
      out.push(i);
    }
    return false;
  });
  return out;
};

const listFindings = (file: string, source: string): MotionFinding[] => {
  const out: MotionFinding[] = [];
  const seen = new Set<number>();
  const inspect = (at: number): void => {
    if (seen.has(at)) return;
    seen.add(at);
    const tag = openingTag(source, at);
    if (tag === null) return;
    if (INLINE_TAGS.has(tag.tag) || tag.tag.startsWith("Mantine")) return;
    if (RISE_MARK.test(tag.text)) return;
    out.push({
      kind: "list",
      file,
      line: lineOf(source, at),
      tag: tag.tag,
      key: keyOf(file, tag.text),
    });
  };
  for (const match of source.matchAll(/\.map\(/g)) {
    const start = match.index;
    const arrow = source.indexOf("=>", start);
    if (arrow < 0 || arrow - start > 160) continue;
    if (!callOwnsArrow(source, start + MAP_CALL.length, arrow)) continue;
    let at = arrow + 2;
    while (at < source.length && /\s/.test(source[at] ?? "")) at += 1;
    if (source[at] === "(") {
      let inner = at + 1;
      while (inner < source.length && /\s/.test(source[inner] ?? "")) inner += 1;
      if (source[inner] === "{") continue;
    }
    at = skipSpace(source, at);
    if (source[at] !== "{") {
      inspect(at);
      continue;
    }
    const close = closingBrace(source, at);
    if (close < 0) continue;
    for (const ret of blockReturns(source, at, close)) inspect(skipSpace(source, ret + RETURN.length));
  }
  return out;
};

const topLevelOnClick = (tagText: string): boolean =>
  scanTopLevel(tagText, 0, tagText.length, (i) => tagText.startsWith("onClick=", i) && /\s/.test(tagText[i - 1] ?? "")) >= 0;

const pressableFindings = (file: string, source: string): MotionFinding[] => {
  const out: MotionFinding[] = [];
  for (const match of source.matchAll(/<([A-Za-z][\w.]*)\b/g)) {
    const tag = openingTag(source, match.index);
    if (tag === null) continue;
    if (!topLevelOnClick(tag.text)) continue;
    if (BUTTONISH.has(tag.tag)) continue;
    if (/data-press/.test(tag.text)) continue;
    out.push({
      kind: "pressable",
      file,
      line: lineOf(source, match.index),
      tag: tag.tag,
      key: keyOf(file, tag.text),
    });
  }
  return out;
};

export const motionAudit = (root: string): MotionFinding[] => {
  const files = ROOTS.flatMap((dir) => filesUnder(join(root, dir), (path) => path.endsWith(".tsx")));
  const findings: MotionFinding[] = [];
  for (const path of files) {
    const file = relative(root, path).split(sep).join("/");
    const source = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
    findings.push(...listFindings(file, source), ...pressableFindings(file, source));
  }
  return findings;
};

export const MOTION_ALLOW_PATH = join("scripts", "motionAudit.allow.json");

export const readMotionAllow = (root: string): Record<string, string> =>
  JSON.parse(readFileSync(join(root, MOTION_ALLOW_PATH), "utf8")) as Record<
    string,
    string
  >;

export const unallowedMotionFindings = (root: string): {
  open: MotionFinding[];
  stale: string[];
  allowed: number;
} => {
  const allow = readMotionAllow(root);
  const findings = motionAudit(root);
  const keys = new Set(findings.map((finding) => finding.key));
  const open = findings.filter((finding) => allow[finding.key] === undefined);
  return {
    open,
    stale: Object.keys(allow).filter((key) => !keys.has(key)),
    allowed: findings.length - open.length,
  };
};

const isMain = process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  const root = process.cwd();
  const { open, stale, allowed } = unallowedMotionFindings(root);
  for (const finding of open) {
    console.log(`${finding.kind.padEnd(9)} ${finding.file}:${String(finding.line)} <${finding.tag}>`);
    console.log(`          ${finding.key}`);
  }
  for (const key of stale) console.log(`stale     ${key}`);
  console.log(
    `motion:audit — ${String(open.length)} open · ${String(allowed)} allowlisted · ${String(stale.length)} stale`,
  );
  if (open.length > 0 || stale.length > 0) process.exit(1);
}
