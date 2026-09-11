import type { MkLevel } from "@/data/slots";
import type { LocKey, SlotId } from "@/types/content";

export type FireModeId =
  | "direct"
  | "scatter"
  | "doublet"
  | "shaped"
  | "incendiary"
  | "linked"
  | "shunt";

interface FireModeCopy {
  name: LocKey;
  desc: LocKey;
  short: LocKey;
}

export type FireModeDef =
  | (FireModeCopy & { id: "direct" })
  | (FireModeCopy & {
      id: "scatter";
      fragmentBonus: number;
      minEnemies: number;
    })
  | (FireModeCopy & { id: "doublet"; hits: number })
  | (FireModeCopy & { id: "shaped"; offFacePenalty: number })
  | (FireModeCopy & { id: "incendiary"; damagePenalty: number; burn: number })
  | (FireModeCopy & { id: "linked"; perDie: number; cap: number })
  | (FireModeCopy & { id: "shunt"; damagePenalty: number; charge: number });

const copy = (id: FireModeId): FireModeCopy => ({
  name: `content:fireModes.${id}.name`,
  desc: `content:fireModes.${id}.desc`,
  short: `content:fireModes.${id}.short`,
});

export const DIRECT: Extract<FireModeDef, { id: "direct" }> = {
  id: "direct",
  ...copy("direct"),
};

export const SCATTER: Extract<FireModeDef, { id: "scatter" }> = {
  id: "scatter",
  ...copy("scatter"),
  fragmentBonus: 1,
  minEnemies: 2,
};

export const DOUBLET: Extract<FireModeDef, { id: "doublet" }> = {
  id: "doublet",
  ...copy("doublet"),
  hits: 2,
};

export const SHAPED: Extract<FireModeDef, { id: "shaped" }> = {
  id: "shaped",
  ...copy("shaped"),
  offFacePenalty: 1,
};

export const INCENDIARY: Extract<FireModeDef, { id: "incendiary" }> = {
  id: "incendiary",
  ...copy("incendiary"),
  damagePenalty: 2,
  burn: 2,
};

export const LINKED: Extract<FireModeDef, { id: "linked" }> = {
  id: "linked",
  ...copy("linked"),
  perDie: 1,
  cap: 3,
};

export const SHUNT: Extract<FireModeDef, { id: "shunt" }> = {
  id: "shunt",
  ...copy("shunt"),
  damagePenalty: 2,
  charge: 2,
};

export const FIRE_MODES: readonly FireModeDef[] = [
  DIRECT,
  SCATTER,
  DOUBLET,
  SHAPED,
  INCENDIARY,
  LINKED,
  SHUNT,
];

export const FIRE_MODE_IDS: readonly FireModeId[] = FIRE_MODES.map(
  (def) => def.id,
);

export const FIRE_MODE_BY_ID: ReadonlyMap<FireModeId, FireModeDef> = new Map(
  FIRE_MODES.map((def) => [def.id, def]),
);

export const fireModeDef = (id: FireModeId): FireModeDef =>
  FIRE_MODE_BY_ID.get(id) ?? DIRECT;

export const FIRE_MODE_SLOTS: readonly SlotId[] = ["weaponA", "weaponB"];

export const SCATTER_MK: MkLevel = 3;

export const MODULE_FIRE_MODE: Readonly<Record<string, FireModeId>> = {
  autoloader: DOUBLET.id,
  piercer: SHAPED.id,
  emberInjector: INCENDIARY.id,
  targetingMesh: LINKED.id,
  lanceCapacitor: SHUNT.id,
};

export const fireModesForSlot = (
  slotId: SlotId,
  mk: number,
  modules: readonly string[],
): readonly FireModeId[] => {
  if (!FIRE_MODE_SLOTS.includes(slotId)) return [];
  const granted = new Set<FireModeId>([DIRECT.id]);
  if (mk >= SCATTER_MK) granted.add(SCATTER.id);
  for (const moduleId of modules) {
    const mode = MODULE_FIRE_MODE[moduleId];
    if (mode !== undefined) granted.add(mode);
  }
  return FIRE_MODES.filter((def) => granted.has(def.id)).map((def) => def.id);
};

export const fireModeAllowed = (
  mode: FireModeId,
  livingEnemies: number,
): boolean => mode !== SCATTER.id || livingEnemies >= SCATTER.minEnemies;

export const splitDamage = (total: number, parts: number): readonly number[] => {
  if (parts <= 0) return [];
  const pool = Math.max(0, total);
  const share = Math.floor(pool / parts);
  const remainder = pool - share * parts;
  return Array.from({ length: parts }, (_, index) =>
    index < remainder ? share + 1 : share,
  );
};
