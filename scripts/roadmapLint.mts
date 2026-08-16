import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const DIR = join(process.cwd(), "docs", "rework");
const ROADMAP = join(DIR, "ROADMAP.md");
const TABLE_HEADING = "## Content targets";
const DOD_HEADING = "## Definition of Done";

// A count small enough to collide with prose ("3-4 steps", "1 hidden ending") is
// not quoted back; those rows are held to naming the content only. Everything at
// or above this is a headline number a Definition of Done can carry verbatim.
const QUOTABLE_COUNT = 10;

const errors: string[] = [];

interface TargetRow {
  content: string;
  target: string;
  owner: string;
  line: number;
}

const sectionAfter = (text: string, heading: string): string => {
  const start = text.indexOf(heading);
  if (start < 0) return "";
  const rest = text.slice(start + heading.length);
  const end = rest.indexOf("\n## ");
  return end < 0 ? rest : rest.slice(0, end);
};

const cellsOf = (row: string): string[] =>
  row
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());

const parseTable = (): TargetRow[] => {
  const text = readFileSync(ROADMAP, "utf8");
  const section = sectionAfter(text, TABLE_HEADING);
  if (section === "") {
    errors.push(`ROADMAP.md has no "${TABLE_HEADING}" section`);
    return [];
  }
  const offset = text.slice(0, text.indexOf(TABLE_HEADING)).split("\n").length;
  const rows: TargetRow[] = [];
  section.split("\n").forEach((raw, index) => {
    if (!raw.trim().startsWith("|")) return;
    const cells = cellsOf(raw);
    if (cells.length < 5) return;
    const [content, , target, owner] = cells;
    if (content === undefined || target === undefined || owner === undefined) {
      return;
    }
    if (content === "Content" || content.startsWith("---")) return;
    rows.push({ content, target, owner, line: offset + index });
  });
  return rows;
};

const dodOf = (phase: string): string | null => {
  const file = `phase-${phase.toLowerCase()}-plan.md`;
  const available = readdirSync(DIR);
  if (!available.includes(file)) return null;
  const section = sectionAfter(readFileSync(join(DIR, file), "utf8"), DOD_HEADING);
  return section === "" ? null : section;
};

// The content name in the table is a label, not a token: "Run perks" has to find
// "perks", "NPC chains" has to find "chains", "Chart nodes" has to find "chart".
const keywordsOf = (content: string): string[] => {
  const words = content
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && w !== "npc" && w !== "nodes" && w !== "lines" && w !== "items");
  return words.length > 0 ? words.map((w) => w.replace(/s$/, "")) : [content.toLowerCase()];
};

const quotableCounts = (target: string): string[] =>
  [...target.matchAll(/\d+/g)]
    .map((m) => m[0])
    .filter((n) => Number(n) >= QUOTABLE_COUNT);

// A bare number match is worthless: "≥60% conditional" would satisfy "60 modules"
// and "55–65% winrate" would satisfy "55 enemies". The count has to stand alone.
const quotesCount = (line: string, count: string): boolean =>
  new RegExp(`(?<![\\d.,])${count}(?![\\d.,]|\\s*%|\\s*[–—-]\\s*\\d)`).test(line);

const rows = parseTable();
if (rows.length === 0) errors.push("content-target table parsed as empty");

const report: string[] = [];
for (const row of rows) {
  const dod = dodOf(row.owner);
  if (dod === null) {
    errors.push(
      `ROADMAP.md:${String(row.line)} "${row.content}" names owner ${row.owner}, which has no plan with a Definition of Done`,
    );
    continue;
  }
  const keywords = keywordsOf(row.content);
  const counts = quotableCounts(row.target);
  const named = dod
    .split("\n")
    .filter((line) => line.trim().startsWith("- ["))
    .filter((line) => keywords.some((k) => line.toLowerCase().includes(k)));

  if (named.length === 0) {
    errors.push(
      `ROADMAP.md:${String(row.line)} "${row.content}" is owned by ${row.owner}, but no line of its Definition of Done mentions it`,
    );
    continue;
  }
  if (counts.length === 0) {
    report.push(`  ${row.content.padEnd(14)} ${row.owner}  named (no quotable count)`);
    continue;
  }
  const quoting = named.find((line) => counts.some((n) => quotesCount(line, n)));
  if (quoting === undefined) {
    errors.push(
      `ROADMAP.md:${String(row.line)} "${row.content}" is owned by ${row.owner}, whose Definition of Done mentions it but never quotes its target (${counts.join(" or ")}) — a count no DoD carries is a count no phase is accountable for`,
    );
    continue;
  }
  const done = quoting.trim().startsWith("- [x]");
  report.push(
    `  ${row.content.padEnd(14)} ${row.owner}  ${counts.join("/")}  ${done ? "claimed" : "claimed, OPEN"}`,
  );
}

if (errors.length > 0) {
  for (const error of errors) console.error(`lint:roadmap: ${error}`);
  process.exit(1);
}

console.log("lint:roadmap: every Revision-3 content target is owned by a phase DoD");
for (const line of report) console.log(line);
