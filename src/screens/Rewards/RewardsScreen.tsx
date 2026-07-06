import { Box } from "@mantine/core";
import { useEffect } from "react";
import { tokens } from "@/app/theme";
import { finishRewards } from "@/game/run/flow";
import { useRunStore } from "@/stores/runStore";
import { DieReward } from "./DieReward";
import { PerkDraft } from "./PerkDraft";

export const RewardsScreen = () => {
  const pending = useRunStore((s) => s.pendingRewards);
  const done =
    pending === null ||
    (pending.dieDrop === null && pending.perkChoices.length === 0);

  useEffect(() => {
    if (done) finishRewards();
  }, [done]);

  if (pending === null) return <Box bg={tokens.bg} mih="100dvh" />;
  if (pending.dieDrop !== null) return <DieReward dieId={pending.dieDrop} />;
  if (pending.perkChoices.length > 0)
    return <PerkDraft choices={pending.perkChoices} />;
  return <Box bg={tokens.bg} mih="100dvh" />;
};
