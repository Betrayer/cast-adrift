import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ROUTES, fixedBackTarget } from "@/app/routes";
import type { ScreenId } from "@/types";

const NAMESPACES = ["battle", "common", "content", "menu", "meta", "run", "settings"] as const;

const bundles = new Map<string, unknown>(
  NAMESPACES.map((ns) => [
    ns,
    JSON.parse(readFileSync(join("src", "i18n", "en", `${ns}.json`), "utf8")) as unknown,
  ]),
);

const hasKey = (key: string): boolean => {
  const [ns, path] = key.split(":");
  if (ns === undefined || path === undefined) return false;
  let node: unknown = bundles.get(ns);
  for (const segment of path.split(".")) {
    if (typeof node !== "object" || node === null) return false;
    node = (node as Record<string, unknown>)[segment];
  }
  return typeof node === "string";
};

const screenFiles = (): string[] => {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) walk(path);
      else if (path.endsWith(".tsx")) out.push(path);
    }
  };
  walk(join("src", "screens"));
  return out;
};

const ids = Object.keys(ROUTES) as ScreenId[];

describe("route metadata", () => {
  it("gives every stack-back route a title the header can print", () => {
    for (const id of ids) {
      if (ROUTES[id].backMode !== "stack") continue;
      expect(ROUTES[id].title, id).toBeDefined();
    }
  });

  it("only names title keys the source language actually carries", () => {
    for (const id of ids) {
      const key = ROUTES[id].title;
      if (key === undefined) continue;
      expect(hasKey(key), `${id} -> ${key}`).toBe(true);
    }
  });

  it("points every fixed-back route at a real screen", () => {
    for (const id of ids) {
      const target = fixedBackTarget(ROUTES[id].backMode);
      if (target === null) continue;
      expect(Object.hasOwn(ROUTES, target), `${id} -> ${target}`).toBe(true);
      expect(target).not.toBe(id);
    }
  });
});

describe("header ownership", () => {
  it("leaves the back label to AppHeader alone", () => {
    const offenders = screenFiles().filter((file) =>
      readFileSync(file, "utf8").includes("common:back"),
    );
    expect(offenders).toEqual([]);
  });
});
