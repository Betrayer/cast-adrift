import { MUTATOR_BY_ID } from "@/data/mutators";
import {
  WEATHER_BY_ID,
  WEATHER_CHANCE_PCT,
  weatherPoolFor,
  type WeatherDef,
  type WeatherId,
} from "@/data/weather";
import { createStream, deriveSeed } from "@/services/rng";
import type { LocKey } from "@/types/content";

export const FIRST_WEATHER_SECTOR_INDEX = 2;

export const isWeatherId = (id: string): boolean => WEATHER_BY_ID.has(id);

export const weatherIn = (
  mutators: readonly string[],
): WeatherDef | null => {
  for (const id of mutators) {
    const def = WEATHER_BY_ID.get(id);
    if (def !== undefined) return def;
  }
  return null;
};

export const withoutWeather = (mutators: readonly string[]): string[] =>
  mutators.filter((id) => !isWeatherId(id));

export const rollWeather = (
  seed: number,
  sectorIndex: number,
  sector: number,
): WeatherId | null => {
  if (sectorIndex < FIRST_WEATHER_SECTOR_INDEX) return null;
  const pool = weatherPoolFor(sector);
  if (pool.length === 0) return null;
  const stream = createStream(
    deriveSeed(seed, `weather:${String(sectorIndex)}`),
  );
  if (stream.int(1, 100) > WEATHER_CHANCE_PCT) return null;
  return stream.weighted(pool.map((entry) => [entry.id, entry.weight] as const));
};

export const withWeatherFor = (
  mutators: readonly string[],
  seed: number,
  sectorIndex: number,
  sector: number,
): string[] => {
  const carried = withoutWeather(mutators);
  const rolled = rollWeather(seed, sectorIndex, sector);
  return rolled === null ? carried : [...carried, rolled];
};

export interface RunModifier {
  id: string;
  name: LocKey;
  desc: LocKey;
  weather: boolean;
}

export const runModifiers = (
  mutators: readonly string[],
): readonly RunModifier[] =>
  mutators.flatMap<RunModifier>((id) => {
    const weather = WEATHER_BY_ID.get(id);
    if (weather !== undefined) {
      return [{ id, name: weather.name, desc: weather.desc, weather: true }];
    }
    const mutator = MUTATOR_BY_ID.get(id);
    if (mutator === undefined) return [];
    return [{ id, name: mutator.name, desc: mutator.desc, weather: false }];
  });
