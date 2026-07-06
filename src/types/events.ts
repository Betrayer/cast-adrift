import type { MkLevel } from "@/data/slots";
import type { SlotId } from "@/types/battle";
import type { DieTier, LocKey, Rarity, School } from "@/types/content";

export type FlagValue = number | true;

export interface FlagQuery {
  all?: readonly string[];
  any?: readonly string[];
  not?: readonly string[];
}

export interface EventRequires {
  sector?: readonly number[];
  resonance?: readonly [number, number];
  flags?: FlagQuery;
}

export type SpeakerId =
  | "mara"
  | "yusuf"
  | "choirPreacher"
  | "beaconKeeper"
  | "bountyHuntress"
  | "warden";

export type EventKind = "event" | "anomaly" | "beacon";

export type OptionRequirement =
  | { req: "scrap"; n: number }
  | { req: "hull"; n: number }
  | { req: "school"; school: School; n: number }
  | { req: "dieTier"; tier: DieTier }
  | { req: "dieSchool"; school: School }
  | { req: "mk"; slot: SlotId; mk: MkLevel }
  | { req: "flag"; key: string };

export type CheckPick = "sum" | "highest";

export interface CheckDef {
  dice: number;
  pick: CheckPick;
  target: number;
}

export type BattleModKind = "startCharge" | "enemyPlus";
export type NodeModKind =
  | "revealRows"
  | "shipyardDiscount"
  | "endHeal"
  | "rerollSize";

export type EventEffect =
  | { k: "scrap"; n: number }
  | { k: "hull"; n: number }
  | { k: "hullMax"; n: number }
  | { k: "tide"; n: number }
  | { k: "axis"; n: number }
  | { k: "flag"; key: string; value?: FlagValue }
  | { k: "loot"; die?: string; rarity?: Rarity }
  | { k: "swapLowestDie" }
  | { k: "battleMod"; mod: BattleModKind; n?: number; battles?: number }
  | { k: "nodeMod"; mod: NodeModKind; n?: number };

export interface ForcedBattle {
  enemyIds: readonly string[];
  scrap?: number;
  loot?: { die?: string; rarity?: Rarity };
  setFlags?: readonly (readonly [string, FlagValue])[];
  clearFlags?: readonly string[];
}

export interface Outcome {
  text: LocKey;
  weight?: number;
  effects: readonly EventEffect[];
  consequence?: LocKey;
  codex?: string;
  follow?: ForcedBattle;
}

export interface EventOption {
  id: string;
  label: LocKey;
  requires?: OptionRequirement;
  check?: CheckDef;
  outcomes?: readonly Outcome[];
  onPass?: readonly Outcome[];
  onFail?: readonly Outcome[];
}

export interface EventDef {
  id: string;
  kind?: EventKind;
  weight: number;
  speaker?: SpeakerId;
  requires?: EventRequires;
  text: LocKey;
  codex?: string;
  options: readonly EventOption[];
}
