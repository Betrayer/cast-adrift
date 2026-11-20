import { ascensionMods } from "@/data/ascension";
import { computeMutatorMods } from "@/data/mutators";
import { echoStartCharge } from "@/data/echo";
import { expandEncounterIds } from "@/data/enemies";
import { REAL_SCHOOL_ORDER } from "@/data/schools";
import { battleInitFromRun } from "@/game/run/battleInit";
import {
  buildEncounterIds,
  sectorDmgPct,
  sectorHpPct,
} from "@/game/run/encounter";
import { driftLoop, driftLoopHpPct } from "@/game/run/modes";
import { emitBark } from "@/game/narrative/barks";
import { nodeById, type MapNode } from "@/game/map/types";
import { autosaveRun } from "@/game/run/snapshot";
import {
  createStream,
  createStreams,
  deriveSeed,
  type RngStreams,
} from "@/services/rng";
import { useAppStore } from "@/stores/appStore";
import { useBattleStore } from "@/stores/battleStore";
import { useMetaStore } from "@/stores/metaStore";
import {
  useRunStore,
  type ConsumedBattleMods,
  type RunState,
} from "@/stores/runStore";
import type { School } from "@/types/content";
import type { FlagValue, ForcedBattle } from "@/types/events";

const STORM_SCHOOLS: readonly School[] = REAL_SCHOOL_ORDER;

const encounterInit = (pocket: boolean) => {
  const s = useRunStore.getState();
  const mods = ascensionMods(s.ascension);
  const mut = computeMutatorMods(s.mutators);
  return {
    ascension: s.ascension,
    sectorHpPct: sectorHpPct({ sector: s.sector, pocket }),
    sectorDmgPct: sectorDmgPct({ sector: s.sector }),
    enemyHpBonusPct:
      mods.enemyHpPct +
      mut.enemyHpPct +
      mut.copyHpPct +
      driftLoopHpPct(driftLoop(s.sectorIndex)),
    eliteShield: mods.eliteShield,
  };
};

const runBattleInit = (
  nodeKey: string,
  pocket = false,
  causality: { inverted?: boolean; storm?: boolean } = {},
) => {
  const s = useRunStore.getState();
  const mut = computeMutatorMods(s.mutators);
  const resonanceBoost =
    mut.resonanceBonus > 0
      ? {
          school: createStream(
            deriveSeed(s.seed, `storm:${nodeKey}`),
          ).pick(STORM_SCHOOLS),
          n: mut.resonanceBonus,
        }
      : undefined;
  return {
    ...battleInitFromRun(s, useMetaStore.getState().engravings),
    resonanceBoost,
    inverted: causality.inverted === true,
    nodeStorm: causality.storm === true,
    ...encounterInit(pocket),
  };
};

const enemyCopiesOf = (enemyIds: readonly string[]): string[] => {
  const copies = computeMutatorMods(useRunStore.getState().mutators).enemyCopies;
  const first = expandEncounterIds(enemyIds)[0];
  if (copies <= 0 || first === undefined) return [];
  return Array.from({ length: copies }, () => first);
};

const launchRunBattle = (
  s: RunState,
  enemyIds: string[],
  mods: ConsumedBattleMods,
  streams: RngStreams,
  nodeKey: string,
  node: MapNode | undefined,
): void => {
  const reinforcements = [
    ...Array.from({ length: mods.enemyPlus }, () => "scavDrone"),
    ...enemyCopiesOf(enemyIds),
  ];
  useBattleStore.getState().startBattle(
    {
      enemyIds,
      reinforcements,
      startCharge: mods.startCharge + echoStartCharge(s.echo),
      ...runBattleInit(nodeKey, node?.pocket === true, {
        inverted: node?.inverted,
        storm: node?.storm,
      }),
    },
    s.deck,
    streams,
  );
  useAppStore.getState().go("battle");
};

export const startBattleNode = (node: MapNode): void => {
  const s = useRunStore.getState();
  const mods = s.consumeBattleMods();
  const streams = createStreams(deriveSeed(s.seed, `node:${node.id}`));
  const encStream = createStream(deriveSeed(s.seed, `enc:${node.id}`));
  const enemyIds = buildEncounterIds(node.type, encStream, {
    sector: s.sector,
    flags: s.flags,
    usedMinibosses: s.usedMinibosses,
    seed: s.seed,
  });
  if (enemyIds.includes("bountyHuntress")) s.setFlag("hunterEngaged");
  if (node.type === "miniboss" && enemyIds[0] !== undefined) {
    s.markMinibossUsed(enemyIds[0]);
    emitBark("minibossIntro");
  }
  launchRunBattle(s, enemyIds, mods, streams, node.id, node);
};

export const startEventBattle = (follow: ForcedBattle): void => {
  const s = useRunStore.getState();
  if (s.map === null || s.position === null) return;
  const mods = s.consumeBattleMods();
  const enemyIds = [...follow.enemyIds];
  const streams = createStreams(deriveSeed(s.seed, `evbattle:${s.position}`));
  s.setPendingBattle({
    enemyIds: [...follow.enemyIds],
    originNodeId: s.position,
    scrap: follow.scrap ?? 0,
    lootDie: follow.loot?.die ?? null,
    lootRarity: follow.loot?.rarity ?? null,
    setFlags: (follow.setFlags ?? []).map(
      ([k, v]) => [k, v] as [string, FlagValue],
    ),
    clearFlags: [...(follow.clearFlags ?? [])],
  });
  launchRunBattle(
    s,
    enemyIds,
    mods,
    streams,
    `ev:${s.position}`,
    nodeById(s.map).get(s.position),
  );
  autosaveRun();
};
