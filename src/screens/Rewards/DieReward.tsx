import { Button, Text } from "@mantine/core";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { rarityColor } from "@/app/rarity";
import { tokens } from "@/app/theme";
import { LOOT_SFX } from "@/data/audio";
import { DieCard } from "@/components/DieCard";
import { DIE_BY_ID } from "@/data/dice";
import { DECK_CAP, ptsForDie, sellValue } from "@/game/economy/prices";
import { resolveDieReward } from "@/game/run/flow";
import { duckMusic, playSfx } from "@/services/audio";
import { haptic } from "@/services/tma";
import { useMetaStore } from "@/stores/metaStore";
import { resolveReducedMotion, useSettingsStore } from "@/stores/settingsStore";
import { useRunStore } from "@/stores/runStore";
import styles from "./Rewards.module.css";

export const DieReward = ({ dieId }: { dieId: string }) => {
  const { t } = useTranslation(["run", "battle", "content"]);
  const deckSize = useRunStore((s) => s.deck.length);
  const engravings = useMetaStore((s) => s.engravings);
  const reduced = resolveReducedMotion(
    useSettingsStore((s) => s.reducedMotion),
  );
  const rarity = DIE_BY_ID.get(dieId)?.rarity;

  useEffect(() => {
    if (rarity === undefined) return;
    playSfx(LOOT_SFX[rarity]);
    duckMusic(rarity === "legendary" ? 2000 : 1200);
    haptic("reveal");
  }, [rarity]);

  const def = DIE_BY_ID.get(dieId);
  if (def === undefined) return null;

  const deckFull = deckSize >= DECK_CAP;

  return (
    <div className={styles.overlay}>
      <Text className={styles.title} c={tokens.dim}>
        {t("run:rewards.dieTitle")}
      </Text>
      <div
        className={`${styles.card ?? ""} ${styles.cardDie ?? ""} ${reduced ? "" : styles.reveal ?? ""}`}
        style={{ borderColor: rarityColor(def.rarity) }}
      >
        <DieCard defId={dieId} plain engravings={engravings} />
      </div>
      <div className={styles.actions}>
        <Button
          size="md"
          disabled={deckFull}
          data-testid="reward-die-keep"
          onClick={() => {
            playSfx("optionTick", { rate: 1.12 });
            resolveDieReward(true);
          }}
        >
          {deckFull ? t("run:rewards.deckFull") : t("run:rewards.keep")}
        </Button>
        <Button
          size="md"
          variant="default"
          data-testid="reward-die-sell"
          onClick={() => {
            playSfx("buy");
            resolveDieReward(false);
          }}
        >
          {t("run:rewards.sell", { n: sellValue(ptsForDie(dieId)) })}
        </Button>
      </div>
    </div>
  );
};
