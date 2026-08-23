import { ACHIEVEMENTS, ACHIEVEMENT_BY_ID } from "@/data/achievements";
import {
  OPEN_CONTRACTS,
  OPEN_DICE,
  UNLOCKS,
  type FeatureId,
  type UnlockDef,
  type UnlockHint,
} from "@/data/unlocks";

type Translate = (key: string, opts?: Record<string, unknown>) => string;

const ownHint = (def: UnlockDef): UnlockHint | null => {
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
  return null;
};

const grantHints = (unlockId: string): UnlockHint[] =>
  ACHIEVEMENTS.filter((def) => def.reward?.unlockId === unlockId).map((def) => ({
    kind: "achievement",
    value: 0,
    achievement: def.id,
  }));

const routesFor = (defs: readonly UnlockDef[]): UnlockHint[] => {
  const out: UnlockHint[] = [];
  const seen = new Set<string>();
  const push = (hint: UnlockHint): void => {
    const key = `${hint.kind}:${String(hint.value)}:${hint.achievement ?? ""}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(hint);
  };
  for (const def of defs) {
    const own = ownHint(def);
    if (own !== null) push(own);
    for (const hint of grantHints(def.id)) push(hint);
  }
  return out;
};

export const dieRoutes = (defId: string): UnlockHint[] => {
  if (OPEN_DICE.includes(defId)) return [];
  const defs = UNLOCKS.filter((def) => def.dice?.includes(defId) === true);
  if (defs.length === 0) return [{ kind: "drop", value: 0 }];
  return routesFor(defs);
};

export const contractRoutes = (id: string): UnlockHint[] => {
  if (OPEN_CONTRACTS.includes(id)) return [];
  return routesFor(UNLOCKS.filter((def) => def.contracts?.includes(id) === true));
};

export const featureRoutes = (feature: FeatureId): UnlockHint[] =>
  routesFor(UNLOCKS.filter((def) => def.feature === feature));

export const cosmeticRoutes = (id: string): UnlockHint[] =>
  routesFor(UNLOCKS.filter((def) => def.cosmetic === id));

export const unlockHintLine = (hint: UnlockHint, t: Translate): string => {
  switch (hint.kind) {
    case "level":
      return t("meta:unlock.hintLevel", { n: hint.value });
    case "achievement":
      return t("meta:unlock.hintAchievement", {
        name: t(
          ACHIEVEMENT_BY_ID.get(hint.achievement ?? "")?.name ??
            "meta:unlock.hintUnknown",
        ),
      });
    case "ascension":
      return t("meta:unlock.hintAscension", { n: hint.value });
    case "clears":
      return t("meta:unlock.hintClears", { n: hint.value });
    case "drop":
      return t("meta:unlock.hintDrop");
  }
};

export const unlockHintsLine = (
  hints: readonly UnlockHint[],
  t: Translate,
): string =>
  hints.map((hint) => unlockHintLine(hint, t)).join(t("meta:unlock.hintJoin"));
