import { Button, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { tokens } from "@/app/theme";
import type { BattleTally } from "@/stores/runStore";
import styles from "./Rewards.module.css";

interface TallyRow {
  id: string;
  label: string;
  value: number;
  tone?: "amber" | "danger";
}

export const tallyRows = (tally: BattleTally): readonly TallyRow[] =>
  [
    { id: "turns", label: "run:tally.turns", value: tally.turns },
    { id: "dealt", label: "run:tally.dealt", value: tally.damageDealt },
    {
      id: "taken",
      label: "run:tally.taken",
      value: tally.damageTaken,
      tone: "danger" as const,
    },
    { id: "shield", label: "run:tally.shield", value: tally.shieldAbsorbed },
    { id: "best", label: "run:tally.best", value: tally.spinalMaxHit },
    { id: "rerolls", label: "run:tally.rerolls", value: tally.rerollsUsed },
    { id: "placed", label: "run:tally.placed", value: tally.dicePlaced },
    {
      id: "scrap",
      label: "run:tally.scrap",
      value: tally.scrap,
      tone: "amber" as const,
    },
  ].filter((row) => row.id === "turns" || row.value > 0);

interface BattleTallyPanelProps {
  tally: BattleTally;
  onContinue?: () => void;
}

export const BattleTallyPanel = ({
  tally,
  onContinue,
}: BattleTallyPanelProps) => {
  const { t } = useTranslation(["run"]);
  return (
    <div className={styles.tally} data-battle-tally={tally.won ? "win" : "loss"}>
      <Text className={styles.tallyTitle} c={tokens.dim}>
        {t(tally.won ? "run:tally.title" : "run:tally.titleLoss")}
      </Text>
      <div className={styles.tallyGrid}>
        {tallyRows(tally).map((row) => (
          <div key={row.id} className={styles.tallyRow} data-tally-row={row.id}>
            <Text size="xs" c={tokens.faint}>
              {t(row.label)}
            </Text>
            <Text
              size="sm"
              fw={700}
              c={
                row.tone === "amber"
                  ? tokens.amber
                  : row.tone === "danger"
                    ? tokens.danger
                    : tokens.text
              }
              data-tally-value={row.id}
            >
              {row.value}
            </Text>
          </div>
        ))}
      </div>
      <Text size="xs" c={tokens.faint}>
        {t("run:tally.hull", { cur: tally.hull, max: tally.hullMax })}
      </Text>
      {onContinue === undefined ? null : (
        <Button
          size="md"
          mt="sm"
          data-testid="tally-continue"
          onClick={onContinue}
        >
          {t("run:tally.continue")}
        </Button>
      )}
    </div>
  );
};
