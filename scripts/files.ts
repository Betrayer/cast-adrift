import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export const filesUnder = (dir: string, keep: (path: string) => boolean): string[] => {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...filesUnder(path, keep));
    else if (keep(path)) out.push(path);
  }
  return out;
};
