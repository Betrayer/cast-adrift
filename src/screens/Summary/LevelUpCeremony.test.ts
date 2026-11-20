import { describe, expect, it } from "vitest";
import { bodyOf, selectorsDeclaring, valueOf } from "@/app/cssRules";
import { readSource } from "@/app/sourceFiles";

const CEREMONY_CSS = readSource("screens", "Summary", "LevelUpCeremony.module.css");

const SCREEN_CSS = readSource("app", "Screen.module.css");

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
