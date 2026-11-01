import { Button, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useSweepWhen } from "@/app/motion";
import { tokens } from "@/app/theme";
import type { PuzzleTier } from "@/data/puzzles";
import { schools } from "@/data/schools";
import { TierBadge } from "@/components/TierBadge";
import { bypassState, bypassTollMark, type BypassOffer } from "./spot";
import styles from "./MapScreen.module.css";

interface MapFooterProps {
  anomalyTier: PuzzleTier | null;
  lines: readonly string[];
  bypassLine: string | null;
  bypassOffer: BypassOffer | null;
  canJump: boolean;
  hasSelection: boolean;
  onJump: () => void;
  onAbandon: () => void;
}

export const MapFooter = ({
  anomalyTier,
  lines,
  bypassLine,
  bypassOffer,
  canJump,
  hasSelection,
  onJump,
  onAbandon,
}: MapFooterProps) => {
  const { t } = useTranslation(["run"]);

  const attachJump = useSweepWhen<HTMLButtonElement>(canJump);

  return (
    <div className={styles.footer}>
      {anomalyTier === null ? null : (
        <div className={styles.previewBadge}>
          <TierBadge
            tier={anomalyTier}
            label={t(`run:anomaly.tierName.${String(anomalyTier)}`)}
          />
        </div>
      )}
      {lines.map((line, index) => (
        <Text
          key={line}
          size="xs"
          c={index === 0 ? tokens.dim : schools.red.text}
          ta="center"
          fw={index === 0 ? 400 : 600}
          data-preview-bypass={
            line === bypassLine && bypassOffer !== null
              ? bypassState(bypassOffer)
              : undefined
          }
          data-toll={
            line === bypassLine && bypassOffer !== null
              ? bypassTollMark(bypassOffer)
              : undefined
          }
        >
          {line}
        </Text>
      ))}
      <Button
        ref={attachJump}
        size="md"
        fullWidth
        disabled={!canJump}
        onClick={onJump}
        className={styles.jumpSweep}
        data-sweep-host
        data-coach="jump"
        data-testid="map-jump"
      >
        {t("run:map.jump")}
      </Button>
      {hasSelection ? null : (
        <Text size="xs" c={tokens.faint} ta="center">
          {t("run:map.jumpHint")}
        </Text>
      )}
      <Button
        size="compact-xs"
        variant="subtle"
        color="gray"
        data-testid="map-abandon"
        onClick={onAbandon}
      >
        {t("run:map.abandon")}
      </Button>
    </div>
  );
};
