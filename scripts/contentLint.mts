import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { ASCENSIONS, MAX_ASCENSION } from "../src/data/ascension";
import { BARKS, BARK_QUOTA } from "../src/data/barks";
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
import { FRAGMENTS } from "../src/data/narrative/fragments";
import { KEEPER_LINES } from "../src/data/narrative/keeperLines";
import { CHART_ADJACENCY, CHART_NODES, CHART_NODE_BY_ID } from "../src/data/chart";
import { CONTRACTS, CONTRACT_STAR_COUNT } from "../src/data/contracts";
import { MUTATORS, MUTATOR_BY_ID, ZERO_MUTATOR_MODS } from "../src/data/mutators";
import { CODEX, CODEX_BY_ID } from "../src/data/codex";
import { STARTER_DECK } from "../src/data/decks";
import { ALL_DICE, BASIC_DICE, DIE_BY_ID } from "../src/data/dice";
import { resolveFaces } from "../src/game/puzzles/evaluate";
import { createStream } from "../src/services/rng";
import {
  ENCOUNTER_GROUPS,
  ALL_ENEMIES,
  isEncounterGroup,
} from "../src/data/enemies";
import { ALL_EVENTS } from "../src/data/events";
import { ALL_PERKS } from "../src/data/perks";
import { PUZZLES } from "../src/data/puzzles";
import { RESONANCE_BONUSES } from "../src/data/resonance";
import { SHIPS } from "../src/data/ships";
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
import type { Intent, PatternStep } from "../src/types/content";

type ContentNode = string | { [key: string]: ContentNode };

const errors: string[] = [];

// Flags the run sets outside the event pipeline (battle entry, prologue).
const RUNTIME_FLAGS: readonly string[] = [
  "hunterEngaged",
  "prologueRun",
  "beacon1",
  "beacon2",
  "beacon3",
  "beacon4",
  "beacon5",
];
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

const flattenStep = (step: PatternStep): Intent[] =>
  "pick" in step ? step.pick.map(([intent]) => intent) : [step];

for (const enemy of ALL_ENEMIES) {
  if (enemy.pattern.length === 0)
    errors.push(`enemies: "${enemy.id}" has an empty pattern`);
  if (enemy.hp <= 0) errors.push(`enemies: "${enemy.id}" hp must be positive`);
  checkLocKey(`enemies.${enemy.id}`, enemy.name);
  for (const step of enemy.pattern) {
    if ("pick" in step) {
      if (step.pick.length === 0)
        errors.push(`enemies: "${enemy.id}" has an empty weighted step`);
      for (const [, weight] of step.pick) {
        if (weight <= 0)
          errors.push(`enemies: "${enemy.id}" has a non-positive pick weight`);
      }
    }
    for (const intent of flattenStep(step)) {
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
  }
}

for (const ship of SHIPS) {
  checkLocKey(`ships.${ship.id}`, ship.name);
}

checkUniqueIds(
  "chart",
  CHART_NODES.map((n) => n.id),
);

const CHART_NODE_TOTAL = 220;
const CHART_NOTABLES = 32;
const CHART_KEYSTONES = 8;
if (CHART_NODES.length !== CHART_NODE_TOTAL)
  errors.push(
    `chart: expected ${String(CHART_NODE_TOTAL)} nodes, found ${String(CHART_NODES.length)}`,
  );
const notableCount = CHART_NODES.filter((n) => n.kind === "notable").length;
if (notableCount !== CHART_NOTABLES)
  errors.push(
    `chart: expected ${String(CHART_NOTABLES)} notables, found ${String(notableCount)}`,
  );
const keystoneCount = CHART_NODES.filter((n) => n.kind === "keystone").length;
if (keystoneCount !== CHART_KEYSTONES)
  errors.push(
    `chart: expected ${String(CHART_KEYSTONES)} keystones, found ${String(keystoneCount)}`,
  );
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
}

// Orphans and reachability: every node must reach an entry node through the
// undirected link graph, or no amount of points can ever buy it.
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

// DESIGN §9.4 rarity spread {c 50%, u 35%, r 15%}, ±4 points of slack.
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
  // Every rare must point at something buildable (plan Task 4).
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

const EVENT_TOTAL = 100;
const CALLBACK_TARGET = 30;
if (ALL_EVENTS.length < EVENT_TOTAL)
  errors.push(
    `events: expected at least ${String(EVENT_TOTAL)} events, found ${String(ALL_EVENTS.length)}`,
  );
if (callbackCount < CALLBACK_TARGET)
  errors.push(
    `events: expected at least ${String(CALLBACK_TARGET)} callback events, found ${String(callbackCount)}`,
  );

// Unreachable events: a callback whose required flags no outcome anywhere can
// set is dead content, not a hidden secret.
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

for (const entry of CODEX) {
  checkLocKey(`codex.${entry.id}`, entry.title);
  checkLocKey(`codex.${entry.id}`, entry.body);
}

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

const BARK_LINE_TOTAL = 150;
let barkLines = 0;
const barkByQuota = new Map<string, number>();
for (const bark of BARKS) {
  if (bark.lines.length === 0)
    errors.push(`barks: "${bark.id}" has no lines`);
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
if (barkLines !== BARK_LINE_TOTAL)
  errors.push(
    `barks: expected ${String(BARK_LINE_TOTAL)} lines, found ${String(barkLines)}`,
  );
for (const [trigger, quota] of Object.entries(BARK_QUOTA)) {
  const have = barkByQuota.get(trigger) ?? 0;
  if (have !== quota)
    errors.push(
      `barks: trigger "${trigger}" has ${String(have)} lines, quota ${String(quota)}`,
    );
}

// ── Phase 10: modules, engravings, fate, fragments, keeper lines ────────────

const MODULE_TOTAL = 60;
const ENGRAVING_TOTAL = 50;
const FRAGMENT_TOTAL = 80;
const KEEPER_TOTAL = 40;
const DICE_TOTAL = 90;
const DOSSIER_TOTAL = 54;

checkUniqueIds("modules", ALL_MODULES.map((m) => m.id));
checkUniqueIds("engravings", ENGRAVINGS.map((e) => e.id));
checkUniqueIds("keeperLines", KEEPER_LINES.map((k) => k.id));
checkUniqueIds("fragments", FRAGMENTS.map((f) => f.id));

if (ALL_MODULES.length !== MODULE_TOTAL)
  errors.push(
    `modules: expected ${String(MODULE_TOTAL)}, found ${String(ALL_MODULES.length)}`,
  );
if (ENGRAVINGS.length !== ENGRAVING_TOTAL)
  errors.push(
    `engravings: expected ${String(ENGRAVING_TOTAL)}, found ${String(ENGRAVINGS.length)}`,
  );
if (FRAGMENTS.length !== FRAGMENT_TOTAL)
  errors.push(
    `fragments: expected ${String(FRAGMENT_TOTAL)}, found ${String(FRAGMENTS.length)}`,
  );
if (KEEPER_LINES.length !== KEEPER_TOTAL)
  errors.push(
    `keeperLines: expected ${String(KEEPER_TOTAL)}, found ${String(KEEPER_LINES.length)}`,
  );
if (ALL_DICE.length !== DICE_TOTAL)
  errors.push(
    `dice: expected ${String(DICE_TOTAL)}, found ${String(ALL_DICE.length)}`,
  );

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

for (const f of FRAGMENTS) checkLocKey(`fragment.${f.id}`, f.text);
for (const k of KEEPER_LINES) checkLocKey(`keeper.${k.id}`, k.text);

if (ASCENSIONS.length !== MAX_ASCENSION)
  errors.push(
    `ascension: expected ${String(MAX_ASCENSION)} levels, found ${String(ASCENSIONS.length)}`,
  );
for (const def of ASCENSIONS) {
  checkLocKey(`ascension.${String(def.level)}`, def.name);
  checkLocKey(`ascension.${String(def.level)}`, def.desc);
  if (Object.keys(def.mods).length === 0)
    errors.push(`ascension: A${String(def.level)} is a no-op`);
}

const dossierCount = CODEX.filter((e) => e.group === "dossier").length;
if (dossierCount !== DOSSIER_TOTAL)
  errors.push(
    `codex: expected ${String(DOSSIER_TOTAL)} dossiers, found ${String(dossierCount)}`,
  );

// ── Phase 9: mutators, contracts, goals ─────────────────────────────────────

const MUTATOR_COUNT = 12;
const CONTRACT_COUNT = 14;
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

// Machine locales (Phase 12) are generated artefacts and may be absent from a
// given checkout. Present means complete: a half-generated language would fall
// back to English mid-sentence, which reads as a bug rather than as a locale.
const MACHINE_LOCALES = ["de", "es", "fr", "pl"] as const;
const I18N_DIR = join(process.cwd(), "src", "i18n");

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
    for (const [key, value] of Object.entries(flatValues(parsed))) {
      if (value.trim() === "")
        errors.push(`i18n: ${locale}/${ns} has an empty string at "${key}"`);
    }
  }
}

// ── R5: depth gates ─────────────────────────────────────────────────────────

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

// Counting a school with `countTag` is counting the deck, which is what
// resonance already does. A school-tag condition may therefore not pay what a
// tier of that school already pays — that is a resonance threshold re-spelled
// with a different number. Mechanic tags are a different axis and are free to
// reach a similar payload.
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

console.log(
  `lint:content: totals — dice ${String(ALL_DICE.length)}/90 · perks ${String(ALL_PERKS.length)}/180 · modules ${String(ALL_MODULES.length)}/60 · engravings ${String(ENGRAVINGS.length)}/50 · events ${String(ALL_EVENTS.length)}/100 (${String(callbackCount)}/30 callbacks) · riddles ${String(PUZZLES.length)}/60 · chart ${String(CHART_NODES.length)}/220 · enemies ${String(ALL_ENEMIES.length)}/54 · contracts ${String(CONTRACTS.length)}/14 · barks ${String(barkLines)}/150 · fragments ${String(FRAGMENTS.length)}/80 · dossiers ${String(dossierCount)}/54 · keeper ${String(KEEPER_LINES.length)}/40`,
);

console.log(
  `lint:content: ok — ${String(ALL_DICE.length)} dice, ${String(RESONANCE_BONUSES.length)} resonance bonuses, ${String(ALL_ENEMIES.length)} enemies, ${String(SHIPS.length)} ships, ${String(CHART_NODES.length)} chart nodes, ${String(ALL_PERKS.length)} perks, ${String(ALL_EVENTS.length)} events (${String(callbackCount)} callbacks), ${String(PUZZLES.length)} puzzles, ${String(CODEX.length)} codex, ${String(BARKS.length)} barks, ${String(MUTATORS.length)} mutators, ${String(CONTRACTS.length)} contracts`,
);
