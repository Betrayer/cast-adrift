import type { MkLevel } from "@/data/slots";
import type { SlotId } from "@/types/battle";
import type { Intent, LocKey } from "@/types/content";

export type PuzzleGoal =
  | { g: "damage"; min: number }
  | { g: "charge"; min: number }
  | { g: "shield"; min: number }
  | { g: "survive" };

export interface PuzzleReward {
  scrap: number;
  die?: string;
  codex?: string;
}

export interface PuzzleDef {
  id: string;
  title: LocKey;
  goalText: LocKey;
  deck: readonly string[];
  slots: readonly SlotId[];
  blocked?: readonly SlotId[];
  mk?: Partial<Record<SlotId, MkLevel>>;
  rerolls: number;
  rerollSize?: number;
  locks: number;
  hull?: number;
  incoming?: Intent;
  goal: PuzzleGoal;
  reward: PuzzleReward;
}

const reward = (): PuzzleReward => ({ scrap: 20, codex: "riddleWard" });

export const PUZZLES: readonly PuzzleDef[] = [
  {
    id: "redline",
    title: "content:puzzle.redline.title",
    goalText: "content:puzzle.redline.goal",
    deck: ["slug", "ember", "yellow-d6", "grey-d4"],
    slots: ["weaponA", "weaponB"],
    rerolls: 2,
    locks: 1,
    goal: { g: "damage", min: 18 },
    reward: reward(),
  },
  {
    id: "sensorLance",
    title: "content:puzzle.sensorLance.title",
    goalText: "content:puzzle.sensorLance.goal",
    deck: ["grey-d4", "ember", "red-d6", "yellow-d6"],
    slots: ["sensors", "weaponA", "weaponB"],
    rerolls: 2,
    locks: 1,
    goal: { g: "damage", min: 17 },
    reward: reward(),
  },
  {
    id: "spinalDrive",
    title: "content:puzzle.spinalDrive.title",
    goalText: "content:puzzle.spinalDrive.goal",
    deck: ["coreshard", "red-d6", "grey-d4"],
    slots: ["spinal", "weaponA"],
    rerolls: 2,
    locks: 1,
    goal: { g: "damage", min: 16 },
    reward: reward(),
  },
  {
    id: "reactorBank",
    title: "content:puzzle.reactorBank.title",
    goalText: "content:puzzle.reactorBank.goal",
    deck: ["obsidian", "black-d6", "grey-d4"],
    slots: ["reactor"],
    rerolls: 3,
    locks: 1,
    goal: { g: "charge", min: 12 },
    reward: reward(),
  },
  {
    id: "coldEngine",
    title: "content:puzzle.coldEngine.title",
    goalText: "content:puzzle.coldEngine.goal",
    deck: ["coreshard", "black-d6", "grey-d4"],
    slots: ["reactor"],
    mk: { reactor: 3 },
    rerolls: 2,
    locks: 1,
    goal: { g: "charge", min: 12 },
    reward: reward(),
  },
  {
    id: "aegis",
    title: "content:puzzle.aegis.title",
    goalText: "content:puzzle.aegis.goal",
    deck: ["bulwark", "frostplate", "grey-d4"],
    slots: ["shields"],
    rerolls: 2,
    locks: 1,
    goal: { g: "shield", min: 10 },
    reward: reward(),
  },
  {
    id: "wall",
    title: "content:puzzle.wall.title",
    goalText: "content:puzzle.wall.goal",
    deck: ["frostplate", "blue-d6", "grey-d4"],
    slots: ["shields", "engines"],
    hull: 3,
    incoming: { t: "multi", n: 4, k: 2 },
    rerolls: 2,
    locks: 1,
    goal: { g: "survive" },
    reward: reward(),
  },
  {
    id: "slipstream",
    title: "content:puzzle.slipstream.title",
    goalText: "content:puzzle.slipstream.goal",
    deck: ["green-d4", "grey-d4", "blue-d6"],
    slots: ["engines", "shields"],
    hull: 2,
    incoming: { t: "attack", n: 8 },
    rerolls: 1,
    locks: 1,
    goal: { g: "survive" },
    reward: reward(),
  },
  {
    id: "mixedFire",
    title: "content:puzzle.mixedFire.title",
    goalText: "content:puzzle.mixedFire.goal",
    deck: ["slug", "ember", "red-d6", "coreshard", "grey-d4"],
    slots: ["sensors", "weaponA", "weaponB", "spinal"],
    rerolls: 2,
    locks: 2,
    goal: { g: "damage", min: 30 },
    reward: reward(),
  },
  {
    id: "obsidianGamble",
    title: "content:puzzle.obsidianGamble.title",
    goalText: "content:puzzle.obsidianGamble.goal",
    deck: ["obsidian", "obsidian", "grey-d4"],
    slots: ["weaponA", "weaponB"],
    rerolls: 3,
    locks: 1,
    goal: { g: "damage", min: 16 },
    reward: reward(),
  },
  {
    id: "burnLance",
    title: "content:puzzle.burnLance.title",
    goalText: "content:puzzle.burnLance.goal",
    deck: ["cinder", "ember", "red-d6"],
    slots: ["weaponA", "weaponB"],
    rerolls: 2,
    locks: 1,
    goal: { g: "damage", min: 16 },
    reward: reward(),
  },
  {
    id: "bracewall",
    title: "content:puzzle.bracewall.title",
    goalText: "content:puzzle.bracewall.goal",
    deck: ["frostplate", "blue-d6", "green-d4", "grey-d4"],
    slots: ["shields", "engines"],
    hull: 3,
    incoming: { t: "multi", n: 3, k: 3 },
    rerolls: 2,
    locks: 1,
    goal: { g: "survive" },
    reward: reward(),
  },
];

export const PUZZLE_BY_ID: ReadonlyMap<string, PuzzleDef> = new Map(
  PUZZLES.map((p) => [p.id, p]),
);
