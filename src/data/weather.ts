import type { MutatorMods } from "@/data/mutators";
import type { SectorId } from "@/data/sectors";
import type { LocKey } from "@/types/content";

export type WeatherId =
  | "nebula"
  | "ionStorm"
  | "debrisField"
  | "solarWind"
  | "magneticStorm"
  | "radioBurst"
  | "gravityRipple"
  | "stillWatch";

export interface WeatherDef {
  id: WeatherId;
  name: LocKey;
  desc: LocKey;
  line: LocKey;
  tint: string;
  mods: Partial<MutatorMods>;
}

const weatherDef = (
  id: WeatherId,
  body: Omit<WeatherDef, "id" | "name" | "desc" | "line">,
): WeatherDef => ({
  id,
  name: `content:weather.${id}.name`,
  desc: `content:weather.${id}.desc`,
  line: `content:weather.${id}.line`,
  ...body,
});

export const WEATHER: readonly WeatherDef[] = [
  weatherDef("nebula", {
    tint: "var(--ca-school-green-stroke)",
    mods: { fogRowDelta: -1, scrapMultPct: 20 },
  }),
  weatherDef("ionStorm", {
    tint: "var(--ca-school-blue-stroke)",
    mods: { fogRowDelta: -1, nudgeCostDelta: -1 },
  }),
  weatherDef("debrisField", {
    tint: "var(--ca-school-grey-stroke)",
    mods: { scrapMultPct: 40, enemyHpPct: 5 },
  }),
  weatherDef("solarWind", {
    tint: "var(--ca-amber)",
    mods: { chargeCapDelta: 2, nudgeCostDelta: 1 },
  }),
  weatherDef("magneticStorm", {
    tint: "var(--ca-school-black-stroke)",
    mods: { nudgeCostDelta: 1, lootRarityStep: 1 },
  }),
  weatherDef("radioBurst", {
    tint: "var(--ca-accent)",
    mods: { fogRowDelta: 1, scrapMultPct: -20 },
  }),
  weatherDef("gravityRipple", {
    tint: "var(--ca-school-prismatic-stroke)",
    mods: { enemyHpPct: -5, nudgeCostDelta: 2 },
  }),
  weatherDef("stillWatch", {
    tint: "var(--ca-dim)",
    mods: { chargeCapDelta: 1, scrapMultPct: 15 },
  }),
];

export const WEATHER_BY_ID: ReadonlyMap<string, WeatherDef> = new Map(
  WEATHER.map((def) => [def.id, def]),
);

export interface WeatherWeight {
  id: WeatherId;
  weight: number;
}

export const WEATHER_CHANCE_PCT = 60;

export const WEATHER_POOLS: Readonly<
  Record<SectorId, readonly WeatherWeight[]>
> = {
  1: [],
  2: [
    { id: "debrisField", weight: 4 },
    { id: "nebula", weight: 3 },
    { id: "stillWatch", weight: 3 },
    { id: "radioBurst", weight: 2 },
    { id: "ionStorm", weight: 1 },
    { id: "solarWind", weight: 1 },
  ],
  3: [
    { id: "gravityRipple", weight: 4 },
    { id: "ionStorm", weight: 3 },
    { id: "nebula", weight: 3 },
    { id: "debrisField", weight: 2 },
    { id: "magneticStorm", weight: 2 },
    { id: "stillWatch", weight: 2 },
  ],
  4: [
    { id: "radioBurst", weight: 4 },
    { id: "magneticStorm", weight: 3 },
    { id: "nebula", weight: 2 },
    { id: "solarWind", weight: 2 },
    { id: "stillWatch", weight: 2 },
    { id: "ionStorm", weight: 1 },
  ],
  5: [
    { id: "solarWind", weight: 4 },
    { id: "ionStorm", weight: 3 },
    { id: "debrisField", weight: 2 },
    { id: "gravityRipple", weight: 2 },
    { id: "magneticStorm", weight: 2 },
    { id: "stillWatch", weight: 1 },
  ],
  6: [
    { id: "gravityRipple", weight: 4 },
    { id: "magneticStorm", weight: 3 },
    { id: "ionStorm", weight: 2 },
    { id: "radioBurst", weight: 2 },
    { id: "stillWatch", weight: 2 },
    { id: "nebula", weight: 1 },
  ],
};

const POOL_SECTORS: readonly SectorId[] = [1, 2, 3, 4, 5, 6];

export const weatherPoolFor = (sector: number): readonly WeatherWeight[] => {
  const id = POOL_SECTORS.find((value) => value === sector);
  return id === undefined ? [] : WEATHER_POOLS[id];
};
