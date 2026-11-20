import { DIE_BY_ID } from "@/data/dice";
import { forgeCodexId, fusionCodexId } from "@/data/codex";
import {
  forgeOptions,
  forgedDie,
  growthRefund,
  type ForgeOption,
} from "@/game/dice/forge";
import { noteFusion } from "@/game/meta/counters";
import { useMetaStore } from "@/stores/metaStore";
import { useRunStore } from "@/stores/runStore";

const sameOption = (a: ForgeOption, b: ForgeOption): boolean =>
  a.kind === "colour" && b.kind === "colour"
    ? a.signature === b.signature && a.consumed === b.consumed
    : a.kind === "recipe" && b.kind === "recipe"
      ? a.result === b.result &&
        new Set([a.first, a.second, b.first, b.second]).size === 2
      : false;

const optionUids = (option: ForgeOption): [string, string] =>
  option.kind === "colour"
    ? [option.signature, option.consumed]
    : [option.first, option.second];

export const forgeInRun = (option: ForgeOption): boolean => {
  const run = useRunStore.getState();
  const [firstUid, secondUid] = optionUids(option);
  const first = run.deck.find((die) => die.uid === firstUid);
  const second = run.deck.find((die) => die.uid === secondUid);
  if (first === undefined || second === undefined) return false;
  const legal = forgeOptions(first, second).find((candidate) =>
    sameOption(candidate, option),
  );
  if (legal === undefined) return false;
  if (!run.spendScrap(legal.cost)) return false;
  const school = DIE_BY_ID.get(first.defId)?.school;
  if (legal.kind === "recipe") {
    run.removeDie(first.uid);
    run.removeDie(second.uid);
    run.addDie(legal.result);
  } else {
    const signature = first.uid === legal.signature ? first : second;
    const consumed = first.uid === legal.signature ? second : first;
    useRunStore.setState((s) => ({
      deck: s.deck.flatMap((die) =>
        die.uid === consumed.uid
          ? []
          : die.uid === signature.uid
            ? [forgedDie(die, consumed)]
            : [die],
      ),
    }));
    const refund = growthRefund(consumed);
    if (refund > 0) useRunStore.getState().addScrap(refund);
  }
  noteFusion();
  if (school !== undefined) useMetaStore.getState().unlockCodex(forgeCodexId(school));
  if (legal.kind === "recipe") useMetaStore.getState().unlockCodex(fusionCodexId(legal.result));
  return true;
};
