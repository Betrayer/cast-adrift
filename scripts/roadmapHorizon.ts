export interface PhaseRow {
  id: string;
  done: boolean;
  plan: string;
  line: number;
}

export interface DodLine {
  text: string;
  done: boolean;
}

const PHASES_HEADING = "## Phases";
const DOD_HEADING = "## Definition of Done";
const DONE_MARK = "✅";

const cellsOf = (row: string): string[] =>
  row
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());

const sectionLines = (text: string, heading: string): { lines: string[]; offset: number } => {
  const all = text.split(/\r?\n/);
  const start = all.findIndex((line) => line.trim() === heading || line.startsWith(`${heading} `));
  if (start < 0) return { lines: [], offset: 0 };
  const rest = all.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith("## "));
  return { lines: end < 0 ? rest : rest.slice(0, end), offset: start + 2 };
};

export const horizonPhaseRows = (roadmap: string): PhaseRow[] => {
  const { lines, offset } = sectionLines(roadmap, PHASES_HEADING);
  const rows: PhaseRow[] = [];
  lines.forEach((raw, index) => {
    if (!raw.trim().startsWith("|")) return;
    const cells = cellsOf(raw);
    const first = cells[0] ?? "";
    const plan = (cells[cells.length - 1] ?? "").replace(/`/g, "");
    const id = first.split(/\s+/)[0] ?? "";
    if (!/^H\d+[a-z]?$/.test(id) || !plan.endsWith(".md")) return;
    rows.push({ id, done: first.includes(DONE_MARK), plan, line: offset + index });
  });
  return rows;
};

export const dodLines = (plan: string): DodLine[] | null => {
  const { lines } = sectionLines(plan, DOD_HEADING);
  if (lines.length === 0) return null;
  return lines
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- ["))
    .map((line) => ({ text: line, done: line.startsWith("- [x]") }));
};

export const horizonErrors = (rows: readonly PhaseRow[], readPlan: (file: string) => string | null): string[] => {
  const errors: string[] = [];
  for (const row of rows) {
    const plan = readPlan(row.plan);
    if (plan === null) {
      errors.push(`docs/horizon/ROADMAP.md:${String(row.line)} ${row.id} names ${row.plan}, which does not exist`);
      continue;
    }
    const dod = dodLines(plan);
    if (dod === null || dod.length === 0) {
      errors.push(`docs/horizon/${row.plan} has no Definition of Done for ${row.id}`);
      continue;
    }
    const open = dod.filter((line) => !line.done);
    if (row.done && open.length > 0) {
      errors.push(
        `docs/horizon/ROADMAP.md:${String(row.line)} marks ${row.id} done while ${String(open.length)} of its ${String(dod.length)} DoD lines are open; tick them or mark the phase partial and carry the line in waiting-for-owner.md: ${open.map((line) => line.text.slice(0, 60)).join(" | ")}`,
      );
    }
  }
  return errors;
};
