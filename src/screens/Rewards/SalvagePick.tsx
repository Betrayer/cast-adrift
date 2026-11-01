import { Button, Text } from "@mantine/core";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { tokens } from "@/app/theme";
import { SALVAGE_BY_ID } from "@/data/salvage";
import { resolveSalvagePick } from "@/game/run/flow";
import { playSfx } from "@/services/audio";
import { haptic } from "@/services/tma";
import {
  entranceCardStyle,
  useCardRevealSfx,
  useEntranceRow,
} from "./entrance";
import styles from "./Rewards.module.css";

export const SalvagePick = ({ faces }: { faces: readonly string[] }) => {
  const { t } = useTranslation(["run", "content"]);
  const { entrance, row } = useEntranceRow(faces.join("|"));

  useEffect(() => {
    haptic("reveal");
  }, [faces]);
  useCardRevealSfx(faces, 0.05);

  return (
    <div className={styles.overlay} data-salvage-pick>
      <Text className={styles.title} c={tokens.dim}>
        {t("run:salvage.title")}
      </Text>
      <div
        ref={row}
        className={styles.salvageOptions}
        data-entrance={entrance}
      >
        {faces.map((id, index) => {
          const face = SALVAGE_BY_ID.get(id);
          if (face === undefined) return null;
          return (
            <div
              key={id}
              className={`${styles.card ?? ""} ${styles.salvageCard ?? ""} ${styles.entryCard ?? ""}`}
              data-salvage={id}
              data-entrance-card={index}
              style={{
                borderColor: tokens.accent,
                ...entranceCardStyle(index, faces.length),
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
