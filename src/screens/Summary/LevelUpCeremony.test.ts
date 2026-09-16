import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const CEREMONY_CSS = readFileSync(
  join(process.cwd(), "src", "screens", "Summary", "LevelUpCeremony.module.css"),
  "utf8",
);

const SCREEN_CSS = readFileSync(
  join(process.cwd(), "src", "app", "Screen.module.css"),
  "utf8",
);

const RULE = /([^{}]+)\{([^{}]*)\}/g;

interface Rule {
  selector: string;
  body: string;
}

const rulesOf = (css: string): Rule[] =>
  [...css.matchAll(RULE)].map((match) => ({
    selector: (match[1] ?? "").trim().replace(/\s+/g, " "),
    body: match[2] ?? "",
  }));

const bodyOf = (css: string, selector: string): string =>
  rulesOf(css).find((rule) => rule.selector === selector)?.body ?? "";

const valueOf = (body: string, property: string): string | null => {
  const match = new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`).exec(body);
  return match === null ? null : (match[1] ?? "").trim();
};

const selectorsDeclaring = (css: string, declaration: RegExp): string[] =>
  rulesOf(css)
    .filter((rule) => declaration.test(rule.body))
    .map((rule) => rule.selector);

const UNREACHABLE_BLOCK_ALIGNMENTS = [
  "center",
  "space-around",
  "space-evenly",
];

describe("level-up ceremony overlay", () => {
  it("sits inside a screen that clips, so it owns the only scroll", () => {
    expect(valueOf(bodyOf(SCREEN_CSS, ".screen"), "overflow")).toBe("hidden");
    expect(valueOf(bodyOf(CEREMONY_CSS, ".overlay"), "position")).toBe(
      "absolute",
    );
    expect(valueOf(bodyOf(CEREMONY_CSS, ".overlay"), "overflow-y")).toBe("auto");
  });

  it("never parks the continue button above the scroll origin", () => {
    const justify = valueOf(
      bodyOf(CEREMONY_CSS, ".overlay"),
      "justify-content",
    );
    expect(justify).not.toBeNull();
    expect(UNREACHABLE_BLOCK_ALIGNMENTS).not.toContain(justify);
  });

  it("centres a short ceremony with auto margins instead of centred overflow", () => {
    const starts = selectorsDeclaring(
      CEREMONY_CSS,
      /margin-block-start:\s*auto/,
    );
    const ends = selectorsDeclaring(CEREMONY_CSS, /margin-block-end:\s*auto/);
    expect(starts.join(" ")).toContain(".overlay");
    expect(ends.join(" ")).toContain(".overlay");
    expect(starts.join(" ")).toContain(":first-child");
    expect(ends.join(" ")).toContain(":last-child");
  });
});
