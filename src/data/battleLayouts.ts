import type { BattleLayoutId } from "@/types";
import type { LocKey } from "@/types/content";

export interface BattleLayoutDef {
  id: BattleLayoutId;
  name: LocKey;
  tag: LocKey;
  desc: LocKey;
}

export const DEFAULT_BATTLE_LAYOUT: BattleLayoutId = "console";

export const BATTLE_LAYOUTS: readonly BattleLayoutDef[] = [
  {
    id: "console",
    name: "settings:layout.console.name",
    tag: "settings:layout.console.tag",
    desc: "settings:layout.console.desc",
  },
  {
    id: "orbit",
    name: "settings:layout.orbit.name",
    tag: "settings:layout.orbit.tag",
    desc: "settings:layout.orbit.desc",
  },
  {
    id: "tablet",
    name: "settings:layout.tablet.name",
    tag: "settings:layout.tablet.tag",
    desc: "settings:layout.tablet.desc",
  },
];

export const BATTLE_LAYOUT_IDS: readonly BattleLayoutId[] = BATTLE_LAYOUTS.map(
  (def) => def.id,
);

export const isBattleLayoutId = (value: unknown): value is BattleLayoutId =>
  typeof value === "string" &&
  BATTLE_LAYOUT_IDS.includes(value as BattleLayoutId);
