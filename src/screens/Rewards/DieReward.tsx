import { Button, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { rarityColor } from "@/app/rarity";
import { tokens } from "@/app/theme";
import { DIE_BY_ID } from "@/data/dice";
import { schools } from "@/data/schools";
import { DECK_CAP, ptsForDie, sellValue } from "@/game/economy/prices";
import { resolveDieReward } from "@/game/run/flow";
import { resolveReducedMotion, useSettingsStore } from "@/stores/settingsStore";
import { useRunStore } from "@/stores/runStore";
import styles from "./Rewards.module.css";

export const DieReward = ({ dieId }: { dieId: string }) => {
  const { t } = useTranslation(["run", "battle", "content"]);
  const deckSize = useRunStore((s) => s.deck.length);
  const reduced = resolveReducedMotion(
    useSettingsStore((s) => s.reducedMotion),
  );
  const def = DIE_BY_ID.get(dieId);
  if (def === undefined) return null;

  const colors = schools[def.school];
  const deckFull = deckSize >= DECK_CAP;

  return (
    <div className={styles.overlay}>
      <Text className={styles.title} c={tokens.dim}>
        {t("run:rewards.dieTitle")}
      </Text>
      <div
        className={`${styles.card ?? ""} ${reduced ? "" : styles.reveal ?? ""}`}
        style={{ borderColor: rarityColor(def.rarity) }}
      >
        <Text className={styles.dieName} c={tokens.text}>
          {t(def.name)}
        </Text>
        <Text className={styles.tier} c={tokens.dim}>
          {`d${String(def.tier)}`}
        </Text>
        <span
          className={styles.chip}
          style={{ borderColor: colors.stroke, color: colors.text }}
        >
          {t(`battle:school.${def.school}`)}
        </span>
      </div>
      <div className={styles.actions}>
        <Button
          size="md"
          disabled={deckFull}
          onClick={() => {
            resolveDieReward(true);
          }}
        >
          {deckFull ? t("run:rewards.deckFull") : t("run:rewards.keep")}
        </Button>
        <Button
          size="md"
          variant="default"
          onClick={() => {
            resolveDieReward(false);
          }}
        >
          {t("run:rewards.sell", { n: sellValue(ptsForDie(dieId)) })}
        </Button>
      </div>
    </div>
  );
};
