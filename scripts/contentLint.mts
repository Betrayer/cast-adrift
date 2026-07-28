import { ASCENSIONS, MAX_ASCENSION } from "../src/data/ascension";
import { BARKS, BARK_QUOTA } from "../src/data/barks";
import { ENGRAVINGS } from "../src/data/engravings";
import { FATE_TABLE } from "../src/data/fate";
import { ALL_MODULES } from "../src/data/modules";
import { FRAGMENTS } from "../src/data/narrative/fragments";
import { KEEPER_LINES } from "../src/data/narrative/keeperLines";
import { CHART_ADJACENCY, CHART_NODES, CHART_NODE_BY_ID } from "../src/data/chart";
import { CONTRACTS, CONTRACT_STAR_COUNT } from "../src/data/contracts";
import { MODULE_BY_ID } from "../src/data/modules";
import { MUTATORS, MUTATOR_BY_ID, ZERO_MUTATOR_MODS } from "../src/data/mutators";
import { CODEX, CODEX_BY_ID } from "../src/data/codex";
import { STARTER_DECK } from "../src/data/decks";
import { ALL_DICE } from "../src/data/dice";
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
const ENGRAVING_IDS = new Set(ENGRAVINGS.map((e) => e.id));

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

const PERK_TOTAL = 150;
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
    if (syn === undefined) {
      errors.push(`perks: rare "${perk.id}" has no synergy tag`);
    } else if (syn.kind === "module" && !MODULE_BY_ID.has(syn.id)) {
      errors.push(`perks: "${perk.id}" synergy references unknown module "${syn.id}"`);
    } else if (syn.kind === "engraving" && !ENGRAVING_IDS.has(syn.id)) {
      errors.push(
        `perks: "${perk.id}" synergy references unknown engraving "${syn.id}"`,
      );
    }
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

const PUZZLE_COUNT = 25;
if (PUZZLES.length !== PUZZLE_COUNT)
  errors.push(
    `puzzles: expected exactly ${String(PUZZLE_COUNT)} puzzles, found ${String(PUZZLES.length)}`,
  );

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

const MODULE_TOTAL = 50;
const ENGRAVING_TOTAL = 40;
const FRAGMENT_TOTAL = 80;
const KEEPER_TOTAL = 40;
const DICE_TOTAL = 70;
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
  if (def.price < 40 || def.price > 90) {
    errors.push(
      `modules: "${def.id}" price ${String(def.price)} is outside the §9.3 band 40-90`,
    );
  }
}

for (const def of ENGRAVINGS) {
  checkLocKey(`engravings.${def.id}`, def.name);
  checkLocKey(`engravings.${def.id}`, def.desc);
  checkEffects(`engravings.${def.id}`, def.effects);
  if (def.effects === undefined && def.grant === undefined) {
    errors.push(`engravings: "${def.id}" is a no-op`);
  }
}

for (const def of FATE_TABLE) {
  checkLocKey(`fate.${def.id}`, def.text);
  if (def.do.length === 0) errors.push(`fate: "${def.id}" has no actions`);
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
  `lint:content: totals — dice ${String(ALL_DICE.length)}/70 · perks ${String(ALL_PERKS.length)}/150 · modules ${String(ALL_MODULES.length)}/50 · engravings ${String(ENGRAVINGS.length)}/40 · events ${String(ALL_EVENTS.length)}/100 (${String(callbackCount)}/30 callbacks) · riddles ${String(PUZZLES.length)}/25 · chart ${String(CHART_NODES.length)}/220 · enemies ${String(ALL_ENEMIES.length)}/54 · contracts ${String(CONTRACTS.length)}/14 · barks ${String(barkLines)}/150 · fragments ${String(FRAGMENTS.length)}/80 · dossiers ${String(dossierCount)}/54 · keeper ${String(KEEPER_LINES.length)}/40`,
);

console.log(
  `lint:content: ok — ${String(ALL_DICE.length)} dice, ${String(RESONANCE_BONUSES.length)} resonance bonuses, ${String(ALL_ENEMIES.length)} enemies, ${String(SHIPS.length)} ships, ${String(CHART_NODES.length)} chart nodes, ${String(ALL_PERKS.length)} perks, ${String(ALL_EVENTS.length)} events (${String(callbackCount)} callbacks), ${String(PUZZLES.length)} puzzles, ${String(CODEX.length)} codex, ${String(BARKS.length)} barks, ${String(MUTATORS.length)} mutators, ${String(CONTRACTS.length)} contracts`,
);
