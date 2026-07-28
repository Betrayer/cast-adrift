import { Button, Group, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { tokens } from "@/app/theme";
import { DIE_BY_ID } from "@/data/dice";
import { MODULE_BY_ID, moduleSlots } from "@/data/modules";
import { schools } from "@/data/schools";
import { DECK_CAP, ptsForDie, sellValue } from "@/game/economy/prices";
import { resolveDieChoice, resolveModuleChoice } from "@/game/run/flow";
import { computeRunMods } from "@/game/run/runMods";
import { resolveReducedMotion, useSettingsStore } from "@/stores/settingsStore";
import { useRunStore } from "@/stores/runStore";
import styles from "./Rewards.module.css";

interface PackageRewardProps {
  choices: readonly string[];
  moduleChoices: readonly string[];
}

export const PackageReward = ({
  choices,
  moduleChoices,
}: PackageRewardProps) => {
  const { t } = useTranslation(["run", "battle", "content"]);
  const deckSize = useRunStore((s) => s.deck.length);
  const vouchers = useRunStore((s) => s.vouchers);
  const chartPicks = useRunStore((s) => s.chartPicks);
  const perks = useRunStore((s) => s.perks);
  const runModules = useRunStore((s) => s.modules);
  const packageScrap = useRunStore((s) => s.pendingRewards?.packageScrap ?? 0);
  const reduced = resolveReducedMotion(
    useSettingsStore((s) => s.reducedMotion),
  );
  const deckFull = deckSize >= DECK_CAP;
  const bayFull =
    runModules.length >=
    moduleSlots(computeRunMods(perks, chartPicks).moduleSlotDelta);

  return (
    <div className={styles.overlay}>
      <Text className={styles.title} c={tokens.dim}>
        {t("run:package.title")}
      </Text>
      <Stack gap={4} align="center">
        {packageScrap > 0 ? (
          <Text size="sm" c={tokens.amber}>
            {t("run:package.scrap", { n: packageScrap })}
          </Text>
        ) : null}
        {vouchers > 0 ? (
          <Text size="sm" c={tokens.accent}>
            {t("run:package.voucher", { n: vouchers })}
          </Text>
        ) : null}
      </Stack>
      <Group gap="md" justify="center">
        {choices.map((dieId, index) => {
          const def = DIE_BY_ID.get(dieId);
          if (def === undefined) return null;
          const colors = schools[def.school];
          return (
            <div
              key={`${dieId}-${String(index)}`}
              className={`${styles.card ?? ""} ${reduced ? "" : styles.reveal ?? ""}`}
              style={{
                borderColor: colors.stroke,
                animationDelay: reduced ? undefined : `${String(index * 140)}ms`,
              }}
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
              <Button
                size="sm"
                mt="sm"
                fullWidth
                onClick={() => {
                  resolveDieChoice(dieId);
                }}
              >
                {deckFull
                  ? t("run:package.sell", { n: sellValue(ptsForDie(dieId)) })
                  : t("run:package.take")}
              </Button>
            </div>
          );
        })}
        {moduleChoices.map((moduleId, index) => {
          const def = MODULE_BY_ID.get(moduleId);
          if (def === undefined) return null;
          return (
            <div
              key={moduleId}
              className={`${styles.card ?? ""} ${reduced ? "" : styles.reveal ?? ""}`}
              style={{
                borderColor: tokens.accent,
                animationDelay: reduced
                  ? undefined
                  : `${String((choices.length + index) * 140)}ms`,
              }}
            >
              <Text className={styles.dieName} c={tokens.text}>
                {t(def.name)}
              </Text>
              <Text className={styles.tier} c={tokens.dim}>
                {t(def.desc)}
              </Text>
              <span
                className={styles.chip}
                style={{ borderColor: tokens.accent, color: tokens.accent }}
              >
                {t("run:package.module")}
              </span>
              <Button
                size="sm"
                mt="sm"
                fullWidth
                onClick={() => {
                  resolveModuleChoice(moduleId);
                }}
              >
                {bayFull
                  ? t("run:package.sell", { n: def.price })
                  : t("run:package.install")}
              </Button>
            </div>
          );
        })}
      </Group>
      <Text size="xs" c={tokens.faint}>
        {t("run:package.hint")}
      </Text>
    </div>
  );
};
