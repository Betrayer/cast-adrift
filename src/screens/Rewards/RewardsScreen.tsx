import { useEffect } from "react";
import { Screen } from "@/app/Screen";
import { finishRewards } from "@/game/run/flow";
import { useRunStore } from "@/stores/runStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { BattleTallyPanel } from "./BattleTallyPanel";
import { DieReward } from "./DieReward";
import { PackageReward } from "./PackageReward";
import { PerkDraft } from "./PerkDraft";

export const RewardsScreen = () => {
  const pending = useRunStore((s) => s.pendingRewards);
  const tally = useRunStore((s) => s.lastTally);
  const skipTally = useSettingsStore((s) => s.skipTally);
  const showTally = tally !== null && !skipTally;
  const noRewards =
    pending === null ||
    (pending.dieDrop === null &&
      pending.perkChoices.length === 0 &&
      (pending.dieChoices ?? []).length === 0 &&
      (pending.moduleChoices ?? []).length === 0);
  const done = noRewards && !showTally;

  useEffect(() => {
    if (done) finishRewards();
  }, [done]);

  if (done) return <Screen />;

  const packaged =
    pending !== null &&
    ((pending.dieChoices ?? []).length > 0 ||
      (pending.moduleChoices ?? []).length > 0);

  return (
    <Screen centered width="wide">
      {showTally && tally !== null ? (
        <BattleTallyPanel
          tally={tally}
          {...(noRewards
            ? {
                onContinue: () => {
                  useRunStore.getState().clearBattleTally();
                  finishRewards();
                },
              }
            : {})}
        />
      ) : null}
      {pending === null ? null : packaged ? (
        <PackageReward
          choices={pending.dieChoices ?? []}
          moduleChoices={pending.moduleChoices ?? []}
        />
      ) : pending.dieDrop !== null ? (
        <DieReward dieId={pending.dieDrop} />
      ) : pending.perkChoices.length > 0 ? (
        <PerkDraft choices={pending.perkChoices} />
      ) : null}
    </Screen>
  );
};
