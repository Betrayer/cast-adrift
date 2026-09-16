import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import {
  ASCENSIONS,
  ASCENSION_REWARDS,
  MAX_ASCENSION,
} from "../src/data/ascension";
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_ALIASES,
  ACHIEVEMENT_BY_ID,
  ACHIEVEMENT_FAMILIES,
  ACHIEVEMENT_GROUPS,
  ACHIEVEMENT_ROWS,
  SINGLE_ACHIEVEMENTS,
} from "../src/data/achievements";
import { BADGES, BADGE_BY_ID, DIE_SKINS } from "../src/data/cosmetics";
import { MILESTONES, milestoneLabel } from "../src/data/milestones";
import { THEMES } from "../src/data/themes";
import {
  OPEN_CONTRACTS,
  OPEN_DICE,
  UNLOCKS,
  UNLOCK_BY_ID,
} from "../src/data/unlocks";
import { BARKS, BARK_QUOTA, BARK_RESERVATIONS } from "../src/data/barks";
import {
  ENGRAVINGS,
  ENGRAVING_BY_ID,
  ENGRAVING_PAIRS,
} from "../src/data/engravings";
import { FATE_TABLE } from "../src/data/fate";
import { ALL_MODULES, MODULE_POOL } from "../src/data/modules";
import {
  isConditional,
  isSingleScalar,
  normalizedBody,
  referencedTagsOf,
  tagConditionedEffects,
  usesModuleVocabulary,
  type ShapedContent,
} from "../src/data/contentShape";
import {
  FRAGMENTS,
  GATED_FRAGMENTS,
} from "../src/data/narrative/fragments";
import {
  KEEPER_LINES,
  REACTIVE_KEEPER_LINES,
} from "../src/data/narrative/keeperLines";
import { CHART_ADJACENCY, CHART_NODES, CHART_NODE_BY_ID } from "../src/data/chart";
import {
  chartNodeLines,
  UNDESCRIBED_MOD_KEYS,
} from "../src/game/chart/describe";
import { CONTRACTS, CONTRACT_STAR_COUNT } from "../src/data/contracts";
import { MUTATORS, MUTATOR_BY_ID, ZERO_MUTATOR_MODS } from "../src/data/mutators";
import {
  SALVAGE_FACES,
  SALVAGE_OFFER_SIZE,
} from "../src/data/salvage";
import {
  WEATHER,
  WEATHER_BY_ID,
  WEATHER_POOLS,
  weatherPoolFor,
} from "../src/data/weather";
import { CODEX, CODEX_BY_ID } from "../src/data/codex";
import { STARTER_DECK } from "../src/data/decks";
import { ALL_DICE, BASIC_DICE, DIE_BY_ID } from "../src/data/dice";
import { resolveFaces } from "../src/game/puzzles/evaluate";
import { createStream } from "../src/services/rng";
import {
  ENCOUNTER_GROUPS,
  ALL_ENEMIES,
  BASE_ENEMIES,
  DRIFTER_ENEMIES,
  SECTOR_ROSTERS,
  isEncounterGroup,
} from "../src/data/enemies";
import { SECTORS, sectorDef } from "../src/data/sectors";
import { ALL_EVENTS } from "../src/data/events";
import { CHAINS, CHAIN_EVENT_IDS } from "../src/data/narrative/chains";
import { ENDINGS } from "../src/data/narrative/endings";
import {
  CHECK_DECK,
  PROLOGUE_BEATS,
  SYSTEMS_CHECK,
} from "../src/data/narrative/prologue";
import {
  earnedMemoryOrders,
  MEMORIES,
  MEMORY_CODEX_IDS,
  MEMORY_TOTAL,
  NUMBERED_MEMORIES,
} from "../src/data/narrative/memories";
import { ALL_PERKS } from "../src/data/perks";
import { PUZZLES, type PuzzleGoal } from "../src/data/puzzles";
import { RESONANCE_BONUSES } from "../src/data/resonance";
import {
  SHIPS,
  shipBridgeIssues,
  shipTextIssues,
} from "../src/data/ships";
import { DIE_PTS } from "../src/data/tiers";
import {
  ACTION_NAMES,
  COND_NAMES,
  HOOKS,
  RUN_ACTIONS as RUN_ACTION_NAMES,
  RUN_HOOKS,
  SUBJECT_CONDS as SUBJECT_COND_NAMES,
  SUBJECT_HOOKS,
} from "../src/game/effects/types";
import { CONTENT_TAGS, SCHOOL_TAGS, isContentTag } from "../src/data/tags";
import { STATUS_KEYS } from "../src/game/battle/statuses";
import { moduleTags } from "../src/data/modules/types";
import { calibrationIssues } from "../src/game/puzzles/difficulty";
import { PUZZLE_CODEX, rewardFor } from "../src/game/puzzles/stakes";
import { puzzleTable } from "./puzzleTable";
import enContent from "../src/i18n/en/content.json" with { type: "json" };
import ukContent from "../src/i18n/uk/content.json" with { type: "json" };
import ruContent from "../src/i18n/ru/content.json" with { type: "json" };
import enRun from "../src/i18n/en/run.json" with { type: "json" };
import ukRun from "../src/i18n/uk/run.json" with { type: "json" };
import ruRun from "../src/i18n/ru/run.json" with { type: "json" };
import enCommon from "../src/i18n/en/common.json" with { type: "json" };
import ukCommon from "../src/i18n/uk/common.json" with { type: "json" };
import ruCommon from "../src/i18n/ru/common.json" with { type: "json" };
import enMenu from "../src/i18n/en/menu.json" with { type: "json" };
import ukMenu from "../src/i18n/uk/menu.json" with { type: "json" };
import ruMenu from "../src/i18n/ru/menu.json" with { type: "json" };
import enSettings from "../src/i18n/en/settings.json" with { type: "json" };
import ukSettings from "../src/i18n/uk/settings.json" with { type: "json" };
import ruSettings from "../src/i18n/ru/settings.json" with { type: "json" };
import enBattle from "../src/i18n/en/battle.json" with { type: "json" };
import ukBattle from "../src/i18n/uk/battle.json" with { type: "json" };
import ruBattle from "../src/i18n/ru/battle.json" with { type: "json" };
import enMeta from "../src/i18n/en/meta.json" with { type: "json" };
import ukMeta from "../src/i18n/uk/meta.json" with { type: "json" };
import ruMeta from "../src/i18n/ru/meta.json" with { type: "json" };
import type { Action, Cond, EffectDef } from "../src/game/effects/types";
import type { GoalSpec } from "../src/game/run/goals";
import type { EventOption, Outcome } from "../src/types/events";
import {
  INTENT_KINDS,
  PART_DEATH_KINDS,
  SUBSYSTEM_AURAS,
  claimKey,
  intentsOfStep,
  isFlatPattern,
  specialClaimCount,
  trueClaimsOf,
} from "../src/types/content";
import type { Intent, PatternStep } from "../src/types/content";

type ContentNode = string | { [key: string]: ContentNode };

const errors: string[] = [];

import { RUNTIME_FLAGS } from "../src/data/flags";
import { deadFlags, unwritableFlags } from "../src/game/narrative/flagGraph";
import { BLACK_BOX_EPITAPHS } from "../src/data/narrative/blackBox";
import { DEATH_LINES } from "../src/data/narrative/deathLines";
import { EPILOGUE_ENTRIES } from "../src/data/narrative/epilogue";
const hooks = new Set<string>(HOOKS);
const actionNames = new Set<string>(ACTION_NAMES);
const SUBJECT_HOOK_SET = new Set<string>(SUBJECT_HOOKS);
const RUN_HOOK_SET = new Set<string>(RUN_HOOKS);
const SUBJECT_CONDS = new Set<string>(SUBJECT_COND_NAMES);
const RUN_ACTIONS = new Set<string>(RUN_ACTION_NAMES);
const SLOT_ACTIONS = new Set<string>(["crit", "repeatSlot", "grow"]);
const SLOT_HOOK_SET = new Set<string>(["beforeResolveSlot", "afterResolveSlot"]);

const needsSubjectDie = (action: Action): boolean => {
  if (action.a === "grow") return true;
  if (
    action.a !== "modDieValue" &&
    action.a !== "setDieValue" &&
    action.a !== "rerollDie"
  ) {
    return false;
  }
  return action.sel === undefined || action.sel.s === "subject";
};

const PENDING_VOCABULARY: Readonly<Record<string, string>> = {
  rollStart: "R6",
  enemyTurnEnd: "R6",
  eventOutcome: "R7",
  shopEnter: "R8",
  enemyHpPctLt: "R6",
  enemyShielded: "R6",
  enemyHasStatus: "R6",
  enemyCountAtLeast: "R6",
  targetIsBossOrMini: "R6",
  flag: "R7",
  setFlag: "R7",
};

const content = enContent as unknown as ContentNode;

const checkUniqueIds = (kind: string, ids: readonly string[]): void => {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) errors.push(`${kind}: duplicate id "${id}"`);
    seen.add(id);
  }
};

const expectCount = (
  kind: string,
  found: number,
  want: number,
  noun = "",
): void => {
  if (found === want) return;
  const what = noun === "" ? "" : ` ${noun}`;
  errors.push(
    `${kind}: expected ${String(want)}${what}, found ${String(found)}`,
  );
};

const resolveIn = (root: ContentNode, path: string): boolean => {
  let node: ContentNode | undefined = root;
  for (const seg of path.split(".")) {
    if (typeof node !== "object" || node === null) return false;
    node = node[seg];
    if (node === undefined) return false;
  }
  return typeof node === "string";
};

const resolveContentKey = (key: string): boolean => {
  const [ns, path] = key.split(":");
  if (ns !== "content" || path === undefined) return true;
  return resolveIn(content, path);
};

const stringAt = (root: ContentNode, path: string): string | undefined => {
  let node: ContentNode | undefined = root;
  for (const seg of path.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = node[seg];
    if (node === undefined) return undefined;
  }
  return typeof node === "string" ? node : undefined;
};

const resolveMetaKey = (path: string): boolean =>
  resolveIn(enMeta as unknown as ContentNode, path);

const checkLocKey = (owner: string, key: string | undefined): void => {
  if (key === undefined) return;
  if (!key.startsWith("content:")) return;
  if (!resolveContentKey(key)) {
    errors.push(`${owner}: missing en content LocKey "${key}"`);
  }
};

const referencedTags = new Set<string>();
const carriedTags = new Set<string>();
const hookUse = new Map<string, number>();
const condUse = new Map<string, number>();
const actionUse = new Map<string, number>();

const bump = (map: Map<string, number>, key: string): void => {
  map.set(key, (map.get(key) ?? 0) + 1);
};

const walkConds = (conds: readonly Cond[] | undefined): void => {
  for (const cond of conds ?? []) {
    bump(condUse, cond.c);
    if (cond.c === "hasTag" || cond.c === "countTag") referencedTags.add(cond.tag);
    else if (cond.c === "any") walkConds(cond.of);
    else if (cond.c === "not") walkConds([cond.of]);
  }
};

const walkActions = (actions: readonly Action[]): void => {
  for (const action of actions) {
    bump(actionUse, action.a);
    if (!actionNames.has(action.a)) {
      errors.push(`effects: unknown action "${action.a}"`);
    }
    if (action.a === "schedule") walkActions(action.do);
    if ("perTag" in action && action.perTag !== undefined) {
      referencedTags.add(action.perTag);
    }
  }
};

const condNeedsSubject = (cond: Cond): boolean => {
  if (cond.c === "any") return cond.of.some(condNeedsSubject);
  if (cond.c === "not") return condNeedsSubject(cond.of);
  return SUBJECT_CONDS.has(cond.c);
};

type EffectOwnerKind = "die" | "loadout";

const checkEffects = (
  owner: string,
  effects: readonly EffectDef[] | undefined,
  ownerKind: EffectOwnerKind = "loadout",
): void => {
  if (effects === undefined) return;
  for (const def of effects) {
    if (!hooks.has(def.on)) {
      errors.push(`${owner}: unknown hook "${def.on}"`);
    }
    bump(hookUse, def.on);
    walkConds(def.if);
    walkActions(def.do);
    const hasSubject = ownerKind === "die" || SUBJECT_HOOK_SET.has(def.on);
    if (!hasSubject && (def.if ?? []).some(condNeedsSubject)) {
      errors.push(
        `${owner}: "${def.on}" carries a die condition but has no subject die`,
      );
    }
    if (!hasSubject && def.do.some(needsSubjectDie)) {
      errors.push(
        `${owner}: "${def.on}" carries a die action but has no subject die`,
      );
    }
    for (const action of def.do) {
      if (SLOT_ACTIONS.has(action.a) && !SLOT_HOOK_SET.has(def.on)) {
        errors.push(
          `${owner}: action "${action.a}" only takes effect while a slot resolves, not on "${def.on}"`,
        );
      }
      if (RUN_HOOK_SET.has(def.on) && !RUN_ACTIONS.has(action.a)) {
        errors.push(
          `${owner}: action "${action.a}" cannot fire on run hook "${def.on}"`,
        );
      }
    }
  }
};

const checkTag = (owner: string, tag: string): void => {
  if (!isContentTag(tag)) errors.push(`${owner}: unknown tag "${tag}"`);
};

checkUniqueIds(
  "dice",
  ALL_DICE.map((d) => d.id),
);
checkUniqueIds(
  "enemies",
  ALL_ENEMIES.map((e) => e.id),
);
checkUniqueIds(
  "ships",
  SHIPS.map((s) => s.id),
);

const dieIds = new Set(ALL_DICE.map((d) => d.id));
for (const defId of STARTER_DECK) {
  if (!dieIds.has(defId))
    errors.push(`decks: STARTER_DECK references unknown die "${defId}"`);
}

for (const die of ALL_DICE) {
  if (die.pts !== DIE_PTS[die.tier]) {
    errors.push(
      `dice: "${die.id}" pts ${String(die.pts)} !== DIE_PTS[${String(die.tier)}]`,
    );
  }
  checkLocKey(`dice.${die.id}`, die.name);
  checkLocKey(`dice.${die.id}`, die.desc);
  checkEffects(`dice.${die.id}`, die.effects, "die");
  if (die.faces !== undefined && die.faces.length === 0) {
    errors.push(`dice: "${die.id}" has empty faces`);
  }
  carriedTags.add(die.school);
  for (const tag of die.tags ?? []) {
    checkTag(`dice.${die.id}`, tag);
    carriedTags.add(tag);
  }
}

for (const bonus of RESONANCE_BONUSES) {
  checkLocKey(`resonance.${bonus.school}-${String(bonus.threshold)}`, bonus.desc);
  checkEffects(`resonance.${bonus.school}-${String(bonus.threshold)}`, bonus.effects);
}

const enemyIds = new Set(ALL_ENEMIES.map((e) => e.id));

const flattenStep = (step: PatternStep): readonly Intent[] => intentsOfStep(step);

const CLAIM_BUDGET: Readonly<Record<string, number>> = {
  base: 2,
  elite: 3,
  miniboss: 3,
  boss: 3,
};

const tierOf = (def: (typeof ALL_ENEMIES)[number]): string =>
  def.boss === true
    ? "boss"
    : def.miniboss === true
      ? "miniboss"
      : def.elite === true
        ? "elite"
        : "base";

const usedIntents = new Set<string>();

for (const enemy of ALL_ENEMIES) {
  if (enemy.pattern.length === 0)
    errors.push(`enemies: "${enemy.id}" has an empty pattern`);
  if (enemy.hp <= 0) errors.push(`enemies: "${enemy.id}" hp must be positive`);
  checkLocKey(`enemies.${enemy.id}`, enemy.name);
  checkLocKey(`enemies.${enemy.id}`, enemy.signature);
  if (enemy.signature !== `content:signature.${enemy.id}`)
    errors.push(`enemies: "${enemy.id}" signature key does not match its id`);
  if (!resolveContentKey(`content:dossier.${enemy.id}`))
    errors.push(`enemies: "${enemy.id}" has no dossier line`);
  if (enemy.claims.length === 0)
    errors.push(`enemies: "${enemy.id}" states no signature claim`);
  const trueClaims = trueClaimsOf(enemy);
  for (const claim of enemy.claims) {
    if (!trueClaims.has(claimKey(claim)))
      errors.push(
        `enemies: "${enemy.id}" claims ${claimKey(claim)}, which its def does not carry`,
      );
  }
  const budget = CLAIM_BUDGET[tierOf(enemy)] ?? 2;
  if (specialClaimCount(enemy) > budget)
    errors.push(
      `enemies: "${enemy.id}" declares ${String(specialClaimCount(enemy))} special claims, budget ${String(budget)}`,
    );
  const allSteps = [
    ...enemy.pattern,
    ...(enemy.phases ?? []).flatMap((phase) => [...phase.pattern]),
    ...(enemy.subsystems ?? []).flatMap((sub) => [...(sub.intents ?? [])]),
  ];
  for (const step of allSteps) {
    if ("pick" in step) {
      if (step.pick.length === 0)
        errors.push(`enemies: "${enemy.id}" has an empty weighted step`);
      for (const [, weight] of step.pick) {
        if (weight <= 0)
          errors.push(`enemies: "${enemy.id}" has a non-positive pick weight`);
      }
    }
    for (const intent of flattenStep(step)) {
      usedIntents.add(intent.t);
      if (intent.t === "summon" && !enemyIds.has(intent.id)) {
        errors.push(
          `enemies: "${enemy.id}" summons unknown enemy "${intent.id}"`,
        );
      }
    }
  }
  for (const phase of enemy.phases ?? []) {
    for (const intent of [...(phase.onEnter ?? []), ...(phase.everyTurn ?? [])]) {
      usedIntents.add(intent.t);
      if (intent.t === "summon" && !enemyIds.has(intent.id)) {
        errors.push(
          `enemies: "${enemy.id}" summons unknown enemy "${intent.id}"`,
        );
      }
    }
  }
  for (const sub of enemy.subsystems ?? []) {
    if (sub.hp <= 0)
      errors.push(
        `enemies: "${enemy.id}" subsystem "${sub.id}" hp must be positive`,
      );
    checkLocKey(`enemies.${enemy.id}.${sub.id}`, sub.name);
    if (sub.onDeath?.t === "spawnAdds" && !enemyIds.has(sub.onDeath.id)) {
      errors.push(
        `enemies: "${enemy.id}" part "${sub.id}" spawns unknown enemy "${sub.onDeath.id}"`,
      );
    }
  }
  if (enemy.shell === true) {
    const partCount = (enemy.subsystems ?? []).length;
    if ((enemy.coreLockAt ?? 0) >= partCount)
      errors.push(
        `enemies: "${enemy.id}" is a shell with coreLockAt ${String(enemy.coreLockAt ?? 0)} over ${String(partCount)} parts, so its core never seals`,
      );
  } else if (enemy.coreLockAt !== undefined) {
    errors.push(
      `enemies: "${enemy.id}" authors coreLockAt ${String(enemy.coreLockAt)} without shell, where it does nothing`,
    );
  }
}

for (const kind of INTENT_KINDS) {
  if (!usedIntents.has(kind))
    errors.push(`enemies: intent "${kind}" is declared but no enemy uses it`);
}

const ROSTER_TARGET: Readonly<Record<string, number>> = {
  base: 63,
  elite: 14,
  miniboss: 14,
  boss: 12,
};
const rosterCount = new Map<string, number>();
for (const enemy of ALL_ENEMIES) {
  const tier = tierOf(enemy);
  rosterCount.set(tier, (rosterCount.get(tier) ?? 0) + 1);
}
for (const [tier, want] of Object.entries(ROSTER_TARGET)) {
  const got = rosterCount.get(tier) ?? 0;
  if (got !== want)
    errors.push(`enemies: ${tier} roster holds ${String(got)}, target ${String(want)}`);
}

const BESPOKE_PER_SECTOR: readonly number[] = [10, 10, 10, 10, 10, 8];
const POOL_BESPOKE_FLOOR = 8;
SECTOR_ROSTERS.forEach((roster, index) => {
  const sector = index + 1;
  const want = BESPOKE_PER_SECTOR[index] ?? 10;
  if (roster.length !== want)
    errors.push(
      `enemies: sector ${String(sector)} has ${String(roster.length)} bespoke base enemies, target ${String(want)}`,
    );
  const ids = new Set(roster.map((e) => e.id));
  const inPool = sectorDef(sector).enemyPool.filter(([id]) => ids.has(id)).length;
  if (inPool < POOL_BESPOKE_FLOOR)
    errors.push(
      `enemies: sector ${String(sector)} draws only ${String(inPool)} of its bespoke enemies, floor ${String(POOL_BESPOKE_FLOOR)}`,
    );
});

const flatEnemies = BASE_ENEMIES.filter(isFlatPattern);
const FLAT_PCT_CAP = 20;
const flatPct = (flatEnemies.length / Math.max(1, BASE_ENEMIES.length)) * 100;
if (flatPct > FLAT_PCT_CAP)
  errors.push(
    `enemies: ${flatPct.toFixed(1)}% of the base roster is a flat loop, cap ${String(FLAT_PCT_CAP)}%`,
  );
const sector1Ids = new Set(SECTOR_ROSTERS[0]?.map((e) => e.id) ?? []);
const drifterIds = new Set(DRIFTER_ENEMIES.map((e) => e.id));
for (const def of flatEnemies) {
  if (!sector1Ids.has(def.id) && !drifterIds.has(def.id))
    errors.push(
      `enemies: "${def.id}" is a flat loop outside sector 1 and the drifter pool`,
    );
}

const VARIED_PCT = 30;
const variedBase = BASE_ENEMIES.filter((def) =>
  def.pattern.some((step) => "pick" in step || "when" in step),
).length;
const variedPct = (variedBase / Math.max(1, BASE_ENEMIES.length)) * 100;
if (variedPct < VARIED_PCT)
  errors.push(
    `enemies: ${variedPct.toFixed(1)}% of the base roster branches, target ${String(VARIED_PCT)}%`,
  );

const reachable = new Set<string>();
for (let sector = 1; sector <= SECTOR_ROSTERS.length; sector += 1) {
  const def = sectorDef(sector);
  if (def.minibossPool.length < 3)
    errors.push(
      `sectors: sector ${String(sector)} minibossPool holds ${String(def.minibossPool.length)}, floor 3`,
    );
  if (def.bossPool.length !== 2)
    errors.push(
      `sectors: sector ${String(sector)} bossPool holds ${String(def.bossPool.length)}, target 2`,
    );
  for (const id of [
    ...def.enemyPool.map(([enemyId]) => enemyId),
    ...def.elitePool,
    ...def.minibossPool,
    ...def.bossPool,
    ...def.pairPool.flat(),
  ]) {
    if (!enemyIds.has(id))
      errors.push(`sectors: sector ${String(sector)} references unknown enemy "${id}"`);
    reachable.add(id);
  }
}
for (const member of Object.values(ENCOUNTER_GROUPS).flat()) reachable.add(member);
for (const enemy of ALL_ENEMIES) {
  for (const step of [
    ...enemy.pattern,
    ...(enemy.phases ?? []).flatMap((p) => [
      ...p.pattern,
      ...(p.onEnter ?? []),
      ...(p.everyTurn ?? []),
    ]),
    ...(enemy.subsystems ?? []).flatMap((sub) => [...(sub.intents ?? [])]),
  ]) {
    for (const intent of flattenStep(step)) {
      if (intent.t === "summon") reachable.add(intent.id);
    }
  }
  for (const sub of enemy.subsystems ?? []) {
    if (sub.onDeath?.t === "spawnAdds") reachable.add(sub.onDeath.id);
  }
}
for (const enemy of ALL_ENEMIES) {
  if (!reachable.has(enemy.id))
    errors.push(`enemies: "${enemy.id}" is in no sector pool and nothing summons it`);
}

const battleRoot = enBattle as unknown as ContentNode;
const needsBattleKey = (owner: string, path: string): void => {
  if (!resolveIn(battleRoot, path)) {
    errors.push(`${owner}: missing en battle key "${path}"`);
  }
};

for (const kind of INTENT_KINDS) {
  needsBattleKey("intents", `intent.${kind}`);
  needsBattleKey("intents", `intentWhy.${kind}`);
}
for (const aura of SUBSYSTEM_AURAS) {
  needsBattleKey("subsystems", `aura.${aura}`);
}
for (const kind of PART_DEATH_KINDS) {
  needsBattleKey("parts", `partDeath.${kind}`);
}
for (const status of STATUS_KEYS) {
  needsBattleKey("statuses", `status.${status}`);
  needsBattleKey("statuses", `statusName.${status}`);
  needsBattleKey("statuses", `statusDesc.${status}`);
}
for (const tag of CONTENT_TAGS) {
  if (!resolveIn(enRun as unknown as ContentNode, `tagDesc.${tag}`)) {
    errors.push(`tags: missing en run key "tagDesc.${tag}"`);
  }
}
const usedAuras = new Set(
  ALL_ENEMIES.flatMap((def) =>
    (def.subsystems ?? []).flatMap((sub) =>
      sub.aura === undefined ? [] : [sub.aura],
    ),
  ),
);
for (const aura of usedAuras) {
  if (!SUBSYSTEM_AURAS.includes(aura)) {
    errors.push(`subsystems: aura "${aura}" is not in SUBSYSTEM_AURAS`);
  }
}

for (const ship of SHIPS) {
  checkLocKey(`ships.${ship.id}`, ship.name);
  checkLocKey(`ships.${ship.id}`, ship.passiveName);
  checkLocKey(`ships.${ship.id}`, ship.passiveDesc);
}
errors.push(...shipTextIssues(SHIPS));
errors.push(...shipBridgeIssues(SHIPS));

checkUniqueIds(
  "chart",
  CHART_NODES.map((n) => n.id),
);

const CHART_MINORS = 24;
const CHART_NOTABLES = 32;
const CHART_KEYSTONES = 8;
const CHART_DISTINCT_SMALLS = 100;
const minorCount = CHART_NODES.filter((n) => n.kind === "minor").length;
expectCount("chart", minorCount, CHART_MINORS, "minor notables");
const notableCount = CHART_NODES.filter((n) => n.kind === "notable").length;
expectCount("chart", notableCount, CHART_NOTABLES, "notables");
const keystoneCount = CHART_NODES.filter((n) => n.kind === "keystone").length;
expectCount("chart", keystoneCount, CHART_KEYSTONES, "keystones");

const chartPayloadKey = (node: (typeof CHART_NODES)[number]): string =>
  JSON.stringify([
    node.mods ?? null,
    node.effects ?? null,
    node.traits ?? null,
    node.fx ?? null,
    node.hubBudget ?? null,
    node.budgetDelta ?? null,
    node.slotTierDelta ?? null,
  ]);

const chartSmalls = CHART_NODES.filter((n) => n.kind === "small");
const distinctSmalls = new Set(chartSmalls.map(chartPayloadKey)).size;
if (distinctSmalls < CHART_DISTINCT_SMALLS)
  errors.push(
    `chart: expected at least ${String(CHART_DISTINCT_SMALLS)} distinct small payloads, found ${String(distinctSmalls)}`,
  );

for (const node of CHART_NODES) {
  for (const other of CHART_ADJACENCY.get(node.id) ?? []) {
    const neighbour = CHART_NODE_BY_ID.get(other);
    if (neighbour === undefined) continue;
    if (chartPayloadKey(neighbour) === chartPayloadKey(node)) {
      errors.push(
        `chart: "${node.id}" and its neighbour "${other}" carry the same payload`,
      );
    }
  }
}

const missingChartKeys = new Set<string>();
const chartTranslate = (key: string): string => {
  const [ns, path] = key.includes(":") ? key.split(":") : ["meta", key];
  if (path === undefined) return key;
  const root =
    ns === "battle"
      ? (enBattle as unknown as ContentNode)
      : (enMeta as unknown as ContentNode);
  if (!resolveIn(root, path)) {
    missingChartKeys.add(key);
    return "";
  }
  return path;
};

const chartTagSet = new Set<string>();
for (const node of CHART_NODES) {
  checkLocKey(`chart.${node.id}`, node.name);
  checkLocKey(`chart.${node.id}`, node.desc);
  checkEffects(`chart.${node.id}`, node.effects);
  for (const link of node.links) {
    if (!CHART_NODE_BY_ID.has(link))
      errors.push(`chart: "${node.id}" links to unknown node "${link}"`);
  }
  if (
    node.effects === undefined &&
    node.mods === undefined &&
    node.traits === undefined &&
    node.hubBudget !== true &&
    node.budgetDelta === undefined &&
    node.slotTierDelta === undefined
  ) {
    errors.push(`chart: "${node.id}" is a no-op (no effects, mods, traits, or budget)`);
  }
  if (node.name !== undefined && !resolveMetaKey(node.name.replace("meta:", "")))
    errors.push(`chart: "${node.id}" has no en name for "${node.name}"`);
  const lines = chartNodeLines(node, chartTranslate);
  if (lines.length === 0)
    errors.push(`chart: "${node.id}" renders a blank card`);
  for (const line of lines) {
    if (line.text === "")
      errors.push(`chart: "${node.id}" renders an untranslated line`);
  }
  const drawbackKeys = Object.entries(node.mods ?? {}).filter(
    ([key, value]) =>
      typeof value === "number" &&
      (key === "nudgeCostDelta" || key === "tideEffectDelta"
        ? value > 0
        : value < 0),
  );
  if (drawbackKeys.length > 0 && !lines.some((line) => line.drawback))
    errors.push(`chart: "${node.id}" hides a drawback`);
  for (const tag of node.tags ?? []) {
    checkTag(`chart.${node.id}`, tag);
    chartTagSet.add(tag);
  }
}
for (const key of missingChartKeys) {
  errors.push(`chart: missing en key "${key}"`);
}
if (UNDESCRIBED_MOD_KEYS.length > 0) {
  errors.push(
    `chart: describe.ts omits mod keys ${UNDESCRIBED_MOD_KEYS.join(", ")}`,
  );
}
for (const tag of chartTagSet) {
  if (!resolveMetaKey(`chartTag.${tag}`))
    errors.push(`chart: no en label for tag chip "${tag}"`);
}

const chartReached = new Set<string>();
const chartQueue: string[] = CHART_NODES.filter((n) => n.entry === true).map(
  (n) => n.id,
);
for (const id of chartQueue) chartReached.add(id);
while (chartQueue.length > 0) {
  const cur = chartQueue.shift();
  if (cur === undefined) break;
  for (const next of CHART_ADJACENCY.get(cur) ?? []) {
    if (chartReached.has(next)) continue;
    chartReached.add(next);
    chartQueue.push(next);
  }
}
for (const node of CHART_NODES) {
  if (!chartReached.has(node.id))
    errors.push(`chart: "${node.id}" is unreachable from any entry node`);
}

checkUniqueIds(
  "perks",
  ALL_PERKS.map((p) => p.id),
);

const PERK_TOTAL = 180;
if (ALL_PERKS.length !== PERK_TOTAL) {
  errors.push(
    `perks: expected exactly ${String(PERK_TOTAL)}, found ${String(ALL_PERKS.length)}`,
  );
}

const RARITY_TARGET_PCT: Record<string, number> = {
  common: 50,
  uncommon: 35,
  rare: 15,
};
for (const [rarity, target] of Object.entries(RARITY_TARGET_PCT)) {
  const pct =
    (ALL_PERKS.filter((p) => p.rarity === rarity).length / ALL_PERKS.length) *
    100;
  if (Math.abs(pct - target) > 4) {
    errors.push(
      `perks: ${rarity} share ${pct.toFixed(1)}% is outside ${String(target)}%±4`,
    );
  }
}

for (const perk of ALL_PERKS) {
  checkLocKey(`perks.${perk.id}`, perk.name);
  checkLocKey(`perks.${perk.id}`, perk.desc);
  checkEffects(`perks.${perk.id}`, perk.effects);
  if (
    perk.effects === undefined &&
    perk.mods === undefined &&
    perk.traits === undefined
  ) {
    errors.push(`perks: "${perk.id}" has no effects, mods, or traits`);
  }
  if (perk.rarity === "rare") {
    const syn = perk.synergy;
    if (syn === undefined || syn.length === 0) {
      errors.push(`perks: rare "${perk.id}" has no synergy tag`);
    } else {
      for (const tag of syn) referencedTags.add(tag);
    }
  }
  for (const tag of perk.tags ?? []) {
    checkTag(`perks.${perk.id}`, tag);
    carriedTags.add(tag);
  }
}

for (const [group, members] of Object.entries(ENCOUNTER_GROUPS)) {
  if (enemyIds.has(group))
    errors.push(`encounters: group "${group}" shadows an enemy id`);
  for (const member of members) {
    if (!enemyIds.has(member))
      errors.push(
        `encounters: group "${group}" references unknown enemy "${member}"`,
      );
  }
}

const dieIdSet = new Set(ALL_DICE.map((d) => d.id));

checkUniqueIds(
  "events",
  ALL_EVENTS.map((e) => e.id),
);
checkUniqueIds(
  "codex",
  CODEX.map((e) => e.id),
);
checkUniqueIds(
  "puzzles",
  PUZZLES.map((p) => p.id),
);
checkUniqueIds(
  "barks",
  BARKS.map((b) => b.id),
);

const optionOutcomeList = (option: EventOption): Outcome[] => {
  if (option.check !== undefined) {
    if ((option.onPass ?? []).length === 0)
      errors.push(`events: "${option.id}" check has no onPass outcomes`);
    if ((option.onFail ?? []).length === 0)
      errors.push(`events: "${option.id}" check has no onFail outcomes`);
    return [...(option.onPass ?? []), ...(option.onFail ?? [])];
  }
  if ((option.outcomes ?? []).length === 0)
    errors.push(`events: "${option.id}" has no outcomes`);
  return [...(option.outcomes ?? [])];
};

const checkOutcome = (owner: string, outcome: Outcome): void => {
  checkLocKey(owner, outcome.text);
  checkLocKey(owner, outcome.consequence);
  if (outcome.effects.length === 0 && outcome.follow === undefined)
    errors.push(`events: ${owner} has an outcome with no mechanical effect`);
  if (outcome.codex !== undefined && !CODEX_BY_ID.has(outcome.codex))
    errors.push(`events: ${owner} references unknown codex "${outcome.codex}"`);
  for (const eff of outcome.effects) {
    if (eff.k === "loot" && eff.die !== undefined && !dieIdSet.has(eff.die))
      errors.push(`events: ${owner} loots unknown die "${eff.die}"`);
  }
  if (outcome.follow !== undefined) {
    for (const id of outcome.follow.enemyIds) {
      if (!enemyIds.has(id) && !isEncounterGroup(id))
        errors.push(`events: ${owner} follow references unknown enemy "${id}"`);
    }
    const followDie = outcome.follow.loot?.die;
    if (followDie !== undefined && !dieIdSet.has(followDie))
      errors.push(`events: ${owner} follow loots unknown die "${followDie}"`);
  }
};

let callbackCount = 0;
for (const event of ALL_EVENTS) {
  checkLocKey(`events.${event.id}`, event.text);
  if (event.speaker !== undefined)
    checkLocKey(`events.${event.id}`, `content:speaker.${event.speaker}`);
  if (event.codex !== undefined && !CODEX_BY_ID.has(event.codex))
    errors.push(`events: "${event.id}" references unknown codex "${event.codex}"`);
  if (event.requires?.flags !== undefined) callbackCount += 1;
  if (event.options.length === 0)
    errors.push(`events: "${event.id}" has no options`);
  for (const option of event.options) {
    checkLocKey(`events.${event.id}.${option.id}`, option.label);
    for (const outcome of optionOutcomeList(option)) {
      checkOutcome(`${event.id}.${option.id}`, outcome);
    }
  }
}

const EVENT_TOTAL = 177;
const CALLBACK_TARGET = 55;
const THREE_OPTION_PCT = 35;
const WEIGHTED_TARGET = 25;
const SECTOR_TARGET: Readonly<Record<string, number>> = {
  S1: 31,
  S2: 22,
  S3: 22,
  S4: 20,
  S5: 20,
  S6: 12,
  common: 35,
  beacon: 7,
};

if (ALL_EVENTS.length < EVENT_TOTAL)
  errors.push(
    `events: expected at least ${String(EVENT_TOTAL)} events, found ${String(ALL_EVENTS.length)}`,
  );
if (callbackCount < CALLBACK_TARGET)
  errors.push(
    `events: expected at least ${String(CALLBACK_TARGET)} callback events, found ${String(callbackCount)}`,
  );

const eventBucket = (def: (typeof ALL_EVENTS)[number]): string => {
  if (def.kind === "beacon") return "beacon";
  if (CHAIN_EVENT_IDS.has(def.id)) return "chain";
  const sectors = def.requires?.sector;
  return sectors !== undefined && sectors.length === 1
    ? `S${String(sectors[0])}`
    : "common";
};

const bucketCount = new Map<string, number>();
for (const event of ALL_EVENTS) {
  const bucket = eventBucket(event);
  bucketCount.set(bucket, (bucketCount.get(bucket) ?? 0) + 1);
}
for (const [bucket, want] of Object.entries(SECTOR_TARGET)) {
  const got = bucketCount.get(bucket) ?? 0;
  if (got < want)
    errors.push(
      `events: ${bucket} holds ${String(got)} scenes, target ${String(want)}`,
    );
}

const threeOptionEvents = ALL_EVENTS.filter((e) => e.options.length >= 3).length;
const threePct = (threeOptionEvents / Math.max(1, ALL_EVENTS.length)) * 100;
if (threePct < THREE_OPTION_PCT)
  errors.push(
    `events: ${threePct.toFixed(1)}% offer three or more options, target ${String(THREE_OPTION_PCT)}%`,
  );

const weightedEvents = ALL_EVENTS.filter((e) =>
  e.options.some(
    (o) =>
      (o.outcomes ?? []).length > 1 ||
      (o.onPass ?? []).length > 1 ||
      (o.onFail ?? []).length > 1,
  ),
).length;
if (weightedEvents < WEIGHTED_TARGET)
  errors.push(
    `events: ${String(weightedEvents)} carry a weighted fork, target ${String(WEIGHTED_TARGET)}`,
  );

const vending = ALL_EVENTS.filter((event) => {
  if (event.requires?.flags !== undefined) return false;
  if (event.codex !== undefined) return false;
  return !event.options.some((option) => {
    if (option.check !== undefined) return true;
    if (option.requires?.req === "flag" || option.requires?.req === "axis")
      return true;
    return [
      ...(option.outcomes ?? []),
      ...(option.onPass ?? []),
      ...(option.onFail ?? []),
    ].some(
      (outcome) =>
        outcome.consequence !== undefined ||
        outcome.follow !== undefined ||
        outcome.codex !== undefined ||
        outcome.effects.some((eff) => eff.k === "flag"),
    );
  });
});
for (const event of vending)
  errors.push(`events: "${event.id}" is a vending machine — it leaves no trace`);

const settableFlags = new Set<string>();
for (const event of ALL_EVENTS) {
  for (const option of event.options) {
    for (const outcome of [
      ...(option.outcomes ?? []),
      ...(option.onPass ?? []),
      ...(option.onFail ?? []),
    ]) {
      for (const eff of outcome.effects) {
        if (eff.k === "flag") settableFlags.add(eff.key);
      }
      for (const [key] of outcome.follow?.setFlags ?? []) settableFlags.add(key);
    }
  }
}
for (const key of RUNTIME_FLAGS) settableFlags.add(key);
for (const event of ALL_EVENTS) {
  for (const key of event.requires?.flags?.all ?? []) {
    if (!settableFlags.has(key))
      errors.push(`events: "${event.id}" requires flag "${key}" that nothing sets`);
  }
  for (const key of event.requires?.flags?.any ?? []) {
    if (!settableFlags.has(key))
      errors.push(`events: "${event.id}" requires flag "${key}" that nothing sets`);
  }
}

for (const flag of deadFlags()) {
  errors.push(
    `flags: "${flag.key}" is written by ${flag.owners.join(", ")} and read by nothing`,
  );
}
for (const flag of unwritableFlags()) {
  errors.push(
    `flags: "${flag.key}" is read by ${flag.owners.join(", ")} but nothing sets it`,
  );
}

const CLEAR_GATES = 10;
const CLEAR_BEACONS = 5;
const CLEAR_ELITES = 5;
const ONE_CLEAR_FLOOR = 12;

expectCount("memories", MEMORIES.length, MEMORY_TOTAL, "fragments");

const afterOneClear = earnedMemoryOrders({
  gateKills: CLEAR_GATES,
  lifetimeElites: CLEAR_ELITES,
  beaconsResolved: CLEAR_BEACONS,
});
const afterTwoClears = earnedMemoryOrders({
  gateKills: CLEAR_GATES,
  lifetimeElites: CLEAR_ELITES * 2,
  beaconsResolved: CLEAR_BEACONS,
});
if (afterOneClear.length < ONE_CLEAR_FLOOR)
  errors.push(
    `memories: one clear reaches ${String(afterOneClear.length)} fragments, floor ${String(ONE_CLEAR_FLOOR)}`,
  );
const unreachable = NUMBERED_MEMORIES.filter(
  (m) => !afterTwoClears.includes(m.order),
);
if (unreachable.length > 0)
  errors.push(
    `memories: ${unreachable.map((m) => m.codexId).join(" ")} unreachable in two standard clears`,
  );
for (const id of MEMORY_CODEX_IDS) {
  if (!CODEX_BY_ID.has(id))
    errors.push(`memories: "${id}" has no Codex entry`);
}

const CHAIN_TARGET = 4;
const CHAIN_MIN_STEPS = 3;
const eventById = new Map(ALL_EVENTS.map((e) => [e.id, e]));
expectCount("chains", CHAINS.length, CHAIN_TARGET, "NPC chains");
for (const chain of CHAINS) {
  checkLocKey(`chain.${chain.id}`, chain.name);
  checkLocKey(`chain.${chain.id}`, chain.payoff);
  checkLocKey(`chain.${chain.id}`, chain.betrayalLine);
  if (chain.steps.length < CHAIN_MIN_STEPS)
    errors.push(
      `chains: "${chain.id}" has ${String(chain.steps.length)} steps, floor ${String(CHAIN_MIN_STEPS)}`,
    );
  if (chain.betrayal.length === 0)
    errors.push(`chains: "${chain.id}" has no betrayal branch`);
  let hasPayoff = false;
  for (const step of chain.steps) {
    checkLocKey(`chain.${chain.id}.${step.id}`, step.hint);
    if (step.done.length === 0)
      errors.push(`chains: "${chain.id}.${step.id}" can never resolve`);
    for (const key of step.done) {
      if (!settableFlags.has(key))
        errors.push(
          `chains: "${chain.id}.${step.id}" waits on flag "${key}" that nothing sets`,
        );
    }
    for (const eventId of step.events) {
      const def = eventById.get(eventId);
      if (def === undefined) {
        errors.push(`chains: "${chain.id}.${step.id}" names unknown event "${eventId}"`);
        continue;
      }
      const sectors = def.requires?.sector;
      if (sectors !== undefined && !step.sector.some((n) => sectors.includes(n)))
        errors.push(
          `chains: "${chain.id}.${step.id}" can never fire — event "${eventId}" lives in sectors ${sectors.join("/")}`,
        );
      if (def.options.some((o) => o.outcomes !== undefined || o.check !== undefined))
        hasPayoff = true;
    }
  }
  if (!hasPayoff)
    errors.push(`chains: "${chain.id}" has no step that pays anything out`);
}

const EPILOGUE_TARGET = 30;
if (EPILOGUE_ENTRIES.length < EPILOGUE_TARGET)
  errors.push(
    `epilogue: expected at least ${String(EPILOGUE_TARGET)} entries, found ${String(EPILOGUE_ENTRIES.length)}`,
  );
for (const entry of EPILOGUE_ENTRIES) checkLocKey(`epilogue.${entry.id}`, entry.text);
for (const line of DEATH_LINES) checkLocKey(`death.${line.id}`, line.text);
const BLACK_BOX_TARGET = 6;
if (BLACK_BOX_EPITAPHS.length < BLACK_BOX_TARGET)
  errors.push(
    `blackbox: expected at least ${String(BLACK_BOX_TARGET)} epitaphs, found ${String(BLACK_BOX_EPITAPHS.length)}`,
  );
if (BLACK_BOX_EPITAPHS[BLACK_BOX_EPITAPHS.length - 1]?.id !== "quiet")
  errors.push("blackbox: the last epitaph must be the unconditional fallback");
for (const line of BLACK_BOX_EPITAPHS)
  checkLocKey(`blackbox.${line.id}`, line.text);
for (const ending of ENDINGS) {
  for (const beat of ending.beats) checkLocKey(`ending.${ending.id}`, beat);
  for (const beat of ending.deepBeats ?? [])
    checkLocKey(`ending.${ending.id}.deep`, beat);
  for (const v of ending.variants ?? []) checkLocKey(`ending.${v.id}`, v.text);
}
for (const def of SECTORS) checkLocKey(`sectors.${String(def.id)}`, def.name);

for (const entry of CODEX) {
  checkLocKey(`codex.${entry.id}`, entry.title);
  checkLocKey(`codex.${entry.id}`, entry.body);
}

const survivesEnemyTurn = (goal: PuzzleGoal): boolean => {
  const inner = goal.g === "deduction" ? goal.inner : goal;
  return inner.g === "survive" || inner.g === "survivePlus";
};

for (const puzzle of PUZZLES) {
  checkLocKey(`puzzle.${puzzle.id}`, puzzle.title);
  checkLocKey(`puzzle.${puzzle.id}`, puzzle.goalText);
  for (const defId of puzzle.deck) {
    if (!dieIdSet.has(defId))
      errors.push(`puzzles: "${puzzle.id}" uses unknown die "${defId}"`);
  }
  if (puzzle.tier === 5 && puzzle.uniqueDie === undefined)
    errors.push(`puzzles: "${puzzle.id}" is T5 and owes a unique die reward`);
  if (puzzle.tier !== 5 && puzzle.uniqueDie !== undefined)
    errors.push(
      `puzzles: "${puzzle.id}" is T${String(puzzle.tier)} and cannot carry a unique die`,
    );
  if (puzzle.uniqueDie !== undefined && !dieIdSet.has(puzzle.uniqueDie))
    errors.push(
      `puzzles: "${puzzle.id}" rewards unknown die "${puzzle.uniqueDie}"`,
    );
  if (puzzle.locks !== undefined && puzzle.goal.g !== "multiTurn")
    errors.push(
      `puzzles: "${puzzle.id}" locks dice but has no turn 2 to release them on`,
    );
  if (puzzle.locks !== undefined && puzzle.locks >= puzzle.deck.length)
    errors.push(`puzzles: "${puzzle.id}" locks its whole deck out of turn 1`);
  if (survivesEnemyTurn(puzzle.goal) && puzzle.slots.includes("engines"))
    errors.push(
      `puzzles: "${puzzle.id}" survives an enemy turn and may not offer the engines slot — evasion is a roll`,
    );
  if (puzzle.goal.g === "deduction") {
    if (puzzle.fixedRoll === undefined)
      errors.push(`puzzles: "${puzzle.id}" is a deduction puzzle without a fixedRoll`);
    if (puzzle.rerolls !== 0)
      errors.push(`puzzles: "${puzzle.id}" is a deduction puzzle with rerolls`);
  }
  if (puzzle.fixedRoll !== undefined) {
    if (puzzle.fixedRoll.length !== puzzle.deck.length)
      errors.push(
        `puzzles: "${puzzle.id}" fixedRoll has ${String(puzzle.fixedRoll.length)} faces for ${String(puzzle.deck.length)} dice`,
      );
    puzzle.fixedRoll.forEach((face, index) => {
      const defId = puzzle.deck[index];
      if (defId === undefined) return;
      const faces = resolveFaces(defId, DIE_BY_ID.get(defId)?.tier ?? 6);
      if (!faces.includes(face))
        errors.push(
          `puzzles: "${puzzle.id}" fixedRoll reads ${String(face)} on "${defId}", which cannot show it`,
        );
    });
  }
  try {
    for (const issue of calibrationIssues(puzzle)) {
      errors.push(`puzzles: "${issue.id}" ${issue.problem}`);
    }
  } catch (error) {
    errors.push(
      `puzzles: "${puzzle.id}" ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

if (!CODEX_BY_ID.has(PUZZLE_CODEX))
  errors.push(`puzzles: the tier reward table names unknown codex "${PUZZLE_CODEX}"`);
for (const puzzle of PUZZLES) {
  const reward = rewardFor(puzzle, createStream(1));
  if (reward.die !== undefined && !dieIdSet.has(reward.die))
    errors.push(`puzzles: "${puzzle.id}" rewards unknown die "${reward.die}"`);
  if (reward.choice !== undefined && !dieIdSet.has(reward.choice.die))
    errors.push(
      `puzzles: "${puzzle.id}" offers unknown die "${reward.choice.die}"`,
    );
}

const PUZZLE_COUNT = 60;
if (PUZZLES.length !== PUZZLE_COUNT)
  errors.push(
    `puzzles: expected exactly ${String(PUZZLE_COUNT)} puzzles, found ${String(PUZZLES.length)}`,
  );

const PUZZLE_MATRIX: Readonly<Record<string, readonly number[]>> = {
  exact: [2, 3, 3, 2, 0],
  constraint: [3, 4, 5, 2, 1],
  order: [1, 3, 4, 2, 1],
  multiTurn: [0, 2, 4, 3, 1],
  deduction: [1, 2, 2, 2, 1],
  survivePlus: [1, 1, 2, 1, 1],
};

const puzzleCells = new Map<string, number>();
for (const puzzle of PUZZLES) {
  const key = `${puzzle.goal.g}:${String(puzzle.tier)}`;
  puzzleCells.set(key, (puzzleCells.get(key) ?? 0) + 1);
}
for (const [arch, row] of Object.entries(PUZZLE_MATRIX)) {
  row.forEach((want, index) => {
    const tier = index + 1;
    const got = puzzleCells.get(`${arch}:${String(tier)}`) ?? 0;
    if (got !== want)
      errors.push(
        `puzzles: the ${arch} × T${String(tier)} cell holds ${String(got)} puzzles, not ${String(want)}`,
      );
  });
}
for (const arch of new Set(PUZZLES.map((p) => p.goal.g))) {
  if (PUZZLE_MATRIX[arch] === undefined)
    errors.push(`puzzles: archetype "${arch}" is authored but absent from the matrix`);
}

const PUZZLE_BELL: readonly number[] = [8, 15, 20, 12, 5];
PUZZLE_BELL.forEach((want, index) => {
  const tier = index + 1;
  const got = PUZZLES.filter((p) => p.tier === tier).length;
  if (got !== want)
    errors.push(
      `puzzles: the bell wants ${String(want)} at T${String(tier)}, found ${String(got)}`,
    );
});

const BARK_MIN_LINES = 3;
const BARK_SINGLETON_WHITELIST: ReadonlySet<string> = new Set<string>();

let barkLines = 0;
const barkByQuota = new Map<string, number>();
const barkTriggers = new Set<string>();
const referencedBarkKeys = new Set<string>();
for (const bark of BARKS) {
  if (
    bark.lines.length < BARK_MIN_LINES &&
    !BARK_SINGLETON_WHITELIST.has(bark.id)
  ) {
    errors.push(
      `barks: "${bark.id}" has ${String(bark.lines.length)} lines, under the ${String(BARK_MIN_LINES)}-line floor and not on the singleton whitelist`,
    );
  }
  barkTriggers.add(bark.trigger);
  for (const line of bark.lines) referencedBarkKeys.add(line);
  for (const line of bark.lines) checkLocKey(`bark.${bark.id}`, line);
  barkLines += bark.lines.length;
  const quotaKey = bark.trigger.startsWith("firstKill:")
    ? "firstKill"
    : bark.trigger.startsWith("sectorEnter:")
      ? "sectorEnter"
      : bark.trigger;
  barkByQuota.set(
    quotaKey,
    (barkByQuota.get(quotaKey) ?? 0) + bark.lines.length,
  );
}
for (const [trigger, quota] of Object.entries(BARK_QUOTA)) {
  const have = barkByQuota.get(trigger) ?? 0;
  if (have !== quota)
    errors.push(
      `barks: trigger "${trigger}" has ${String(have)} lines, quota ${String(quota)}`,
    );
}
for (const quotaKey of barkByQuota.keys()) {
  if (BARK_QUOTA[quotaKey] === undefined)
    errors.push(`barks: trigger "${quotaKey}" ships lines with no quota row`);
}

const emitterSources: string[] = [];
const walkSources = (dir: string): void => {
  for (const entry of readdirSync(dir)) {
    const child = join(dir, entry);
    if (statSync(child).isDirectory()) walkSources(child);
    else if (/\.tsx?$/.test(child) && !/\.test\.tsx?$/.test(child))
      emitterSources.push(child);
  }
};
walkSources(join("src"));

const CALL = "emitBark(";
const argumentTextAt = (text: string, start: number): string => {
  let depth = 0;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "(") depth += 1;
    if (ch === ")") {
      depth -= 1;
      if (depth === 0) return text.slice(start + CALL.length, i);
    }
  }
  return "";
};

const emittedTriggers = new Set<string>();
const emittedPrefixes = new Set<string>();
for (const file of emitterSources) {
  const text = readFileSync(file, "utf8");
  let at = text.indexOf(CALL);
  while (at !== -1) {
    const args = argumentTextAt(text, at);
    for (const m of args.matchAll(/["']([A-Za-z0-9_:]+)["']/g))
      emittedTriggers.add(m[1] ?? "");
    for (const m of args.matchAll(/`([A-Za-z0-9_:]*)\$\{/g))
      emittedPrefixes.add(m[1] ?? "");
    at = text.indexOf(CALL, at + 1);
  }
}
const emitted = (trigger: string): boolean =>
  emittedTriggers.has(trigger) ||
  [...emittedPrefixes].some(
    (prefix) => prefix !== "" && trigger.startsWith(prefix),
  );
for (const bark of BARKS) {
  if (!emitted(bark.trigger))
    errors.push(
      `barks: trigger "${bark.trigger}" ships ${String(bark.lines.length)} lines and no emitBark call site reaches it`,
    );
}

const reservedTriggers = new Set<string>();
for (const reservation of BARK_RESERVATIONS) {
  if (reservedTriggers.has(reservation.trigger))
    errors.push(`barks: duplicate reservation "${reservation.trigger}"`);
  reservedTriggers.add(reservation.trigger);
  if (reservation.lines < BARK_MIN_LINES)
    errors.push(
      `barks: reservation "${reservation.trigger}" promises ${String(reservation.lines)} lines, under the ${String(BARK_MIN_LINES)}-line floor`,
    );
  if (barkTriggers.has(reservation.trigger) || BARK_QUOTA[reservation.trigger] !== undefined)
    errors.push(
      `barks: reservation "${reservation.trigger}" is filled — drop it from BARK_RESERVATIONS now that ${reservation.phase} authored it`,
    );
}

const MODULE_TOTAL = 60;
const ENGRAVING_TOTAL = 50;
const FRAGMENT_TOTAL = 120;
const GATED_FRAGMENT_TARGET = 15;
const KEEPER_TOTAL = 92;
const KEEPER_REACTIVE_TARGET = 30;
const DICE_TOTAL = 94;
const DOSSIER_TOTAL = 103;

checkUniqueIds("modules", ALL_MODULES.map((m) => m.id));
checkUniqueIds("engravings", ENGRAVINGS.map((e) => e.id));
checkUniqueIds("keeperLines", KEEPER_LINES.map((k) => k.id));
checkUniqueIds("fragments", FRAGMENTS.map((f) => f.id));

expectCount("modules", ALL_MODULES.length, MODULE_TOTAL);
expectCount("engravings", ENGRAVINGS.length, ENGRAVING_TOTAL);
expectCount("fragments", FRAGMENTS.length, FRAGMENT_TOTAL);
if (GATED_FRAGMENTS.length < GATED_FRAGMENT_TARGET)
  errors.push(
    `fragments: ${String(GATED_FRAGMENTS.length)} are state-gated, target ${String(GATED_FRAGMENT_TARGET)}`,
  );
for (const frag of GATED_FRAGMENTS) {
  const query = frag.requires;
  for (const key of [...(query?.all ?? []), ...(query?.any ?? []), ...(query?.not ?? [])]) {
    if (!settableFlags.has(key))
      errors.push(`fragments: "${frag.id}" waits on flag "${key}" that nothing sets`);
  }
}
expectCount("keeperLines", KEEPER_LINES.length, KEEPER_TOTAL);
if (REACTIVE_KEEPER_LINES.length < KEEPER_REACTIVE_TARGET)
  errors.push(
    `keeperLines: ${String(REACTIVE_KEEPER_LINES.length)} react to a flag, target ${String(KEEPER_REACTIVE_TARGET)}`,
  );
for (const keeperLine of REACTIVE_KEEPER_LINES) {
  const query = keeperLine.requires;
  for (const key of [...(query?.all ?? []), ...(query?.any ?? []), ...(query?.not ?? [])]) {
    if (!settableFlags.has(key))
      errors.push(
        `keeperLines: "${keeperLine.id}" waits on flag "${key}" that nothing sets`,
      );
  }
}
expectCount("dice", ALL_DICE.length, DICE_TOTAL);

for (const def of ALL_MODULES) {
  checkLocKey(`modules.${def.id}`, def.name);
  checkLocKey(`modules.${def.id}`, def.desc);
  checkEffects(`modules.${def.id}`, def.effects);
  if (
    def.effects === undefined &&
    def.mods === undefined &&
    def.traits === undefined
  ) {
    errors.push(`modules: "${def.id}" is a no-op`);
  }
  if (def.rarity !== "legendary" && (def.price < 40 || def.price > 90)) {
    errors.push(
      `modules: "${def.id}" price ${String(def.price)} is outside the §9.3 band 40-90`,
    );
  }
  for (const tag of moduleTags(def)) {
    checkTag(`modules.${def.id}`, tag);
    carriedTags.add(tag);
  }
}

for (const def of ENGRAVINGS) {
  checkLocKey(`engravings.${def.id}`, def.name);
  checkLocKey(`engravings.${def.id}`, def.desc);
  checkEffects(`engravings.${def.id}`, def.effects, "die");
  if (def.effects === undefined && def.grant === undefined) {
    errors.push(`engravings: "${def.id}" is a no-op`);
  }
  for (const tag of def.tags ?? []) {
    checkTag(`engravings.${def.id}`, tag);
    carriedTags.add(tag);
  }
}

for (const def of FATE_TABLE) {
  checkLocKey(`fate.${def.id}`, def.text);
  if (def.do.length === 0) errors.push(`fate: "${def.id}" has no actions`);
  walkActions(def.do);
}
const fateCovered = new Set<number>();
for (const band of FATE_TABLE) {
  for (let n = band.min; n <= band.max; n += 1) {
    if (fateCovered.has(n)) errors.push(`fate: roll ${String(n)} is covered twice`);
    fateCovered.add(n);
  }
}
for (let n = 1; n <= 100; n += 1) {
  if (!fateCovered.has(n)) errors.push(`fate: roll ${String(n)} has no outcome`);
}

checkUniqueIds(
  "systemsCheck",
  SYSTEMS_CHECK.map((step) => step.id),
);
const CHECK_UIDS = new Set(
  CHECK_DECK.map((_, index) => `die-${String(index)}`),
);
const WANDERER_SLOTS = new Set(
  Object.keys(SHIPS.find((ship) => ship.id === "wanderer")?.slots ?? {}),
);
for (const step of SYSTEMS_CHECK) {
  checkLocKey(`check.${step.id}`, step.sayKey);
  if (step.failKey !== null) checkLocKey(`check.${step.id}`, step.failKey);
  if (step.moves === null) continue;
  if (step.moves.length === 0)
    errors.push(`systemsCheck ${step.id}: empty move list`);
  const seenSlots = new Set<string>();
  const seenDice = new Set<string>();
  for (const mv of step.moves) {
    if (!CHECK_UIDS.has(mv.uid))
      errors.push(`systemsCheck ${step.id}: no die "${mv.uid}" in the check deck`);
    if (!WANDERER_SLOTS.has(mv.slot))
      errors.push(`systemsCheck ${step.id}: the wanderer has no slot "${mv.slot}"`);
    if (seenSlots.has(mv.slot))
      errors.push(`systemsCheck ${step.id}: slot "${mv.slot}" is claimed twice`);
    if (seenDice.has(mv.uid))
      errors.push(`systemsCheck ${step.id}: die "${mv.uid}" is placed twice`);
    seenSlots.add(mv.slot);
    seenDice.add(mv.uid);
  }
  if (step.fixedRoll !== null && step.fixedRoll.length !== CHECK_DECK.length)
    errors.push(`systemsCheck ${step.id}: fixed roll does not cover the deck`);
}
for (const beat of PROLOGUE_BEATS) {
  checkLocKey(`prologue.${beat.id}`, beat.cta);
  for (const line of beat.lines) checkLocKey(`prologue.${beat.id}`, line.text);
}

for (const f of FRAGMENTS) checkLocKey(`fragment.${f.id}`, f.text);
for (const k of KEEPER_LINES) checkLocKey(`keeper.${k.id}`, k.text);

expectCount("ascension", ASCENSIONS.length, MAX_ASCENSION, "levels");
for (const def of ASCENSIONS) {
  checkLocKey(`ascension.${String(def.level)}`, def.name);
  checkLocKey(`ascension.${String(def.level)}`, def.desc);
  if (Object.keys(def.mods).length === 0)
    errors.push(`ascension: A${String(def.level)} is a no-op`);
}

const dossierCount = CODEX.filter((e) => e.group === "dossier").length;
expectCount("codex", dossierCount, DOSSIER_TOTAL, "dossiers");

const MUTATOR_COUNT = 12;
const CONTRACT_COUNT = 20;
const MUTATOR_MOD_KEYS = new Set(Object.keys(ZERO_MUTATOR_MODS));

checkUniqueIds(
  "mutators",
  MUTATORS.map((m) => m.id),
);
if (MUTATORS.length !== MUTATOR_COUNT) {
  errors.push(
    `mutators: expected exactly ${String(MUTATOR_COUNT)}, found ${String(MUTATORS.length)}`,
  );
}
for (const def of MUTATORS) {
  checkLocKey(`mutators.${def.id}`, def.name);
  checkLocKey(`mutators.${def.id}`, def.desc);
  checkEffects(`mutators.${def.id}`, def.effects);
  const keys = Object.keys(def.mods);
  if (keys.length === 0 && def.effects === undefined) {
    errors.push(`mutators: "${def.id}" is a no-op (no mods, no effects)`);
  }
  for (const key of keys) {
    if (!MUTATOR_MOD_KEYS.has(key)) {
      errors.push(`mutators: "${def.id}" sets unknown mod "${key}"`);
    }
  }
}

const WEATHER_COUNT = 8;
const WEATHER_FIRST_SECTOR = 2;
const WEATHER_POOL_MIN = 4;
const WEATHER_APPEARANCES_MIN = 2;

checkUniqueIds(
  "weather",
  WEATHER.map((def) => def.id),
);
if (WEATHER.length !== WEATHER_COUNT) {
  errors.push(
    `weather: expected exactly ${String(WEATHER_COUNT)}, found ${String(WEATHER.length)}`,
  );
}
for (const def of WEATHER) {
  checkLocKey(`weather.${def.id}`, def.name);
  checkLocKey(`weather.${def.id}`, def.desc);
  checkLocKey(`weather.${def.id}`, def.line);
  const keys = Object.keys(def.mods);
  if (keys.length === 0) {
    errors.push(`weather: "${def.id}" is a no-op (no mods)`);
  }
  for (const key of keys) {
    if (!MUTATOR_MOD_KEYS.has(key)) {
      errors.push(`weather: "${def.id}" sets unknown mod "${key}"`);
    }
  }
  if (MUTATOR_BY_ID.has(def.id)) {
    errors.push(`weather: "${def.id}" collides with a mutator id`);
  }
  const desc = stringAt(content, def.desc.replace("content:", ""));
  if (desc !== undefined && !/\d/.test(desc)) {
    errors.push(`weather: "${def.id}" desc states no number`);
  }
  const appearances = Object.values(WEATHER_POOLS).filter((pool) =>
    pool.some((entry) => entry.id === def.id),
  ).length;
  if (appearances < WEATHER_APPEARANCES_MIN) {
    errors.push(
      `weather: "${def.id}" appears in ${String(appearances)} sector pool(s), need ${String(WEATHER_APPEARANCES_MIN)}`,
    );
  }
}
for (const sector of SECTORS.map((def) => def.id)) {
  const pool = weatherPoolFor(sector);
  if (sector < WEATHER_FIRST_SECTOR) {
    if (pool.length > 0) {
      errors.push(`weather: sector ${String(sector)} must have no pool`);
    }
    continue;
  }
  if (pool.length < WEATHER_POOL_MIN) {
    errors.push(
      `weather: sector ${String(sector)} pool has ${String(pool.length)} entries, need ${String(WEATHER_POOL_MIN)}`,
    );
  }
  const seen = new Set<string>();
  for (const entry of pool) {
    if (!WEATHER_BY_ID.has(entry.id)) {
      errors.push(
        `weather: sector ${String(sector)} pool names unknown condition "${entry.id}"`,
      );
    }
    if (seen.has(entry.id)) {
      errors.push(
        `weather: sector ${String(sector)} pool repeats "${entry.id}"`,
      );
    }
    seen.add(entry.id);
    if (entry.weight <= 0) {
      errors.push(
        `weather: sector ${String(sector)} weights "${entry.id}" at ${String(entry.weight)}`,
      );
    }
  }
}

const SALVAGE_FACE_MIN = SALVAGE_OFFER_SIZE + 1;

checkUniqueIds(
  "salvage",
  SALVAGE_FACES.map((face) => face.id),
);
if (SALVAGE_FACES.length < SALVAGE_FACE_MIN) {
  errors.push(
    `salvage: ${String(SALVAGE_FACES.length)} faces cannot fill an offer of ${String(SALVAGE_OFFER_SIZE)} with anything left out`,
  );
}
for (const face of SALVAGE_FACES) {
  checkLocKey(`salvage.${face.id}`, face.name);
  checkLocKey(`salvage.${face.id}`, face.desc);
  checkLocKey(`salvage.${face.id}`, face.line);
  if (face.weight <= 0) {
    errors.push(`salvage: "${face.id}" weighs ${String(face.weight)}`);
  }
  if (face.effects.length === 0) {
    errors.push(`salvage: "${face.id}" is a no-op (no effects)`);
  }
  const desc = stringAt(content, face.desc.replace("content:", ""));
  if (desc !== undefined && !/\d/.test(desc)) {
    errors.push(`salvage: "${face.id}" desc states no number`);
  }
}

const goalKey = (spec: GoalSpec): string =>
  "n" in spec
    ? `${spec.g}:${String(spec.n)}`
    : spec.g === "depthWithDeckAtLeast"
      ? `${spec.g}:${String(spec.depth)}:${String(spec.deck)}`
      : spec.g;

checkUniqueIds(
  "contracts",
  CONTRACTS.map((c) => c.id),
);
if (CONTRACTS.length !== CONTRACT_COUNT) {
  errors.push(
    `contracts: expected exactly ${String(CONTRACT_COUNT)}, found ${String(CONTRACTS.length)}`,
  );
}
const shipIds = new Set(SHIPS.map((s) => s.id));
for (const def of CONTRACTS) {
  checkLocKey(`contracts.${def.id}`, def.name);
  checkLocKey(`contracts.${def.id}`, def.desc);
  if (def.goals.length !== CONTRACT_STAR_COUNT) {
    errors.push(
      `contracts: "${def.id}" has ${String(def.goals.length)} goals, expected ${String(CONTRACT_STAR_COUNT)}`,
    );
  }
  const seenGoals = new Set<string>();
  for (const spec of def.goals) {
    const key = goalKey(spec);
    if (seenGoals.has(key)) {
      errors.push(`contracts: "${def.id}" repeats goal "${key}"`);
    }
    seenGoals.add(key);
    if (!resolveMetaKey(`goal.${spec.g}`)) {
      errors.push(`contracts: "${def.id}" goal "${spec.g}" has no meta label`);
    }
  }
  const setup = def.setup;
  if (setup.ship !== undefined && !shipIds.has(setup.ship)) {
    errors.push(`contracts: "${def.id}" uses unknown ship "${setup.ship}"`);
  }
  for (const id of setup.mutators ?? []) {
    if (!MUTATOR_BY_ID.has(id)) {
      errors.push(`contracts: "${def.id}" uses unknown mutator "${id}"`);
    }
  }
  for (const defId of setup.deckPreset ?? []) {
    if (!dieIdSet.has(defId)) {
      errors.push(`contracts: "${def.id}" preset uses unknown die "${defId}"`);
    }
  }
  if (
    setup.deckPreset !== undefined &&
    (setup.deckPreset.length < 3 || setup.deckPreset.length > 9)
  ) {
    errors.push(
      `contracts: "${def.id}" preset has ${String(setup.deckPreset.length)} dice, must be 3-9`,
    );
  }
  if (setup.sector !== undefined && (setup.sector < 1 || setup.sector > 5)) {
    errors.push(`contracts: "${def.id}" sector ${String(setup.sector)} is out of range`);
  }
}

const ACHIEVEMENT_COUNT = 96;
const ACHIEVEMENT_GATES = 8;
const ACHIEVEMENT_FLAG_READERS = 6;
const ACHIEVEMENT_FAMILY_TARGET = 20;
const ACHIEVEMENT_LOCALES = ["en", "uk", "ru", "de", "es", "fr", "pl"] as const;

checkUniqueIds(
  "achievements",
  ACHIEVEMENTS.map((a) => a.id),
);
if (ACHIEVEMENTS.length !== ACHIEVEMENT_COUNT) {
  errors.push(
    `achievements: expected exactly ${String(ACHIEVEMENT_COUNT)}, found ${String(ACHIEVEMENTS.length)}`,
  );
}
if (ACHIEVEMENT_FAMILIES.length < ACHIEVEMENT_FAMILY_TARGET) {
  errors.push(
    `achievements: only ${String(ACHIEVEMENT_FAMILIES.length)} families, need ${String(ACHIEVEMENT_FAMILY_TARGET)}`,
  );
}
const rowMembers = ACHIEVEMENT_ROWS.flatMap((row) =>
  row.kind === "family" ? row.tiers.map((tier) => tier.id) : [row.def.id],
);
if (rowMembers.length !== ACHIEVEMENTS.length) {
  errors.push(
    `achievements: rows cover ${String(rowMembers.length)} of ${String(ACHIEVEMENTS.length)} definitions`,
  );
}
const gatingAchievements = ACHIEVEMENTS.filter(
  (def) => def.reward?.unlockId !== undefined,
);
if (gatingAchievements.length < ACHIEVEMENT_GATES) {
  errors.push(
    `achievements: only ${String(gatingAchievements.length)} gate content, need ${String(ACHIEVEMENT_GATES)}`,
  );
}
const flagAchievements = ACHIEVEMENTS.filter((def) => def.cond.c === "flags");
if (flagAchievements.length < ACHIEVEMENT_FLAG_READERS) {
  errors.push(
    `achievements: only ${String(flagAchievements.length)} read flagsArchive, need ${String(ACHIEVEMENT_FLAG_READERS)}`,
  );
}
const localeMeta = new Map<string, ContentNode>();
for (const locale of ACHIEVEMENT_LOCALES) {
  const path = join(process.cwd(), "src", "i18n", locale, "meta.json");
  if (!existsSync(path)) {
    errors.push(`achievements: locale "${locale}" has no meta.json`);
    continue;
  }
  try {
    localeMeta.set(locale, JSON.parse(readFileSync(path, "utf8")) as ContentNode);
  } catch {
    errors.push(`achievements: locale "${locale}" meta.json is not valid JSON`);
  }
}
const checkAchievementText = (owner: string, name: string, desc: string): void => {
  for (const [locale, root] of localeMeta) {
    if (!resolveIn(root, name.replace("meta:", "")))
      errors.push(`achievements: "${owner}" has no ${locale} name`);
    if (!resolveIn(root, desc.replace("meta:", "")))
      errors.push(`achievements: "${owner}" has no ${locale} desc`);
  }
};
for (const family of ACHIEVEMENT_FAMILIES) {
  checkAchievementText(family.id, family.name, family.desc);
  if (family.tiers.length < 2)
    errors.push(`achievements: family "${family.id}" needs at least two tiers`);
  let lastNeed = -Infinity;
  let lastShards = -Infinity;
  family.tiers.forEach((tier, index) => {
    const last = index === family.tiers.length - 1;
    if (tier.need <= lastNeed) {
      errors.push(
        `achievements: family "${family.id}" tier ${String(index + 1)} does not raise the bar`,
      );
    }
    if (tier.shards < lastShards) {
      errors.push(
        `achievements: family "${family.id}" tier ${String(index + 1)} pays less than the tier below`,
      );
    }
    lastNeed = tier.need;
    lastShards = tier.shards;
    if (tier.legendary === true && !last) {
      errors.push(
        `achievements: family "${family.id}" marks a non-final tier legendary`,
      );
    }
    if (tier.voucher !== undefined && tier.legendary !== true) {
      errors.push(
        `achievements: family "${family.id}" tier ${String(index + 1)} pays a voucher without a legendary tier`,
      );
    }
    if (tier.voucher !== undefined && (tier.altShards ?? 0) <= 0) {
      errors.push(
        `achievements: family "${family.id}" offers a voucher with no shard alternative`,
      );
    }
  });
  const enRoot = localeMeta.get("en");
  const enDesc =
    enRoot === undefined
      ? undefined
      : stringAt(enRoot, family.desc.replace("meta:", ""));
  if (enDesc !== undefined && !enDesc.includes("{{n}}")) {
    errors.push(
      `achievements: family "${family.id}" desc never states its tier target`,
    );
  }
}
for (const single of SINGLE_ACHIEVEMENTS) {
  checkAchievementText(single.id, single.name, single.desc);
  if (single.reward?.voucher !== undefined) {
    errors.push(`achievements: single "${single.id}" pays a voucher`);
  }
}
for (const [oldId, newId] of Object.entries(ACHIEVEMENT_ALIASES)) {
  if (!ACHIEVEMENT_BY_ID.has(newId)) {
    errors.push(`achievements: alias "${oldId}" points at unknown "${newId}"`);
  }
  if (ACHIEVEMENT_BY_ID.has(oldId)) {
    errors.push(`achievements: alias "${oldId}" shadows a live achievement`);
  }
}
for (const def of ACHIEVEMENTS) {
  const reward = def.reward;
  if (reward?.unlockId !== undefined && !UNLOCK_BY_ID.has(reward.unlockId)) {
    errors.push(
      `achievements: "${def.id}" rewards unknown unlock "${reward.unlockId}"`,
    );
  }
  if (reward?.badge !== undefined && !BADGE_BY_ID.has(reward.badge)) {
    errors.push(`achievements: "${def.id}" rewards unknown badge "${reward.badge}"`);
  }
  if (
    reward !== undefined &&
    reward.shards === undefined &&
    reward.unlockId === undefined &&
    reward.badge === undefined
  ) {
    errors.push(`achievements: "${def.id}" declares an empty reward`);
  }
  if (reward?.voucher !== undefined && def.legendary !== true) {
    errors.push(`achievements: "${def.id}" pays a voucher without legendary rank`);
  }
}
for (const group of ACHIEVEMENT_GROUPS) {
  if (!resolveMetaKey(`profile.group.${group}`))
    errors.push(`achievements: group "${group}" has no en label`);
  if (!ACHIEVEMENTS.some((def) => def.group === group))
    errors.push(`achievements: group "${group}" is empty`);
}

const GRINDY_RUN_CONDS = new Set(["runStatAtLeast"]);
for (const def of ACHIEVEMENTS) {
  if (GRINDY_RUN_CONDS.has(def.cond.c))
    errors.push(`achievements: "${def.id}" asks for repetition without a decision`);
}

const unlockIds = new Set(UNLOCKS.map((def) => def.id));
if (unlockIds.size !== UNLOCKS.length)
  errors.push("unlocks: duplicate unlock id");
const wavedDice = UNLOCKS.flatMap((def) => def.dice ?? []);
if (new Set(wavedDice).size !== wavedDice.length)
  errors.push("unlocks: a die appears in two waves");
for (const id of [...OPEN_DICE, ...wavedDice]) {
  if (!dieIdSet.has(id)) errors.push(`unlocks: unknown die "${id}"`);
}
const diceCovered = new Set([...OPEN_DICE, ...wavedDice]);
if (diceCovered.size !== ALL_DICE.length) {
  errors.push(
    `unlocks: ${String(diceCovered.size)} of ${String(ALL_DICE.length)} dice are reachable — the rest can never be bought`,
  );
}
const wavedContracts = UNLOCKS.flatMap((def) => def.contracts ?? []);
const contractIdSet = new Set(CONTRACTS.map((c) => c.id));
for (const id of [...OPEN_CONTRACTS, ...wavedContracts]) {
  if (!contractIdSet.has(id)) errors.push(`unlocks: unknown contract "${id}"`);
}
const contractsCovered = new Set([...OPEN_CONTRACTS, ...wavedContracts]);
if (contractsCovered.size !== CONTRACTS.length) {
  errors.push(
    `unlocks: ${String(contractsCovered.size)} of ${String(CONTRACTS.length)} contracts are reachable`,
  );
}
for (const def of UNLOCKS) {
  if (!resolveMetaKey(def.label.replace("meta:", "")))
    errors.push(`unlocks: "${def.id}" has no en label`);
  if (
    def.source.level === undefined &&
    def.source.achievement === undefined &&
    def.source.ascension === undefined &&
    def.source.clears === undefined
  ) {
    errors.push(`unlocks: "${def.id}" has no source at all`);
  }
  if (
    def.source.achievement !== undefined &&
    !ACHIEVEMENTS.some((a) => a.id === def.source.achievement)
  ) {
    errors.push(
      `unlocks: "${def.id}" waits on unknown achievement "${def.source.achievement}"`,
    );
  }
  if (def.cosmetic !== undefined) {
    const known =
      DIE_SKINS.some((skin) => skin.cosmetic === def.cosmetic) ||
      THEMES.some((theme) => theme.unlock === def.cosmetic);
    if (!known)
      errors.push(`unlocks: "${def.id}" grants unknown cosmetic "${def.cosmetic}"`);
  }
}
for (const milestone of MILESTONES) {
  if (!resolveMetaKey(milestoneLabel(milestone).replace("meta:", "")))
    errors.push(`milestones: L${String(milestone.level)} has no en label`);
  const payload =
    (milestone.budget ?? 0) > 0 || (milestone.chartPoints ?? 0) > 0;
  const unlock =
    milestone.unlockId !== undefined && unlockIds.has(milestone.unlockId);
  if (!payload && !unlock)
    errors.push(
      `milestones: L${String(milestone.level)} (${milestone.kind}) promises nothing real`,
    );
}
for (const skin of DIE_SKINS) {
  if (!resolveMetaKey(skin.name.replace("meta:", "")))
    errors.push(`cosmetics: skin "${skin.id}" has no en name`);
  if (!resolveMetaKey(skin.desc.replace("meta:", "")))
    errors.push(`cosmetics: skin "${skin.id}" has no en desc`);
  if (
    skin.cosmetic !== undefined &&
    !UNLOCKS.some((def) => def.cosmetic === skin.cosmetic)
  ) {
    errors.push(`cosmetics: skin "${skin.id}" can never be unlocked`);
  }
}
for (const badge of BADGES) {
  if (!resolveMetaKey(badge.name.replace("meta:", "")))
    errors.push(`cosmetics: badge "${badge.id}" has no en name`);
}
for (const reward of ASCENSION_REWARDS) {
  if (!resolveMetaKey(reward.label.replace("meta:", "")))
    errors.push(`ascension: A${String(reward.level)} reward has no en label`);
  if (reward.unlockId !== undefined && !unlockIds.has(reward.unlockId)) {
    errors.push(
      `ascension: A${String(reward.level)} rewards unknown unlock "${reward.unlockId}"`,
    );
  }
}

const flatValues = (node: unknown, prefix = ""): Record<string, string> => {
  if (typeof node === "string") return { [prefix]: node };
  if (typeof node !== "object" || node === null) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    Object.assign(out, flatValues(value, prefix === "" ? key : `${prefix}.${key}`));
  }
  return out;
};

const flattenKeys = (node: unknown, prefix = ""): string[] => {
  if (typeof node !== "object" || node === null) return [prefix];
  return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) =>
    flattenKeys(value, prefix === "" ? key : `${prefix}.${key}`),
  );
};

const checkParity = (
  ns: string,
  base: unknown,
  other: unknown,
  locale: string,
): void => {
  const baseKeys = new Set(flattenKeys(base));
  const otherKeys = new Set(flattenKeys(other));
  for (const key of baseKeys) {
    if (!otherKeys.has(key))
      errors.push(`i18n: ${locale}/${ns} missing key "${key}"`);
  }
};

const NAMESPACES: readonly [string, unknown, unknown, unknown][] = [
  ["common", enCommon, ukCommon, ruCommon],
  ["menu", enMenu, ukMenu, ruMenu],
  ["settings", enSettings, ukSettings, ruSettings],
  ["battle", enBattle, ukBattle, ruBattle],
  ["content", enContent, ukContent, ruContent],
  ["run", enRun, ukRun, ruRun],
  ["meta", enMeta, ukMeta, ruMeta],
];

for (const [ns, en, uk, ru] of NAMESPACES) {
  checkParity(ns, en, uk, "uk");
  checkParity(ns, en, ru, "ru");
}

const MACHINE_LOCALES = ["de", "es", "fr", "pl"] as const;
const I18N_DIR = join(process.cwd(), "src", "i18n");
const localeContent = new Map<string, unknown>([
  ["en", enContent],
  ["uk", ukContent],
  ["ru", ruContent],
]);

for (const locale of MACHINE_LOCALES) {
  const dir = join(I18N_DIR, locale);
  if (!existsSync(dir)) continue;
  for (const [ns, en] of NAMESPACES) {
    const path = join(dir, `${ns}.json`);
    if (!existsSync(path)) {
      errors.push(`i18n: ${locale}/${ns} is missing (locale is half-generated)`);
      continue;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(path, "utf8"));
    } catch {
      errors.push(`i18n: ${locale}/${ns} is not valid JSON`);
      continue;
    }
    checkParity(ns, en, parsed, locale);
    if (ns === "content") localeContent.set(locale, parsed);
    for (const [key, value] of Object.entries(flatValues(parsed))) {
      if (value.trim() === "")
        errors.push(`i18n: ${locale}/${ns} has an empty string at "${key}"`);
    }
  }
}

const barkKeysIn = (root: unknown): string[] => {
  const groups = (root as Record<string, unknown> | null)?.["bark"];
  if (typeof groups !== "object" || groups === null) return [];
  return Object.entries(groups as Record<string, unknown>).flatMap(
    ([group, group_lines]) =>
      typeof group_lines === "object" && group_lines !== null
        ? Object.keys(group_lines as Record<string, unknown>).map(
            (index) => `content:bark.${group}.${index}`,
          )
        : [],
  );
};

let barkOrphans = 0;
for (const [locale, root] of localeContent) {
  for (const key of barkKeysIn(root)) {
    if (referencedBarkKeys.has(key)) continue;
    barkOrphans += 1;
    errors.push(
      `barks: ${locale} authors "${key}" and no BarkDef references it`,
    );
  }
}

const DEEP_PERK_PCT = 60;
const TAG_REFERENCE_TARGET = 25;
const RARE_TAG_CONSUMER_TARGET = 10;
const MODULE_VOCABULARY_TARGET = 15;
const LEGENDARY_MODULE_TARGET = 4;
const ENGRAVING_SCALAR_PCT = 25;
const STAT_STICK_CAP = 5;
const ACTIVE_DIE_TARGET = 12;
const LEGENDARY_PRICE = [95, 140] as const;

const SCHOOL_TAG_SET = new Set<string>(SCHOOL_TAGS);
const BASIC_DIE_IDS = new Set(BASIC_DICE.map((d) => d.id));

const bodyOwners = new Map<string, string[]>();
const noteBody = (kind: string, id: string, def: ShapedContent): void => {
  const key = normalizedBody(def);
  const list = bodyOwners.get(key);
  if (list === undefined) bodyOwners.set(key, [`${kind}:${id}`]);
  else list.push(`${kind}:${id}`);
};

for (const perk of ALL_PERKS) noteBody("perk", perk.id, perk);
for (const def of ALL_MODULES) noteBody("module", def.id, def);

for (const [, owners] of bodyOwners) {
  if (owners.length > 1) {
    errors.push(`dedupe: ${owners.join(" == ")} share one normalized body`);
  }
}

const deepPerks = ALL_PERKS.filter(isConditional).length;
const deepPct = (deepPerks / Math.max(1, ALL_PERKS.length)) * 100;
if (deepPct < DEEP_PERK_PCT) {
  errors.push(
    `perks: ${deepPct.toFixed(1)}% are conditional or synergistic, target ${String(DEEP_PERK_PCT)}%`,
  );
}

for (const perk of ALL_PERKS) {
  if ((perk.tags ?? []).length === 0) {
    errors.push(`perks: "${perk.id}" carries no tag`);
  }
  for (const tag of perk.tags ?? []) {
    if (SCHOOL_TAG_SET.has(tag)) {
      errors.push(
        `perks: "${perk.id}" carries school tag "${tag}" — only dice carry school tags`,
      );
    }
  }
}

for (const def of ALL_MODULES) {
  for (const tag of def.tags ?? []) {
    if (SCHOOL_TAG_SET.has(tag)) {
      errors.push(
        `modules: "${def.id}" carries school tag "${tag}" — only dice carry school tags`,
      );
    }
  }
}

for (const def of ENGRAVINGS) {
  if ((def.tags ?? []).length === 0) {
    errors.push(`engravings: "${def.id}" carries no tag`);
  }
  for (const tag of def.tags ?? []) {
    if (SCHOOL_TAG_SET.has(tag)) {
      errors.push(
        `engravings: "${def.id}" carries school tag "${tag}" — only dice carry school tags`,
      );
    }
  }
}

for (const die of ALL_DICE) {
  if (die.desc === undefined) errors.push(`dice: "${die.id}" has no diceDesc`);
  checkLocKey(`dice.${die.id}`, die.name);
  checkLocKey(`dice.${die.id}`, die.desc);
  for (const tag of die.tags ?? []) {
    if (tag === die.school) {
      errors.push(`dice: "${die.id}" repeats its own school in tags`);
    }
  }
}

const tagReferenceCount =
  ALL_PERKS.filter((d) => tagConditionedEffects(d) > 0).length +
  ALL_MODULES.filter((d) => tagConditionedEffects(d) > 0).length +
  ALL_DICE.filter((d) => tagConditionedEffects(d) > 0).length +
  ENGRAVINGS.filter((d) => tagConditionedEffects(d) > 0).length;
if (tagReferenceCount < TAG_REFERENCE_TARGET) {
  errors.push(
    `tags: ${String(tagReferenceCount)} records carry a tag-conditioned effect, target ${String(TAG_REFERENCE_TARGET)}`,
  );
}

const rareTagConsumers = ALL_PERKS.filter(
  (perk) =>
    perk.rarity === "rare" &&
    referencedTagsOf(perk).some((tag) => (perk.synergy ?? []).includes(tag)),
).length;
if (rareTagConsumers < RARE_TAG_CONSUMER_TARGET) {
  errors.push(
    `tags: ${String(rareTagConsumers)} rares mechanically consume their own synergy tag, target ${String(RARE_TAG_CONSUMER_TARGET)}`,
  );
}

const moduleVocabulary = ALL_MODULES.filter(usesModuleVocabulary);
if (moduleVocabulary.length < MODULE_VOCABULARY_TARGET) {
  errors.push(
    `modules: ${String(moduleVocabulary.length)} use module-only vocabulary, target ${String(MODULE_VOCABULARY_TARGET)}`,
  );
}

const legendaryModules = ALL_MODULES.filter((m) => m.rarity === "legendary");
if (legendaryModules.length < LEGENDARY_MODULE_TARGET) {
  errors.push(
    `modules: legendary pool holds ${String(legendaryModules.length)}, target ${String(LEGENDARY_MODULE_TARGET)}`,
  );
}
if (MODULE_POOL.legendary.length !== legendaryModules.length) {
  errors.push(
    `modules: MODULE_POOL.legendary holds ${String(MODULE_POOL.legendary.length)} of ${String(legendaryModules.length)} legendaries`,
  );
}
for (const def of legendaryModules) {
  if (def.price < LEGENDARY_PRICE[0] || def.price > LEGENDARY_PRICE[1]) {
    errors.push(
      `modules: legendary "${def.id}" price ${String(def.price)} is outside ${String(LEGENDARY_PRICE[0])}-${String(LEGENDARY_PRICE[1])}`,
    );
  }
}

const scalarEngravings = ENGRAVINGS.filter(isSingleScalar).length;
const scalarPct = (scalarEngravings / Math.max(1, ENGRAVINGS.length)) * 100;
if (scalarPct > ENGRAVING_SCALAR_PCT) {
  errors.push(
    `engravings: ${scalarPct.toFixed(1)}% are a single scalar shape, cap ${String(ENGRAVING_SCALAR_PCT)}%`,
  );
}

for (const [a, b] of ENGRAVING_PAIRS) {
  if (!ENGRAVING_BY_ID.has(a) || !ENGRAVING_BY_ID.has(b)) {
    errors.push(`engravings: pair "${a}"+"${b}" names an unknown engraving`);
  }
}
const ENGRAVING_PAIR_TARGET = 4;
if (ENGRAVING_PAIRS.length < ENGRAVING_PAIR_TARGET) {
  errors.push(
    `engravings: ${String(ENGRAVING_PAIRS.length)} two-socket pairs designed, target ${String(ENGRAVING_PAIR_TARGET)}`,
  );
}

const statSticks = ALL_DICE.filter(
  (die) =>
    !BASIC_DIE_IDS.has(die.id) &&
    die.effects === undefined &&
    die.faces === undefined &&
    die.growth === undefined &&
    die.active === undefined &&
    die.tier !== 100,
);
if (statSticks.length > STAT_STICK_CAP) {
  errors.push(
    `dice: ${String(statSticks.length)} stat-sticks (${statSticks.map((d) => d.id).join(" ")}), cap ${String(STAT_STICK_CAP)}`,
  );
}
for (const die of statSticks) {
  if (die.rarity !== "common") {
    errors.push(
      `dice: stat-stick "${die.id}" is ${die.rarity}; a die without an identity may only be common`,
    );
  }
}

const activeDice = ALL_DICE.filter((d) => d.active !== undefined);
if (activeDice.length < ACTIVE_DIE_TARGET) {
  errors.push(
    `dice: ${String(activeDice.length)} carry an active, target ${String(ACTIVE_DIE_TARGET)}`,
  );
}

const resonancePayloadsBySchool = new Map<string, Set<string>>();
for (const bonus of RESONANCE_BONUSES) {
  const set = resonancePayloadsBySchool.get(bonus.school) ?? new Set<string>();
  for (const eff of bonus.effects ?? []) {
    set.add(`${eff.on}|${JSON.stringify(eff.do)}`);
  }
  if (bonus.grant !== undefined) set.add(`grant:${bonus.grant}`);
  resonancePayloadsBySchool.set(bonus.school, set);
}

const schoolTagsIn = (cond: Cond): string[] => {
  if (cond.c === "any") return cond.of.flatMap(schoolTagsIn);
  if (cond.c === "not") return schoolTagsIn(cond.of);
  if (cond.c !== "hasTag" && cond.c !== "countTag") return [];
  return SCHOOL_TAG_SET.has(cond.tag) ? [cond.tag] : [];
};

const checkTagVsResonance = (
  owner: string,
  effects: readonly EffectDef[] | undefined,
): void => {
  for (const eff of effects ?? []) {
    const schools = (eff.if ?? []).flatMap(schoolTagsIn);
    if (schools.length === 0) continue;
    const payload = `${eff.on}|${JSON.stringify(eff.do)}`;
    for (const school of schools) {
      if (resonancePayloadsBySchool.get(school)?.has(payload) === true) {
        errors.push(
          `tags: ${owner} gates the ${school} resonance payload behind a countTag on ${school}`,
        );
      }
    }
  }
};
for (const perk of ALL_PERKS) checkTagVsResonance(`perks.${perk.id}`, perk.effects);
for (const def of ALL_MODULES) checkTagVsResonance(`modules.${def.id}`, def.effects);
for (const die of ALL_DICE) checkTagVsResonance(`dice.${die.id}`, die.effects);

interface TotalsRow {
  label: string;
  have: number;
  target: number;
}

const REVISION_3_TOTALS: readonly TotalsRow[] = [
  { label: "dice", have: ALL_DICE.length, target: 94 },
  { label: "perks", have: ALL_PERKS.length, target: 180 },
  { label: "modules", have: ALL_MODULES.length, target: 60 },
  { label: "engravings", have: ENGRAVINGS.length, target: 50 },
  { label: "events", have: ALL_EVENTS.length, target: 170 },
  { label: "callbacks", have: callbackCount, target: CALLBACK_TARGET },
  { label: "puzzles", have: PUZZLES.length, target: 60 },
  { label: "chart", have: CHART_NODES.length, target: 240 },
  { label: "enemies", have: ALL_ENEMIES.length, target: 91 },
  { label: "dossiers", have: dossierCount, target: 91 },
  { label: "chains", have: CHAINS.length, target: CHAIN_TARGET },
  { label: "barkLines", have: barkLines, target: 220 },
  { label: "keeperLines", have: KEEPER_LINES.length, target: 80 },
  { label: "memories", have: MEMORIES.length, target: 16 },
  { label: "fragments", have: FRAGMENTS.length, target: 100 },
  { label: "epilogue", have: EPILOGUE_ENTRIES.length, target: EPILOGUE_TARGET },
  { label: "contracts", have: CONTRACTS.length, target: 20 },
  { label: "achievements", have: ACHIEVEMENTS.length, target: 70 },
  { label: "unlocks", have: UNLOCKS.length, target: 24 },
];

for (const row of REVISION_3_TOTALS) {
  if (row.have >= row.target) continue;
  errors.push(
    `totals: ${row.label} is ${String(row.have)}, under the Revision-3 target of ${String(row.target)}`,
  );
}

const vocabularyRow = (
  kind: string,
  members: readonly string[],
  use: Map<string, number>,
): string => {
  const unused = members.filter((m) => (use.get(m) ?? 0) === 0);
  for (const member of unused) {
    if (PENDING_VOCABULARY[member] === undefined) {
      errors.push(
        `vocabulary: ${kind} "${member}" is declared but no content uses it`,
      );
    }
  }
  const used = members.length - unused.length;
  const pending = unused
    .map((m) => `${m}→${PENDING_VOCABULARY[m] ?? "?"}`)
    .join(" ");
  return `  ${kind.padEnd(7)} ${String(used)}/${String(members.length)} used${
    pending === "" ? "" : ` · pending ${pending}`
  }`;
};

for (const tag of referencedTags) {
  checkTag("tags", tag);
  if (!carriedTags.has(tag)) {
    errors.push(`tags: "${tag}" is referenced but carried by no content`);
  }
}

const tagUse = new Map<string, number>();
for (const tag of carriedTags) bump(tagUse, tag);

const vocabularyReport = [
  vocabularyRow("hooks", HOOKS, hookUse),
  vocabularyRow("conds", COND_NAMES, condUse),
  vocabularyRow("actions", ACTION_NAMES, actionUse),
  vocabularyRow("tags", CONTENT_TAGS, tagUse),
];

if (errors.length > 0) {
  for (const error of errors) console.error(`lint:content: ${error}`);
  process.exit(1);
}

console.log("lint:content: effect vocabulary");
for (const row of vocabularyReport) console.log(row);

console.log("lint:content: depth");
console.log(
  `  perks   ${String(deepPerks)}/${String(ALL_PERKS.length)} conditional (${deepPct.toFixed(1)}%) · ${String(rareTagConsumers)} rares consume their synergy tag`,
);
console.log(
  `  tags    ${String(tagReferenceCount)} records carry a tag-conditioned effect · ${String(CONTENT_TAGS.length)} tags in the registry`,
);
console.log(
  `  modules ${String(moduleVocabulary.length)}/${String(ALL_MODULES.length)} on module-only vocabulary · ${String(legendaryModules.length)} legendary`,
);
console.log(
  `  dice    ${String(activeDice.length)} actives · ${String(statSticks.length)} stat-sticks · ${String(scalarEngravings)}/${String(ENGRAVINGS.length)} engravings single-scalar (${scalarPct.toFixed(1)}%)`,
);

console.log("lint:content: puzzle calibration");
for (const row of puzzleTable(PUZZLES)) console.log(`  ${row}`);

console.log("lint:content: Revision-3 totals");
for (const row of REVISION_3_TOTALS) {
  const mark = row.have >= row.target ? "ok" : "SHORT";
  console.log(
    `  ${row.label.padEnd(13)} ${String(row.have).padStart(4)}/${String(row.target).padEnd(4)} ${mark}`,
  );
}

console.log("lint:content: bark census");
console.log(
  `  lines   ${String(barkLines)}/220 · ${String(BARKS.length)} defs · floor ${String(BARK_MIN_LINES)} · thinnest ${String(Math.min(...BARKS.map((b) => b.lines.length)))} · whitelisted ${String(BARK_SINGLETON_WHITELIST.size)}`,
);
console.log(
  `  keys    ${String(referencedBarkKeys.size)} referenced · orphans ${String(barkOrphans)} across ${String(localeContent.size)} locales`,
);
console.log(
  `  emitters ${String(BARKS.length)}/${String(BARKS.length)} triggers reached · ${String(emitterSources.length)} source files scanned`,
);
console.log(
  `  reserved ${BARK_RESERVATIONS.map((r) => `${r.trigger}(${r.phase}, ${String(r.lines)})`).join(" · ")}`,
);

console.log(
  `lint:content: ok — ${String(ALL_DICE.length)} dice, ${String(RESONANCE_BONUSES.length)} resonance bonuses, ${String(ALL_ENEMIES.length)} enemies, ${String(SHIPS.length)} ships, ${String(CHART_NODES.length)} chart nodes, ${String(ALL_PERKS.length)} perks, ${String(ALL_EVENTS.length)} events (${String(callbackCount)} callbacks), ${String(PUZZLES.length)} puzzles, ${String(CODEX.length)} codex, ${String(BARKS.length)} barks, ${String(MUTATORS.length)} mutators, ${String(WEATHER.length)} weather, ${String(SALVAGE_FACES.length)} salvage faces, ${String(CONTRACTS.length)} contracts`,
);
