import { describe, expect, it } from "vitest";
import { cssDeclarations, motionBudgetErrors } from "./motionBudget";

const P = "src/x.module.css";

describe("cssDeclarations", () => {
  it("follows nested blocks and names the keyframes a declaration sits in", () => {
    const css =
      "@media (min-width: 600px) {\n  .a {\n    transition: transform 200ms ease;\n  }\n}\n@keyframes grow {\n  from { width: 0; }\n  to { width: 10px; }\n}\n";
    expect(cssDeclarations(css)).toEqual([
      { property: "transition", value: "transform 200ms ease", line: 3, keyframes: null },
      { property: "width", value: "0", line: 7, keyframes: "grow" },
      { property: "width", value: "10px", line: 8, keyframes: "grow" },
    ]);
  });

  it("keeps a semicolon inside url(data:…) in the value", () => {
    const css = ".a {\n  background: url(data:image/svg+xml;utf8,<svg></svg>);\n  transition: opacity 120ms;\n}\n";
    expect(cssDeclarations(css)).toEqual([
      { property: "background", value: "url(data:image/svg+xml;utf8,<svg></svg>)", line: 2, keyframes: null },
      { property: "transition", value: "opacity 120ms", line: 3, keyframes: null },
    ]);
  });

  it("drops comments but keeps the line count", () => {
    const css = "/* a; b */\n.a {\n  /* width: 3px; */\n  transition: opacity 1s;\n}\n";
    expect(cssDeclarations(css)).toEqual([
      { property: "transition", value: "opacity 1s", line: 4, keyframes: null },
    ]);
  });

  it("keeps a semicolon inside a string in the value", () => {
    const css = ".a::after { content: \"x; y\"; transition: left 1s; }\n";
    expect(cssDeclarations(css)).toEqual([
      { property: "content", value: "\"x; y\"", line: 1, keyframes: null },
      { property: "transition", value: "left 1s", line: 1, keyframes: null },
    ]);
  });
});

describe("motionBudgetErrors", () => {
  it("reads past the commas of a cubic-bezier to the layout item", () => {
    expect(
      motionBudgetErrors(P, ".a { transition: transform 200ms cubic-bezier(0.2, 0, 0, 1), height 100ms; }\n"),
    ).toEqual([
      "motion: src/x.module.css:1 transitions the layout property \"height\" (MOTION_LAYOUT_PROPERTY); list transform, opacity or a paint property instead",
    ]);
  });

  it("fails a layout property animated in keyframes", () => {
    expect(motionBudgetErrors(P, "@keyframes grow {\n  to { width: 10px; }\n}\n")).toEqual([
      "motion: src/x.module.css:2 animates the layout property \"width\" in @keyframes grow (MOTION_LAYOUT_PROPERTY); move it with transform, opacity or a paint property",
    ]);
  });

  it("reads a transition that names no property as all", () => {
    const errors = motionBudgetErrors(P, ".a { transition: 200ms ease; }\n");
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("an item that names no property");
  });

  it("fails an explicit all", () => {
    const errors = motionBudgetErrors(P, ".a { transition: all 1s; }\n");
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("\"all\", which includes every layout property");
  });

  it("checks every item of transition-property", () => {
    const errors = motionBudgetErrors(P, ".a { transition-property: opacity, margin-top; }\n");
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("the layout property \"margin-top\"");
  });

  it("passes none, a variable, a custom property and inherit", () => {
    expect(
      motionBudgetErrors(P, ".a { transition: none; transition: var(--x); --t: width 1s; transition: inherit; }\n"),
    ).toEqual([]);
  });

  it("passes a static layout property and paint transitions", () => {
    expect(motionBudgetErrors(P, ".a { width: 10px; transition: opacity 1s, box-shadow 1s; }\n")).toEqual([]);
  });
});
