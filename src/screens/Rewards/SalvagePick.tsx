import { Button, Text } from "@mantine/core";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { tokens } from "@/app/theme";
import { SALVAGE_BY_ID } from "@/data/salvage";
import { resolveSalvagePick } from "@/game/run/flow";
import { playSfx } from "@/services/audio";
import { haptic } from "@/services/tma";
import { useReducedMotion } from "@/stores/settingsStore";
import styles from "./Rewards.module.css";

const CARD_FLIP_MS = 110;

export const SalvagePick = ({ faces }: { faces: readonly string[] }) => {
  const { t } = useTranslation(["run", "content"]);
  const reduced = useReducedMotion();

  useEffect(() => {
    haptic("reveal");
    const timers = faces.map((_, index) =>
      window.setTimeout(() => {
        playSfx("unlockCard", { rate: 1 + index * 0.05 });
      }, index * CARD_FLIP_MS),
    );
    return () => {
      for (const id of timers) window.clearTimeout(id);
    };
  }, [faces]);

  return (
    <div className={styles.overlay} data-salvage-pick>
      <Text className={styles.title} c={tokens.dim}>
        {t("run:salvage.title")}
      </Text>
      <div className={styles.salvageOptions}>
        {faces.map((id, index) => {
          const face = SALVAGE_BY_ID.get(id);
          if (face === undefined) return null;
          return (
            <div
              key={id}
              className={`${styles.card ?? ""} ${styles.salvageCard ?? ""} ${reduced ? "" : styles.reveal ?? ""}`}
              data-salvage={id}
              style={{
                borderColor: tokens.accent,
                animationDelay: reduced
                  ? undefined
                  : `${String(index * CARD_FLIP_MS)}ms`,
              }}
            >
              <div className={styles.salvageText}>
                <Text className={styles.dieName} c={tokens.text}>
                  {t(face.name)}
                </Text>
                <Text className={styles.tier} c={tokens.dim}>
                  {t(face.desc)}
                </Text>
              </div>
              <Button
                size="sm"
                className={styles.salvageTake}
                data-testid={`reward-salvage-${id}`}
                onClick={() => {
                  playSfx("optionTick", { rate: 1.08 });
                  resolveSalvagePick(id);
                }}
              >
                {t("run:salvage.take")}
              </Button>
            </div>
          );
        })}
      </div>
      <Button
        variant="subtle"
        color="gray"
        data-testid="reward-salvage-decline"
        onClick={() => {
          playSfx("optionTick", { rate: 0.88 });
          resolveSalvagePick(null);
        }}
      >
        {t("run:salvage.decline")}
      </Button>
      <Text size="xs" c={tokens.faint} ta="center">
        {t("run:salvage.hint")}
      </Text>
    </div>
  );
};
