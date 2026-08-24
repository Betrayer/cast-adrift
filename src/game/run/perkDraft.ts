import { shapeKey } from "@/data/contentShape";
import { DIE_BY_ID } from "@/data/dice";
import type { EngravingMap } from "@/data/engravings";
import { ALL_PERKS, PERK_BY_ID } from "@/data/perks";
import type { PerkDef, PerkRarity } from "@/data/perks/types";
import { SHIP_BY_ID, type ShipId } from "@/data/ships";
import type { ContentTag } from "@/data/tags";
import { loadoutCensus, type TagCensus } from "@/game/effects/census";
import type { RngStream } from "@/services/rng";

export const DRAFT_WEIGHTS: Record<PerkRarity, number> = {
  common: 55,
  uncommon: 35,
  rare: 10,
};

export const PERK_DRAFT_SIZE = 3;
export const SKIP_SCRAP_BASE = 10;
export const SKIP_SCRAP_PER_SECTOR = 5;
export const DRAFT_REROLL_COST = 15;
export const PITY_DRAFTS = 6;
export const COMMON_FLOOR_SECTOR = 4;
export const COMMON_FLOOR_MULT = 0.5;

const RARITY_RANK: Record<PerkRarity, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
};

const RARITIES: readonly PerkRarity[] = ["common", "uncommon", "rare"];

const SCHOOL_AFFINITY_PER_DIE = 0.25;
const TAG_AFFINITY_PER_POINT = 0.12;
const TAG_AFFINITY_CAP = 4;
const LAYOUT_AFFINITY = 1.25;
const OWNED_SHAPE_PENALTY = 0.35;

export interface DraftContext {
  owned: readonly string[];
  banished: readonly string[];
  sector: number;
  deckDefIds: readonly string[];
  modules: readonly string[];
  shipId: ShipId;
  engravings?: EngravingMap;
  floor?: PerkRarity;
  draftsSinceRare?: number;
}

export const skipScrapFor = (sector: number): number =>
  SKIP_SCRAP_BASE + SKIP_SCRAP_PER_SECTOR * Math.max(0, sector);

const bannedShapes = (banished: readonly string[]): ReadonlySet<string> =>
  new Set(
    banished
      .map((id) => PERK_BY_ID.get(id))
      .filter((def): def is PerkDef => def !== undefined)
      .map(shapeKey),
  );

const deckSchoolCount = (
  deckDefIds: readonly string[],
  school: string,
): number =>
  deckDefIds.filter((defId) => {
    const def = DIE_BY_ID.get(defId);
    return def?.school === school || def?.school === "prismatic";
  }).length;

const OVERSIZED_REACTOR_CAP = 12;

const layoutTags = (shipId: ShipId): ReadonlySet<ContentTag> => {
  const slots = SHIP_BY_ID.get(shipId)?.slots ?? {};
  const tags = new Set<ContentTag>();
  if (slots.spinal !== undefined) {
    tags.add("spike");
    tags.add("spinal");
  }
  if (slots.shieldsB !== undefined) {
    tags.add("shieldwall");
    tags.add("shields");
  }
  if (slots.enginesB !== undefined) {
    tags.add("dodge");
    tags.add("engines");
  }
  if (slots.repairBay !== undefined) tags.add("repairBay");
  if (slots.shields === undefined) tags.add("survival");
  if ((slots.reactor?.cap ?? 0) >= OVERSIZED_REACTOR_CAP) tags.add("charge");
  return tags;
};

const poolAffinity = (def: PerkDef, ctx: DraftContext): number => {
  if (def.pool === "systems") return 1;
  return 1 + SCHOOL_AFFINITY_PER_DIE * deckSchoolCount(ctx.deckDefIds, def.pool);
};

const tagAffinity = (def: PerkDef, census: TagCensus): number => {
  const owned = (def.tags ?? []).reduce(
    (sum, tag) => sum + Math.min(census[tag] ?? 0, TAG_AFFINITY_CAP),
    0,
  );
  return 1 + TAG_AFFINITY_PER_POINT * owned;
};

const layoutAffinity = (
  def: PerkDef,
  wanted: ReadonlySet<ContentTag>,
): number =>
  (def.tags ?? []).some((tag) => wanted.has(tag)) ? LAYOUT_AFFINITY : 1;

const noveltyGuard = (
  def: PerkDef,
  ownedShapes: ReadonlySet<string>,
): number => (ownedShapes.has(shapeKey(def)) ? OWNED_SHAPE_PENALTY : 1);

export const perkDraftWeight = (
  def: PerkDef,
  ctx: DraftContext,
  census: TagCensus,
  ownedShapes: ReadonlySet<string>,
  wantedTags: ReadonlySet<ContentTag>,
): number =>
  poolAffinity(def, ctx) *
  tagAffinity(def, census) *
  layoutAffinity(def, wantedTags) *
  noveltyGuard(def, ownedShapes);

const rarityWeights = (
  ctx: DraftContext,
  minRank: number,
): readonly (readonly [PerkRarity, number])[] =>
  RARITIES.filter((r) => RARITY_RANK[r] >= minRank).map((r) => {
    const base = DRAFT_WEIGHTS[r];
    const scaled =
      r === "common" && ctx.sector >= COMMON_FLOOR_SECTOR
        ? base * COMMON_FLOOR_MULT
        : base;
    return [r, scaled] as const;
  });

export const rollPerkChoices = (
  rng: RngStream,
  ctx: DraftContext,
): string[] => {
  const minRank = RARITY_RANK[ctx.floor ?? "common"];
  const taken = new Set(ctx.owned);
  const banned = new Set(ctx.banished);
  const bannedShapeSet = bannedShapes(ctx.banished);
  const available = ALL_PERKS.filter(
    (def) =>
      !taken.has(def.id) &&
      !banned.has(def.id) &&
      !bannedShapeSet.has(shapeKey(def)) &&
      RARITY_RANK[def.rarity] >= minRank,
  );
  if (available.length === 0) return [];

  const census = loadoutCensus({
    deckDefIds: ctx.deckDefIds,
    perks: ctx.owned,
    modules: ctx.modules,
    ...(ctx.engravings === undefined ? {} : { engravings: ctx.engravings }),
  });
  const ownedShapes = new Set(
    ctx.owned
      .map((id) => PERK_BY_ID.get(id))
      .filter((def): def is PerkDef => def !== undefined)
      .map(shapeKey),
  );
  const wantedTags = layoutTags(ctx.shipId);
  const weights = rarityWeights(ctx, minRank);

  const chosen: PerkDef[] = [];
  const pityDue =
    (ctx.draftsSinceRare ?? 0) + 1 >= PITY_DRAFTS &&
    available.some((def) => def.rarity === "rare");

  for (let i = 0; i < PERK_DRAFT_SIZE; i += 1) {
    const chosenIds = new Set(chosen.map((def) => def.id));
    const chosenShapes = new Set(chosen.map(shapeKey));
    const remaining = available.filter((def) => !chosenIds.has(def.id));
    if (remaining.length === 0) break;
    const forceRare = pityDue && !chosen.some((def) => def.rarity === "rare");
    const rarity = forceRare ? "rare" : rng.weighted(weights);
    const sameRarity = remaining.filter((def) => def.rarity === rarity);
    const tier = sameRarity.length > 0 ? sameRarity : remaining;
    const fresh = tier.filter((def) => !chosenShapes.has(shapeKey(def)));
    const pool = fresh.length > 0 ? fresh : tier;
    chosen.push(
      rng.weighted(
        pool.map(
          (def) =>
            [
              def,
              perkDraftWeight(def, ctx, census, ownedShapes, wantedTags),
            ] as const,
        ),
      ),
    );
  }

  return chosen.map((def) => def.id);
};
