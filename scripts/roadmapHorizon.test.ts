import { describe, expect, it } from "vitest";
import { dodLines, horizonErrors, horizonPhaseRows } from "./roadmapHorizon";

const ROADMAP = [
  "# Horizon",
  "",
  "## Phases",
  "",
  "| # | Title | Est. | Key outcome | Plan |",
  "|---|---|---|---|---|",
  "| H1 ✅ | Hotfix | ~8 h | drag | `phase-h1-plan.md` |",
  "| H10b ◑ | Re-fit | ~10 h | bands | `phase-h10b-plan.md` |",
  "| H12 | Release | ~18 h | voice | `phase-h12-plan.md` |",
  "",
  "## Standing rules",
  "| H99 ✅ | not a phase row | - | - | `phase-h99-plan.md` |",
].join("\n");

const plan = (...lines: string[]): string => ["# Plan", "", "## Definition of Done", "", ...lines, "", "## Out of scope"].join("\n");

describe("horizonPhaseRows", () => {
  it("reads every phase row of the table, its mark and its plan, and nothing outside the section", () => {
    expect(horizonPhaseRows(ROADMAP)).toEqual([
      { id: "H1", done: true, plan: "phase-h1-plan.md", line: 7 },
      { id: "H10b", done: false, plan: "phase-h10b-plan.md", line: 8 },
      { id: "H12", done: false, plan: "phase-h12-plan.md", line: 9 },
    ]);
  });
});

describe("dodLines", () => {
  it("reads the boxes under the Definition of Done", () => {
    expect(dodLines(plan("- [x] one", "- [ ] two *(Open, partly: why)*"))).toEqual([
      { text: "- [x] one", done: true },
      { text: "- [ ] two *(Open, partly: why)*", done: false },
    ]);
    expect(dodLines("# Plan without one")).toBeNull();
  });
});

describe("horizonErrors", () => {
  const rows = horizonPhaseRows(ROADMAP);

  it("fails a phase marked done over an open box and passes partial and open phases", () => {
    const plans: Record<string, string> = {
      "phase-h1-plan.md": plan("- [x] one", "- [ ] two"),
      "phase-h10b-plan.md": plan("- [x] one", "- [ ] two"),
      "phase-h12-plan.md": plan("- [ ] one"),
    };
    const errors = horizonErrors(rows, (file) => plans[file] ?? null);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("marks H1 done while 1 of its 2 DoD lines are open");
  });

  it("fails a row whose plan is missing or has no Definition of Done", () => {
    const errors = horizonErrors(rows, (file) => (file === "phase-h1-plan.md" ? "# no dod" : null));
    expect(errors).toHaveLength(3);
    expect(errors[0]).toContain("phase-h1-plan.md has no Definition of Done");
    expect(errors[1]).toContain("names phase-h10b-plan.md, which does not exist");
  });

  it("passes a done phase whose boxes are all ticked", () => {
    expect(horizonErrors(rows.slice(0, 1), () => plan("- [x] one", "- [x] two"))).toEqual([]);
  });
});
