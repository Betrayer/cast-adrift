import { BARKS } from "../src/data/barks";
import { CHART_NODES, CHART_NODE_BY_ID } from "../src/data/chart";
import { CONTRACTS, CONTRACT_STAR_COUNT } from "../src/data/contracts";
import { MUTATORS, MUTATOR_BY_ID, ZERO_MUTATOR_MODS } from "../src/data/mutators";
import { CODEX, CODEX_BY_ID } from "../src/data/codex";
import { STARTER_DECK } from "../src/data/decks";
import { ALL_DICE } from "../src/data/dice";
import {
  ENCOUNTER_GROUPS,
  ALL_ENEMIES,
} from "../src/data/enemies";
import { ALL_EVENTS } from "../src/data/events";
import { ALL_PERKS } from "../src/data/perks";
import { PHASE5_PERKS } from "../src/data/perks/phase5";
import { PUZZLES } from "../src/data/puzzles";
import { RESONANCE_BONUSES } from "../src/data/resonance";
import { SHIPS } from "../src/data/ships";
import { DIE_PTS } from "../src/data/tiers";
import { HOOKS } from "../src/game/effects/types";
import {
  difficultyReport,
  isAchievable,
  isTrivial,
  solutionCount,
  totalPlacements,
} from "../src/game/puzzles/evaluate";
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
import type { EffectDef } from "../src/game/effects/types";
import type { GoalSpec } from "../src/game/run/goals";
import type { EventOption, Outcome } from "../src/types/events";
import type { Intent, PatternStep } from "../src/types/content";

type ContentNode = string | { [key: string]: ContentNode };

const errors: string[] = [];
const hooks = new Set<string>(HOOKS);
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

const checkEffects = (owner: string, effects: readonly EffectDef[] | undefined): void => {
  if (effects === undefined) return;
  for (const def of effects) {
    if (!hooks.has(def.on)) {
      errors.push(`${owner}: unknown hook "${def.on}"`);
    }
  }
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
  checkEffects(`dice.${die.id}`, die.effects);
  if (die.faces !== undefined && die.faces.length === 0) {
    errors.push(`dice: "${die.id}" has empty faces`);
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

const CHART_NODE_TOTAL = 120;
const CHART_NOTABLES = 14;
const CHART_KEYSTONES = 4;
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
    node.hubBudget !== true
  ) {
    errors.push(`chart: "${node.id}" is a no-op (no effects, mods, traits, or budget)`);
  }
}

checkUniqueIds(
  "perks",
  ALL_PERKS.map((p) => p.id),
);

if (PHASE5_PERKS.length !== 30) {
  errors.push(
    `perks: expected exactly 30 Phase-5 perks, found ${String(PHASE5_PERKS.length)}`,
  );
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
      if (!enemyIds.has(id))
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

if (ALL_EVENTS.length < 30)
  errors.push(
    `events: expected at least 30 events, found ${String(ALL_EVENTS.length)}`,
  );
if (callbackCount < 8)
  errors.push(
    `events: expected at least 8 callback events, found ${String(callbackCount)}`,
  );

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
  if (puzzle.reward.die !== undefined && !dieIdSet.has(puzzle.reward.die))
    errors.push(`puzzles: "${puzzle.id}" rewards unknown die "${puzzle.reward.die}"`);
  if (puzzle.reward.codex !== undefined && !CODEX_BY_ID.has(puzzle.reward.codex))
    errors.push(`puzzles: "${puzzle.id}" rewards unknown codex "${puzzle.reward.codex}"`);
  if (!isAchievable(puzzle))
    errors.push(`puzzles: "${puzzle.id}" cannot reach its goal even on a ceiling roll`);
  if (isTrivial(puzzle))
    errors.push(`puzzles: "${puzzle.id}" is a free win on a floor roll`);
  if (puzzle.goal.g === "deduction") {
    if (puzzle.fixedRoll === undefined)
      errors.push(`puzzles: "${puzzle.id}" is a deduction puzzle without a fixedRoll`);
    const count = solutionCount(puzzle);
    if (count < 1 || count > 3)
      errors.push(
        `puzzles: "${puzzle.id}" deduction solution count ${String(count)} is not in [1,3]`,
      );
    if (count >= totalPlacements(puzzle))
      errors.push(`puzzles: "${puzzle.id}" deduction is solved by every placement`);
  }
  if (puzzle.goal.g === "exact") {
    const r = difficultyReport(puzzle);
    if (!r.exactReachable)
      errors.push(`puzzles: "${puzzle.id}" exact value is not landable on any roll`);
    if (r.target <= r.floor || r.target > r.ceil)
      errors.push(
        `puzzles: "${puzzle.id}" exact value ${String(r.target)} is not inside (floor ${String(r.floor)}, ceil ${String(r.ceil)}]`,
      );
  }
}

const PUZZLE_COUNT = 12;
if (PUZZLES.length !== PUZZLE_COUNT)
  errors.push(
    `puzzles: expected exactly ${String(PUZZLE_COUNT)} puzzles, found ${String(PUZZLES.length)}`,
  );

for (const bark of BARKS) {
  if (bark.lines.length === 0)
    errors.push(`barks: "${bark.id}" has no lines`);
  for (const line of bark.lines) checkLocKey(`bark.${bark.id}`, line);
}

// ── Phase 9: mutators, contracts, goals ─────────────────────────────────────

const MUTATOR_COUNT = 12;
const CONTRACT_COUNT = 10;
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

if (errors.length > 0) {
  for (const error of errors) console.error(`lint:content: ${error}`);
  process.exit(1);
}

console.log(
  `lint:content: ok — ${String(ALL_DICE.length)} dice, ${String(RESONANCE_BONUSES.length)} resonance bonuses, ${String(ALL_ENEMIES.length)} enemies, ${String(SHIPS.length)} ships, ${String(CHART_NODES.length)} chart nodes, ${String(ALL_PERKS.length)} perks, ${String(ALL_EVENTS.length)} events (${String(callbackCount)} callbacks), ${String(PUZZLES.length)} puzzles, ${String(CODEX.length)} codex, ${String(BARKS.length)} barks, ${String(MUTATORS.length)} mutators, ${String(CONTRACTS.length)} contracts`,
);
