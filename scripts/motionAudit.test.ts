import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { motionAudit } from "./motionAudit";

const roots: string[] = [];

const audit = (source: string): { kind: string; tag: string; line: number }[] => {
  const root = mkdtempSync(join(tmpdir(), "motion-audit-"));
  roots.push(root);
  mkdirSync(join(root, "src", "screens"), { recursive: true });
  writeFileSync(join(root, "src", "screens", "Fixture.tsx"), source, "utf8");
  return motionAudit(root).map((finding) => ({ kind: finding.kind, tag: finding.tag, line: finding.line }));
};

afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

describe("motionAudit list scan", () => {
  it("reads past a guard that returns null", () => {
    const source = [
      "export const A = () => (",
      "  <Stack data-rise>",
      "    {ids.map((id) => {",
      "      const def = BY_ID.get(id);",
      "      if (def === undefined) return null;",
      "      return (",
      "        <Paper key={id} p=\"sm\">",
      "          {def.name}",
      "        </Paper>",
      "      );",
      "    })}",
      "  </Stack>",
      ");",
      "",
    ].join("\n");
    expect(audit(source)).toEqual([{ kind: "list", tag: "Paper", line: 7 }]);
  });

  it("checks every JSX return of a block body", () => {
    const source = [
      "export const A = () => (",
      "  <Stack data-rise>",
      "    {defs.map((def) => {",
      "      if (def.locked) return <Paper key={def.id} data-locked />;",
      "      return <Box key={def.id} data-open />;",
      "    })}",
      "  </Stack>",
      ");",
      "",
    ].join("\n");
    expect(audit(source)).toEqual([
      { kind: "list", tag: "Paper", line: 4 },
      { kind: "list", tag: "Box", line: 5 },
    ]);
  });

  it("ignores a map that passes a named function", () => {
    const source = [
      "export const A = () => {",
      "  const lines = rows.map(rowLine);",
      "  const copy = (): void => {",
      "    write(lines);",
      "  };",
      "  return (",
      "    <Paper p=\"xs\" onCopy={copy}>",
      "      {lines.join(\"\\n\")}",
      "    </Paper>",
      "  );",
      "};",
      "",
    ].join("\n");
    expect(audit(source)).toEqual([]);
  });

  it("skips returns inside a nested arrow body and marked items", () => {
    const source = [
      "export const A = () => (",
      "  <Stack data-rise>",
      "    {ids.map((id, index) => {",
      "      const render = () => {",
      "        return <Box key={id} />;",
      "      };",
      "      if (id === \"\") return null;",
      "      return <Paper key={id} data-rise style={riseStyle(index)}>{render()}</Paper>;",
      "    })}",
      "  </Stack>",
      ");",
      "",
    ].join("\n");
    expect(audit(source)).toEqual([]);
  });

  it("reports a nested block map once, from its own call", () => {
    const source = [
      "export const A = () => (",
      "  <Stack data-rise>",
      "    {groups.map((group) => {",
      "      return (",
      "        <Stack key={group.id}>",
      "          {group.items.map((item) => {",
      "            if (item === \"\") return null;",
      "            return <Paper key={item} />;",
      "          })}",
      "        </Stack>",
      "      );",
      "    })}",
      "  </Stack>",
      ");",
      "",
    ].join("\n");
    expect(audit(source)).toEqual([
      { kind: "list", tag: "Stack", line: 5 },
      { kind: "list", tag: "Paper", line: 8 },
    ]);
  });

  it("finds a clickable element only by a top-level onClick", () => {
    const source = [
      "export const A = () => (",
      "  <Stack>",
      "    <div className=\"x\" onClick={go} />",
      "    <Button onClick={go} />",
      "    <Box data-press onClick={go} />",
      "    <Box render={{ onClick: go }} label=\"onClick={go}\" />",
      "  </Stack>",
      ");",
      "",
    ].join("\n");
    expect(audit(source)).toEqual([{ kind: "pressable", tag: "div", line: 3 }]);
  });
});
