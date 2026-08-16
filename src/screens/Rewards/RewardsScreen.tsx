import { useEffect } from "react";
import { Screen } from "@/app/Screen";
import { finishRewards } from "@/game/run/flow";
import { useRunStore } from "@/stores/runStore";
import { DieReward } from "./DieReward";
import { PackageReward } from "./PackageReward";
import { PerkDraft } from "./PerkDraft";

export const RewardsScreen = () => {
  const pending = useRunStore((s) => s.pendingRewards);
  const done =
    pending === null ||
    (pending.dieDrop === null &&
      pending.perkChoices.length === 0 &&
      (pending.dieChoices ?? []).length === 0 &&
      (pending.moduleChoices ?? []).length === 0);

  useEffect(() => {
    if (done) finishRewards();
  }, [done]);

  if (pending === null) return <Screen />;
  const packaged =
    (pending.dieChoices ?? []).length > 0 ||
    (pending.moduleChoices ?? []).length > 0;
  return (
    <Screen centered width="wide">
      {packaged ? (
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
