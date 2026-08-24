import { Button, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { AppModal } from "@/components/AppModal";
import { tokens } from "@/app/theme";
import { schools } from "@/data/schools";
import { GENTLE_BUDGET, MAX_BUDGET } from "@/game/map/wormhole";
import styles from "./WormholeChoice.module.css";

interface Props {
  toll: number;
  gentle: boolean;
  busy: boolean;
  onBypass: () => void;
  onRide: () => void;
}

export const WormholeChoice = ({
  toll,
  gentle,
  busy,
  onBypass,
  onRide,
}: Props) => {
  const { t } = useTranslation(["run", "common"]);
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
            {t("run:hole.gentle")}
          </Text>
          <Text size="xs" c={tokens.dim}>
            {t("run:hole.gentleWhy")}
          </Text>
        </div>
      ) : null}
      <div className={styles.options}>
        <div className={styles.option}>
          <Button
            fullWidth
            variant="default"
            disabled={busy}
            data-testid="wormhole-bypass"
            onClick={onBypass}
          >
            {t("run:hole.bypass")}
          </Button>
          <Text
            size="xs"
            c={toll > 0 ? schools.red.text : tokens.faint}
            ta="center"
            data-testid="wormhole-toll"
            data-toll={String(toll)}
          >
            {toll > 0
              ? t("run:hole.bypassCost", { n: toll })
              : t("run:hole.bypassFree")}
          </Text>
        </div>
        <div className={styles.option}>
          <Button
            fullWidth
            disabled={busy}
            data-testid="wormhole-ride"
            onClick={onRide}
          >
            {t("run:hole.ride")}
          </Button>
          <Text size="xs" c={schools.black.text} ta="center">
            {gentle
              ? t("run:hole.rideGentle", { min: 1, max: GENTLE_BUDGET })
              : t("run:hole.rideCost", { min: 1, max: MAX_BUDGET })}
          </Text>
        </div>
      </div>
    </AppModal>
  );
};
