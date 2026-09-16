import type { LocKey } from "@/types/content";

export type UnlockKind = "diceWave" | "contractWave" | "cosmetic" | "feature";

export type FeatureId =
  | "shipRam"
  | "shipArk"
  | "shipCorsair"
  | "shipFoundry"
  | "shipPrism"
  | "engravingStation"
  | "dailyPreview"
  | "freeRespec"
  | "sectorSix";

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

const unlock = (
  id: string,
  body: Omit<UnlockDef, "id" | "label">,
): UnlockDef => ({
  id,
  label: `meta:unlock.${id}`,
  ...body,
});

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
  unlock("diceL8", {
    kind: "diceWave",
    source: { level: 8 },
    dice: ["crucible", "floodgate", "taproot", "bonanza", "nadir", "pivot"],
  }),
  unlock("diceL15", {
    kind: "diceWave",
    source: { level: 15 },
    dice: [
      "fused-emberforge",
      "fused-frostwall",
      "fused-seedling",
      "fused-goldvein",
      "fused-voidcore",
      "fused-counterweight",
    ],
  }),
  unlock("diceL22", {
    kind: "diceWave",
    source: { level: 22 },
    dice: ["magma", "aegis", "heartwood", "vulture", "obsidian", "chaff"],
  }),
  unlock("diceL30", {
    kind: "diceWave",
    source: { level: 30 },
    dice: ["facet", "prismCore", "spectra", "gamut", "beaconChip", "fissure"],
  }),
  unlock("diceL38", {
    kind: "diceWave",
    source: { level: 38 },
    dice: [
      "bombard",
      "deepblue",
      "evergreen",
      "jackpot",
      "anthracite",
      "undertow",
    ],
  }),
  unlock("diceL46", {
    kind: "diceWave",
    source: { level: 46 },
    dice: [
      "lancehead",
      "glacierspike",
      "worldseed",
      "midas",
      "voidmaw",
      "lodestar",
    ],
  }),
  unlock("diceAchFirstClear", {
    kind: "diceWave",
    source: { achievement: "sectorFive" },
    dice: ["coreshard", "aurora", "thermite", "abyss"],
  }),
  unlock("diceAchPuzzler", {
    kind: "diceWave",
    source: { achievement: "tierFive-1" },
    dice: ["fused-railslug", "fused-rampart", "fused-bloom", "fused-keel"],
  }),
  unlock("diceAchCollector", {
    kind: "diceWave",
    source: { achievement: "fiftyFound-2" },
    dice: ["fused-pyroclast", "fused-glacier", "fused-tendril"],
  }),
  unlock("diceAchSurvivor", {
    kind: "diceWave",
    source: { achievement: "deathless-2" },
    dice: ["eclipse", "seedpod", "fused-windfall"],
  }),
  unlock("contractsL5", {
    kind: "contractWave",
    source: { level: 5 },
    contracts: ["storm", "bareArmor", "blindJump"],
  }),
  unlock("contractsL12", {
    kind: "contractWave",
    source: { level: 12 },
    contracts: ["batteringRam", "singleCast", "deadReckoning"],
  }),
  unlock("contractsL20", {
    kind: "contractWave",
    source: { level: 20 },
    contracts: ["ark", "keeper", "ironTide"],
  }),
  unlock("contractsL28", {
    kind: "contractWave",
    source: { level: 28 },
    contracts: ["choirShadow", "prismWork", "ghostLane"],
  }),
  unlock("contractsA5", {
    kind: "contractWave",
    source: { ascension: 5 },
    contracts: ["voidTithe"],
  }),
  unlock("contractsAchGauntlet", {
    kind: "contractWave",
    source: { achievement: "eliteHunt-2" },
    contracts: ["gauntlet"],
  }),
  unlock("skinAshen", {
    kind: "cosmetic",
    source: { ascension: 3 },
    cosmetic: "ashenSkin",
  }),
  unlock("skinVoidglass", {
    kind: "cosmetic",
    source: { ascension: 6 },
    cosmetic: "voidglassSkin",
  }),
  unlock("skinEmberglass", {
    kind: "cosmetic",
    source: { ascension: 9 },
    cosmetic: "emberglassSkin",
  }),
  unlock("prestigeTheme", {
    kind: "cosmetic",
    source: { ascension: 10 },
    cosmetic: "ascendant",
  }),
  unlock("skinPrestige50", {
    kind: "cosmetic",
    source: { level: 50 },
    cosmetic: "prestige50Skin",
  }),
  unlock("skinChartwright", {
    kind: "cosmetic",
    source: { achievement: "keystoneThree" },
    cosmetic: "chartwrightSkin",
  }),
  unlock("featureShipRam", {
    kind: "feature",
    source: { level: 10 },
    feature: "shipRam",
  }),
  unlock("featureShipArk", {
    kind: "feature",
    source: { level: 25 },
    feature: "shipArk",
  }),
  unlock("featureShipCorsair", {
    kind: "feature",
    source: { level: 35 },
    feature: "shipCorsair",
  }),
  unlock("featureShipFoundry", {
    kind: "feature",
    source: { level: 40 },
    feature: "shipFoundry",
  }),
  unlock("featureShipPrism", {
    kind: "feature",
    source: { achievement: "spectrumClear" },
    feature: "shipPrism",
  }),
  unlock("featureEngraving", {
    kind: "feature",
    source: { level: 30 },
    feature: "engravingStation",
  }),
  unlock("featureDailyPreview", {
    kind: "feature",
    source: { level: 40 },
    feature: "dailyPreview",
  }),
  unlock("featureFreeRespec", {
    kind: "feature",
    source: { level: 50 },
    feature: "freeRespec",
  }),
  {
    id: "s6-threshold",
    kind: "feature",
    label: "meta:unlock.sectorSix",
    source: { clears: 1 },
    feature: "sectorSix",
  },
  unlock("diceS6", {
    kind: "diceWave",
    source: { achievement: "beyondTheCore" },
    dice: ["retrograde", "hushlight", "foldline", "answerchip"],
  }),
  unlock("skinThreshold", {
    kind: "cosmetic",
    source: { achievement: "theAnswer" },
    cosmetic: "thresholdSkin",
  }),
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
