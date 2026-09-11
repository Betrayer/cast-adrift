import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ReplaceCard } from "@/components/ReplaceCard";
import { CABIN_CAP } from "@/data/officers";
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
  const officers = useRunStore((s) => s.officers);
  const cap = useRunStore(runModuleSlots);

  useBackBlock(swap !== undefined);

  useEffect(() => {
    if (swap === undefined) return;
    playSfx("eventOpen", { rate: 1.1, gain: 0.7 });
    haptic("reveal");
  }, [swap]);

  if (swap === undefined) return null;

  const used =
    swap.kind === "die"
      ? deck.length
      : swap.kind === "module"
        ? modules.length
        : officers.length;
  const max =
    swap.kind === "die" ? DECK_CAP : swap.kind === "module" ? cap : CABIN_CAP;

  return (
    <ReplaceCard
      swap={swap}
      used={used}
      cap={max}
      footerLabel={
        swap.kind === "officer"
          ? t("run:replace.declineOfficer")
          : t("run:replace.sellNew", { n: swapValue(swap) })
      }
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
