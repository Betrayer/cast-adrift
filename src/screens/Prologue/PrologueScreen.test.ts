import { describe, expect, it } from "vitest";
import {
  TYPEWRITER_CAP_MS,
  TYPEWRITER_MS_PER_CHAR,
  typewriterMs,
} from "@/components/Typewriter";
import { PROLOGUE_LINE_GAP_MS, prologueLineDelays } from "./PrologueScreen";

describe("typewriter timing", () => {
  it("types at most 40 ms a character", () => {
    expect(TYPEWRITER_MS_PER_CHAR).toBeLessThanOrEqual(40);
    expect(typewriterMs("abcde")).toBe(5 * TYPEWRITER_MS_PER_CHAR);
  });

  it("caps the whole line at 1.2 s however long it is", () => {
    expect(TYPEWRITER_CAP_MS).toBe(1200);
    expect(typewriterMs("x".repeat(400))).toBe(TYPEWRITER_CAP_MS);
  });

  it("counts characters, not UTF-16 units", () => {
    expect(typewriterMs("\u{1F680}a")).toBe(2 * TYPEWRITER_MS_PER_CHAR);
  });

  it("takes no time for an empty line", () => {
    expect(typewriterMs("")).toBe(0);
  });
});

describe("prologue line chaining", () => {
  it("starts each line after the one above it has typed", () => {
    const lines = ["short", "x".repeat(200), "last"];
    const delays = prologueLineDelays(lines);
    expect(delays[0]).toBe(0);
    expect(delays[1]).toBe(typewriterMs("short") + PROLOGUE_LINE_GAP_MS);
    expect(delays[2]).toBe(
      typewriterMs("short") + TYPEWRITER_CAP_MS + PROLOGUE_LINE_GAP_MS * 2,
    );
  });
});
