import type { LocKey } from "@/types/content";

export type BridgeFrameChoice = "hull" | "obsidian";

export interface BridgeFrameDef {
  id: BridgeFrameChoice;
  name: LocKey;
  desc: LocKey;
  cosmetic?: string;
}

export const DEFAULT_BRIDGE_FRAME: BridgeFrameChoice = "hull";

export const BRIDGE_FRAMES: readonly BridgeFrameDef[] = [
  { id: "hull", name: "meta:frame.hull.name", desc: "meta:frame.hull.desc" },
  {
    id: "obsidian",
    name: "meta:frame.obsidian.name",
    desc: "meta:frame.obsidian.desc",
    cosmetic: "obsidianFrame",
  },
];

export const isBridgeFrameChoice = (value: unknown): value is BridgeFrameChoice =>
  BRIDGE_FRAMES.some((def) => def.id === value);
