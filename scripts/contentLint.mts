import { STARTER_DECK } from "../src/data/decks";
import { ALL_DICE } from "../src/data/dice";
import {
  ENCOUNTER_GROUPS,
  SECTOR1_ENEMIES,
} from "../src/data/enemies/sector1";
import { RESONANCE_BONUSES } from "../src/data/resonance";
import { SHIPS } from "../src/data/ships";
import { DIE_PTS } from "../src/data/tiers";
import { HOOKS } from "../src/game/effects/types";
import enContent from "../src/i18n/en/content.json" with { type: "json" };
import type { EffectDef } from "../src/game/effects/types";
import type { Intent, PatternStep } from "../src/types/content";

const errors: string[] = [];
const hooks = new Set<string>(HOOKS);
const content = enContent as Record<string, Record<string, string>>;

const checkUniqueIds = (kind: string, ids: readonly string[]): void => {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) errors.push(`${kind}: duplicate id "${id}"`);
    seen.add(id);
  }
};

const checkLocKey = (owner: string, key: string | undefined): void => {
  if (key === undefined) return;
  const [ns, path] = key.split(":");
  if (ns !== "content" || path === undefined) return;
  const [group, leaf] = path.split(".");
  if (group === undefined || leaf === undefined || content[group]?.[leaf] === undefined) {
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
  SECTOR1_ENEMIES.map((e) => e.id),
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

const enemyIds = new Set(SECTOR1_ENEMIES.map((e) => e.id));

const flattenStep = (step: PatternStep): Intent[] =>
  "pick" in step ? step.pick.map(([intent]) => intent) : [step];

for (const enemy of SECTOR1_ENEMIES) {
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

if (errors.length > 0) {
  for (const error of errors) console.error(`lint:content: ${error}`);
  process.exit(1);
}

console.log(
  `lint:content: ok — ${String(ALL_DICE.length)} dice, ${String(RESONANCE_BONUSES.length)} resonance bonuses, ${String(SECTOR1_ENEMIES.length)} enemies, ${String(SHIPS.length)} ships`,
);
