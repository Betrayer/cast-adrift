import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ReplaceCard } from "@/components/ReplaceCard";
import { DECK_CAP } from "@/game/economy/prices";
import { autosaveRun } from "@/game/run/flow";
import {
  resolveSwapReplace,
  resolveSwapSell,
  swapValue,
} from "@/game/run/inventory";
import { useBackBlock } from "@/app/backGuard";
import { playSfx } from "@/services/audio";
import { haptic } from "@/services/tma";
import { runModuleSlots, useRunStore } from "@/stores/runStore";

export const ReplaceHost = () => {
  const { t } = useTranslation(["run", "battle", "content"]);
  const swap = useRunStore((s) =>
    s.active ? s.pendingSwaps[0] : undefined,
  );
  const deck = useRunStore((s) => s.deck);
  const modules = useRunStore((s) => s.modules);
  const cap = useRunStore(runModuleSlots);

  useBackBlock(swap !== undefined);

  useEffect(() => {
    if (swap === undefined) return;
    playSfx("eventOpen", { rate: 1.1, gain: 0.7 });
    haptic("reveal");
  }, [swap]);

  if (swap === undefined) return null;

  return (
    <ReplaceCard
      swap={swap}
      used={swap.kind === "die" ? deck.length : modules.length}
      cap={swap.kind === "die" ? DECK_CAP : cap}
      footerLabel={t("run:replace.sellNew", { n: swapValue(swap) })}
      onPick={(key) => {
        playSfx("buy");
        resolveSwapReplace(key);
        autosaveRun();
      }}
      onFooter={() => {
        playSfx("buy");
        resolveSwapSell();
        autosaveRun();
      }}
      onClose={() => undefined}
    />
  );
};
