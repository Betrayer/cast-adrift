import { Button, Text, VisuallyHidden } from "@mantine/core";
import { useLayoutEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { MOTION_MS, riseStyle } from "@/app/motion";
import { tokens } from "@/app/theme";
import { rafTweens } from "@/pixi/tween";
import type { BattleTally } from "@/stores/runStore";
import { useReducedMotion } from "@/stores/settingsStore";
import styles from "./Rewards.module.css";

interface TallyRow {
  id: string;
  label: string;
  value: number;
  tone?: "amber" | "danger";
}

const TALLY_COUNT_DELAY_MS = MOTION_MS.m;

const TALLY_COUNT_MS = MOTION_MS.xl;

const COUNTED_ROWS: ReadonlySet<string> = new Set(["scrap"]);

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

const TallyCount = ({ value }: { value: number }) => {
  const reduced = useReducedMotion();
  const node = useRef<HTMLSpanElement | null>(null);

  useLayoutEffect(() => {
    const element = node.current;
    if (element === null) return;
    const { tweens, destroy } = rafTweens();
    const write = (shown: number): void => {
      element.textContent = String(shown);
    };
    element.dataset.count = "running";
    tweens.count(0, value, TALLY_COUNT_MS, write, {
      reduced,
      delay: TALLY_COUNT_DELAY_MS,
      onComplete: () => {
        element.dataset.count = "done";
      },
    });
    return () => {
      destroy();
      write(value);
      element.dataset.count = "done";
    };
  }, [value, reduced]);

  return <span ref={node} aria-hidden />;
};

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
        {tallyRows(tally).map((row, index) => (
          <div
            key={row.id}
            className={styles.tallyRow}
            data-tally-row={row.id}
            data-rise
            style={riseStyle(index)}
          >
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
              {COUNTED_ROWS.has(row.id) ? (
                <TallyCount value={row.value} />
              ) : (
                row.value
              )}
            </Text>
            {COUNTED_ROWS.has(row.id) ? (
              <VisuallyHidden data-tally-spoken={row.id}>
                {row.value}
              </VisuallyHidden>
            ) : null}
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
