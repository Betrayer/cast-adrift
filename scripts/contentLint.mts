import { STARTER_DECK } from "../src/data/decks";
import { BASIC_DICE } from "../src/data/dice/basic";
import { SECTOR1_ENEMIES } from "../src/data/enemies/sector1";
import { DIE_PTS } from "../src/data/tiers";

const errors: string[] = [];

const checkUniqueIds = (kind: string, ids: readonly string[]): void => {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) errors.push(`${kind}: duplicate id "${id}"`);
    seen.add(id);
  }
};

checkUniqueIds(
  "dice",
  BASIC_DICE.map((d) => d.id),
);
checkUniqueIds(
  "enemies",
  SECTOR1_ENEMIES.map((e) => e.id),
);

const dieIds = new Set(BASIC_DICE.map((d) => d.id));
for (const defId of STARTER_DECK) {
  if (!dieIds.has(defId))
    errors.push(`decks: STARTER_DECK references unknown die "${defId}"`);
}

for (const die of BASIC_DICE) {
  if (die.pts !== DIE_PTS[die.tier]) {
    errors.push(
      `dice: "${die.id}" pts ${String(die.pts)} !== DIE_PTS[${String(die.tier)}]`,
    );
  }
}

for (const enemy of SECTOR1_ENEMIES) {
  if (enemy.pattern.length === 0)
    errors.push(`enemies: "${enemy.id}" has an empty pattern`);
  if (enemy.hp <= 0) errors.push(`enemies: "${enemy.id}" hp must be positive`);
}

if (errors.length > 0) {
  for (const error of errors) console.error(`lint:content: ${error}`);
  process.exit(1);
}

console.log(
  `lint:content: ok — ${String(BASIC_DICE.length)} dice, ${String(SECTOR1_ENEMIES.length)} enemies, deck of ${String(STARTER_DECK.length)}`,
);
