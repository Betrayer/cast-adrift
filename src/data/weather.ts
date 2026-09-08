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
  mods: Partial<MutatorMods>;
}

export const WEATHER: readonly WeatherDef[] = [
  {
    id: "nebula",
    name: "content:weather.nebula.name",
    desc: "content:weather.nebula.desc",
    line: "content:weather.nebula.line",
    mods: { fogRowDelta: -1, scrapMultPct: 20 },
  },
  {
    id: "ionStorm",
    name: "content:weather.ionStorm.name",
    desc: "content:weather.ionStorm.desc",
    line: "content:weather.ionStorm.line",
    mods: { fogRowDelta: -1, nudgeCostDelta: -1 },
  },
  {
    id: "debrisField",
    name: "content:weather.debrisField.name",
    desc: "content:weather.debrisField.desc",
    line: "content:weather.debrisField.line",
    mods: { scrapMultPct: 40, enemyHpPct: 5 },
  },
  {
    id: "solarWind",
    name: "content:weather.solarWind.name",
    desc: "content:weather.solarWind.desc",
    line: "content:weather.solarWind.line",
    mods: { chargeCapDelta: 2, nudgeCostDelta: 1 },
  },
  {
    id: "magneticStorm",
    name: "content:weather.magneticStorm.name",
    desc: "content:weather.magneticStorm.desc",
    line: "content:weather.magneticStorm.line",
    mods: { nudgeCostDelta: 1, lootRarityStep: 1 },
  },
  {
    id: "radioBurst",
    name: "content:weather.radioBurst.name",
    desc: "content:weather.radioBurst.desc",
    line: "content:weather.radioBurst.line",
    mods: { fogRowDelta: 1, scrapMultPct: -20 },
  },
  {
    id: "gravityRipple",
    name: "content:weather.gravityRipple.name",
    desc: "content:weather.gravityRipple.desc",
    line: "content:weather.gravityRipple.line",
    mods: { enemyHpPct: -5, nudgeCostDelta: 2 },
  },
  {
    id: "stillWatch",
    name: "content:weather.stillWatch.name",
    desc: "content:weather.stillWatch.desc",
    line: "content:weather.stillWatch.line",
    mods: { chargeCapDelta: 1, scrapMultPct: 15 },
  },
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
