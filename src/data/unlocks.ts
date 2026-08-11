import type { LocKey } from "@/types/content";

export type UnlockKind = "diceWave" | "contractWave" | "cosmetic" | "feature";

export type FeatureId =
  | "shipRam"
  | "shipArk"
  | "engravingStation"
  | "dailyPreview"
  | "freeRespec";

export interface UnlockSource {
  level?: number;
  achievement?: string;
  ascension?: number;
  clears?: number;
}

export const DIE_GRANT_PREFIX = "die:";

export const dieGrantId = (defId: string): string =>
  `${DIE_GRANT_PREFIX}${defId}`;

export interface UnlockDef {
  id: string;
  kind: UnlockKind;
  label: LocKey;
  source: UnlockSource;
  dice?: readonly string[];
  contracts?: readonly string[];
  cosmetic?: string;
  feature?: FeatureId;
}

export const OPEN_DICE: readonly string[] = [
  "red-d6",
  "blue-d6",
  "grey-d4",
  "green-d4",
  "yellow-d6",
  "black-d6",
  "cinder",
  "flare",
  "ember",
  "hoarfrost",
  "frostplate",
  "stillwater",
  "coil",
  "tendon",
  "lucky-chip",
  "token",
  "glint",
  "smallChange",
  "cinderblack",
  "slag",
  "pitch",
  "shim",
  "ballast",
  "plumbline",
  "spool",
  "glimmer",
  "salvo",
  "gyro",
  "sprout",
  "wager",
  "ashen",
  "copycat",
  "prismChip",
  "fate-d100",
  "slug",
  "bulwark",
  "bramble",
  "hedge",
  "tar",
  "mimic",
];

export const OPEN_CONTRACTS: readonly string[] = [
  "bareHull",
  "redHeat",
  "iceWall",
  "tightVoyage",
  "quietRun",
  "collector",
];

export const UNLOCKS: readonly UnlockDef[] = [
  {
    id: "diceL8",
    kind: "diceWave",
    label: "meta:unlock.diceL8",
    source: { level: 8 },
    dice: ["crucible", "floodgate", "taproot", "bonanza", "nadir", "pivot"],
  },
  {
    id: "diceL15",
    kind: "diceWave",
    label: "meta:unlock.diceL15",
    source: { level: 15 },
    dice: [
      "fused-emberforge",
      "fused-frostwall",
      "fused-seedling",
      "fused-goldvein",
      "fused-voidcore",
      "fused-counterweight",
    ],
  },
  {
    id: "diceL22",
    kind: "diceWave",
    label: "meta:unlock.diceL22",
    source: { level: 22 },
    dice: ["magma", "aegis", "heartwood", "vulture", "obsidian", "chaff"],
  },
  {
    id: "diceL30",
    kind: "diceWave",
    label: "meta:unlock.diceL30",
    source: { level: 30 },
    dice: ["facet", "prismCore", "spectra", "gamut", "beaconChip", "fissure"],
  },
  {
    id: "diceL38",
    kind: "diceWave",
    label: "meta:unlock.diceL38",
    source: { level: 38 },
    dice: [
      "bombard",
      "deepblue",
      "evergreen",
      "jackpot",
      "anthracite",
      "undertow",
    ],
  },
  {
    id: "diceL46",
    kind: "diceWave",
    label: "meta:unlock.diceL46",
    source: { level: 46 },
    dice: [
      "lancehead",
      "glacierspike",
      "worldseed",
      "midas",
      "voidmaw",
      "lodestar",
    ],
  },
  {
    id: "diceAchFirstClear",
    kind: "diceWave",
    label: "meta:unlock.diceAchFirstClear",
    source: { achievement: "sectorFive" },
    dice: ["coreshard", "aurora", "thermite", "abyss"],
  },
  {
    id: "diceAchPuzzler",
    kind: "diceWave",
    label: "meta:unlock.diceAchPuzzler",
    source: { achievement: "tierFive" },
    dice: ["fused-railslug", "fused-rampart", "fused-bloom", "fused-keel"],
  },
  {
    id: "diceAchCollector",
    kind: "diceWave",
    label: "meta:unlock.diceAchCollector",
    source: { achievement: "fiftyFound" },
    dice: ["fused-pyroclast", "fused-glacier", "fused-tendril"],
  },
  {
    id: "diceAchSurvivor",
    kind: "diceWave",
    label: "meta:unlock.diceAchSurvivor",
    source: { achievement: "ironStreak" },
    dice: ["eclipse", "seedpod", "fused-windfall"],
  },
  {
    id: "contractsL5",
    kind: "contractWave",
    label: "meta:unlock.contractsL5",
    source: { level: 5 },
    contracts: ["storm", "bareArmor", "blindJump"],
  },
  {
    id: "contractsL12",
    kind: "contractWave",
    label: "meta:unlock.contractsL12",
    source: { level: 12 },
    contracts: ["batteringRam", "singleCast", "deadReckoning"],
  },
  {
    id: "contractsL20",
    kind: "contractWave",
    label: "meta:unlock.contractsL20",
    source: { level: 20 },
    contracts: ["ark", "keeper", "ironTide"],
  },
  {
    id: "contractsL28",
    kind: "contractWave",
    label: "meta:unlock.contractsL28",
    source: { level: 28 },
    contracts: ["choirShadow", "prismWork", "ghostLane"],
  },
  {
    id: "contractsA5",
    kind: "contractWave",
    label: "meta:unlock.contractsA5",
    source: { ascension: 5 },
    contracts: ["voidTithe"],
  },
  {
    id: "contractsAchGauntlet",
    kind: "contractWave",
    label: "meta:unlock.contractsAchGauntlet",
    source: { achievement: "eliteHunter" },
    contracts: ["gauntlet"],
  },
  {
    id: "skinAshen",
    kind: "cosmetic",
    label: "meta:unlock.skinAshen",
    source: { ascension: 3 },
    cosmetic: "ashenSkin",
  },
  {
    id: "skinVoidglass",
    kind: "cosmetic",
    label: "meta:unlock.skinVoidglass",
    source: { ascension: 6 },
    cosmetic: "voidglassSkin",
  },
  {
    id: "skinEmberglass",
    kind: "cosmetic",
    label: "meta:unlock.skinEmberglass",
    source: { ascension: 9 },
    cosmetic: "emberglassSkin",
  },
  {
    id: "prestigeTheme",
    kind: "cosmetic",
    label: "meta:unlock.prestigeTheme",
    source: { ascension: 10 },
    cosmetic: "ascendant",
  },
  {
    id: "skinPrestige50",
    kind: "cosmetic",
    label: "meta:unlock.skinPrestige50",
    source: { level: 50 },
    cosmetic: "prestige50Skin",
  },
  {
    id: "skinChartwright",
    kind: "cosmetic",
    label: "meta:unlock.skinChartwright",
    source: { achievement: "keystoneThree" },
    cosmetic: "chartwrightSkin",
  },
  {
    id: "featureShipRam",
    kind: "feature",
    label: "meta:unlock.featureShipRam",
    source: { level: 10 },
    feature: "shipRam",
  },
  {
    id: "featureShipArk",
    kind: "feature",
    label: "meta:unlock.featureShipArk",
    source: { level: 25 },
    feature: "shipArk",
  },
  {
    id: "featureEngraving",
    kind: "feature",
    label: "meta:unlock.featureEngraving",
    source: { level: 30 },
    feature: "engravingStation",
  },
  {
    id: "featureDailyPreview",
    kind: "feature",
    label: "meta:unlock.featureDailyPreview",
    source: { level: 40 },
    feature: "dailyPreview",
  },
  {
    id: "featureFreeRespec",
    kind: "feature",
    label: "meta:unlock.featureFreeRespec",
    source: { level: 50 },
    feature: "freeRespec",
  },
];

export const UNLOCK_BY_ID: ReadonlyMap<string, UnlockDef> = new Map(
  UNLOCKS.map((def) => [def.id, def]),
);

export interface UnlockContext {
  level: number;
  achievements: readonly string[];
  ascension: number;
  clears: number;
  granted: readonly string[];
}

export const EMPTY_UNLOCK_CONTEXT: UnlockContext = {
  level: 1,
  achievements: [],
  ascension: 0,
  clears: 0,
  granted: [],
};

export const isUnlocked = (def: UnlockDef, ctx: UnlockContext): boolean => {
  const { source } = def;
  if (source.level !== undefined && ctx.level >= source.level) return true;
  if (
    source.achievement !== undefined &&
    ctx.achievements.includes(source.achievement)
  ) {
    return true;
  }
  if (source.ascension !== undefined && ctx.ascension >= source.ascension) {
    return true;
  }
  if (source.clears !== undefined && ctx.clears >= source.clears) return true;
  return ctx.granted.includes(def.id);
};

export const resolveUnlocks = (ctx: UnlockContext): Set<string> => {
  const out = new Set<string>();
  for (const def of UNLOCKS) {
    if (isUnlocked(def, ctx)) out.add(def.id);
  }
  return out;
};

export const unlockedDice = (ctx: UnlockContext): Set<string> => {
  const out = new Set<string>(OPEN_DICE);
  for (const def of UNLOCKS) {
    if (def.dice === undefined || !isUnlocked(def, ctx)) continue;
    for (const id of def.dice) out.add(id);
  }
  for (const id of ctx.granted) {
    if (id.startsWith(DIE_GRANT_PREFIX)) out.add(id.slice(DIE_GRANT_PREFIX.length));
  }
  return out;
};

export const unlockedContracts = (ctx: UnlockContext): Set<string> => {
  const out = new Set<string>(OPEN_CONTRACTS);
  for (const def of UNLOCKS) {
    if (def.contracts === undefined || !isUnlocked(def, ctx)) continue;
    for (const id of def.contracts) out.add(id);
  }
  return out;
};

export const unlockedCosmetics = (ctx: UnlockContext): Set<string> => {
  const out = new Set<string>();
  for (const def of UNLOCKS) {
    if (def.cosmetic === undefined || !isUnlocked(def, ctx)) continue;
    out.add(def.cosmetic);
  }
  return out;
};

export const hasFeature = (ctx: UnlockContext, feature: FeatureId): boolean =>
  UNLOCKS.some((def) => def.feature === feature && isUnlocked(def, ctx));

export interface UnlockHint {
  kind: "level" | "achievement" | "ascension" | "clears" | "drop";
  value: number;
  achievement?: string;
}

const hintFor = (def: UnlockDef): UnlockHint => {
  if (def.source.level !== undefined)
    return { kind: "level", value: def.source.level };
  if (def.source.achievement !== undefined)
    return {
      kind: "achievement",
      value: 0,
      achievement: def.source.achievement,
    };
  if (def.source.ascension !== undefined)
    return { kind: "ascension", value: def.source.ascension };
  if (def.source.clears !== undefined)
    return { kind: "clears", value: def.source.clears };
  return { kind: "drop", value: 0 };
};

export const dieUnlockHints = (defId: string): UnlockHint[] => {
  if (OPEN_DICE.includes(defId)) return [];
  const hints = UNLOCKS.filter((def) => def.dice?.includes(defId) === true).map(
    hintFor,
  );
  return hints.length > 0 ? hints : [{ kind: "drop", value: 0 }];
};

export const contractUnlockHints = (id: string): UnlockHint[] => {
  if (OPEN_CONTRACTS.includes(id)) return [];
  return UNLOCKS.filter((def) => def.contracts?.includes(id) === true).map(
    hintFor,
  );
};

export const cosmeticUnlockHints = (id: string): UnlockHint[] =>
  UNLOCKS.filter((def) => def.cosmetic === id).map(hintFor);
