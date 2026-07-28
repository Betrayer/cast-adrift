import { Button, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { rarityColor } from "@/app/rarity";
import { tokens } from "@/app/theme";
import { PERK_BY_ID } from "@/data/perks";
import { SKIP_SCRAP } from "@/game/run/perkDraft";
import { resolvePerkChoice } from "@/game/run/flow";
import { resolveReducedMotion, useSettingsStore } from "@/stores/settingsStore";
import styles from "./Rewards.module.css";

export const PerkDraft = ({ choices }: { choices: readonly string[] }) => {
  const { t } = useTranslation(["run", "content"]);
  const reduced = resolveReducedMotion(
    useSettingsStore((s) => s.reducedMotion),
  );

  return (
    <div className={styles.overlay}>
      <Text className={styles.title} c={tokens.dim}>
        {t("run:perk.title")}
      </Text>
      <div className={styles.perkRow}>
        {choices.map((id, index) => {
          const perk = PERK_BY_ID.get(id);
          if (perk === undefined) return null;
          return (
            <div
              key={id}
              className={styles.perkCard}
              style={{
                borderColor: rarityColor(perk.rarity),
                animationDelay: reduced ? undefined : `${String(index * 90)}ms`,
                animation: reduced ? "none" : undefined,
              }}
            >
              <Text fw={700} c={tokens.text}>
                {t(perk.name)}
              </Text>
              <Text size="sm" c={tokens.dim} style={{ flex: 1 }}>
                {t(perk.desc)}
              </Text>
              <Button
                size="sm"
                fullWidth
                onClick={() => {
                  resolvePerkChoice(id);
                }}
              >
                {t("run:perk.pick")}
              </Button>
            </div>
          );
        })}
      </div>
      <Button
        variant="subtle"
        color="gray"
        onClick={() => {
          resolvePerkChoice(null);
        }}
      >
        {t("run:perk.skip", { n: SKIP_SCRAP })}
      </Button>
    </div>
  );
};
