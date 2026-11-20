import { Button, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { AppModal } from "@/components/AppModal";
import { tokens } from "@/app/theme";
import { schools } from "@/data/schools";
import {
  GENTLE_RIDES,
  isGentleRide,
  MAX_EXTRA_ROWS,
  MAX_LANE_SHIFT,
} from "@/game/map/wormhole";
import {
  bypassCopyKey,
  bypassCopyVars,
  bypassState,
  bypassTollMark,
  type BypassOffer,
} from "./spot";
import styles from "./WormholeChoice.module.css";

interface Props {
  offer: BypassOffer;
  rides: number;
  unstable: boolean;
  softLand: boolean;
  softLandSpent: boolean;
  onBypass: () => void;
  onRide: () => void;
  onSoftLand: () => void;
}

export const WormholeChoice = ({
  offer,
  rides,
  unstable,
  softLand,
  softLandSpent,
  onBypass,
  onRide,
  onSoftLand,
}: Props) => {
  const { t } = useTranslation(["run", "common"]);
  const gentle = isGentleRide(rides);
  const state = bypassState(offer);
  return (
    <AppModal
      label={t("run:hole.title")}
      testId="wormhole-card"
      dismiss="none"
      onClose={() => undefined}
      className={styles.card ?? ""}
    >
      <div className={styles.head}>
        <span className={styles.glyph} aria-hidden="true" />
        <Text fw={700} c={schools.black.text}>
          {t("run:hole.title")}
        </Text>
      </div>
      <Text size="sm" c={tokens.dim}>
        {t("run:hole.body")}
      </Text>
      {gentle ? (
        <div className={styles.gentle} data-testid="wormhole-gentle">
          <Text size="xs" fw={700} c={schools.blue.text}>
            {t(unstable ? "run:hole.gentleUnstable" : "run:hole.gentle", {
              n: Math.min(GENTLE_RIDES, rides + 1),
              max: GENTLE_RIDES,
            })}
          </Text>
          <Text size="xs" c={tokens.dim}>
            {t(unstable ? "run:hole.gentleUnstableWhy" : "run:hole.gentleWhy")}
          </Text>
        </div>
      ) : null}
      <div className={styles.options}>
        <div className={styles.option}>
          <Button
            fullWidth
            variant="default"
            disabled={state !== "cost"}
            data-testid="wormhole-bypass"
            data-lethal={offer.lethal ? "1" : "0"}
            onClick={onBypass}
          >
            {t("run:hole.bypass")}
          </Button>
          <Text
            size="xs"
            c={state === "cost" ? schools.red.text : tokens.faint}
            ta="center"
            data-testid="wormhole-toll"
            data-toll={bypassTollMark(offer)}
          >
            {t(bypassCopyKey(offer), bypassCopyVars(offer))}
          </Text>
        </div>
        <div className={styles.option}>
          <Button
            fullWidth
            data-testid="wormhole-ride"
            onClick={onRide}
          >
            {t("run:hole.ride")}
          </Button>
          <Text size="xs" c={schools.black.text} ta="center">
            {gentle
              ? t(unstable ? "run:hole.rideGentleUnstable" : "run:hole.rideGentle")
              : t("run:hole.rideChaotic", {
                  min: 1,
                  max: MAX_EXTRA_ROWS + 1,
                  lanes: MAX_LANE_SHIFT,
                })}
          </Text>
        </div>
        {softLand ? (
          <div className={styles.option} data-testid="wormhole-soft">
            <Button
              fullWidth
              variant="default"
              disabled={softLandSpent}
              data-testid="wormhole-soft-land"
              onClick={onSoftLand}
            >
              {t("run:hole.softLand")}
            </Button>
            <Text
              size="xs"
              c={softLandSpent ? tokens.faint : schools.blue.text}
              ta="center"
              data-testid="wormhole-soft-why"
            >
              {t(softLandSpent ? "run:hole.softLandSpent" : "run:hole.softLandWhy")}
            </Text>
          </div>
        ) : null}
      </div>
    </AppModal>
  );
};
