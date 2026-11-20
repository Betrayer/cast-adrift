import { readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { describe, expect, it } from "vitest";

const SOURCE = readFileSync(join(process.cwd(), "scripts", "layoutSheet.mts"), "utf8");

describe("layoutSheet server lifecycle", () => {
  it("launches the browser inside the try whose finally stops the server", () => {
    expect(SOURCE).toMatch(
      /const server = await startServer\(\);\s*const shots: Shot\[\] = \[\];\s*try \{\s*const browser = await chromium\.launch\(\);\s*try \{/,
    );
    expect(SOURCE).toMatch(
      /\} finally \{\s*await browser\.close\(\);\s*\}\s*\} finally \{\s*if \(server !== null\) stopServer\(server\);\s*\}/,
    );
  });

  it("stops the whole process tree when the server never comes up", () => {
    expect(SOURCE).toMatch(/stopServer\(child\);\s*throw new Error\("layoutSheet: the e2e server did not come up on 4173"\);/);
    expect(SOURCE.match(/\.kill\(\)/g)?.length).toBe(1);
  });

  it("takes its exit code from the verdict", () => {
    expect(SOURCE).toMatch(
      /const verdict = layoutVerdict\(shots, merged\.length, OUT\);\s*console\.log\(verdict\.line\);\s*if \(verdict\.exitCode !== 0\) process\.exitCode = verdict\.exitCode;/,
    );
  });
});
