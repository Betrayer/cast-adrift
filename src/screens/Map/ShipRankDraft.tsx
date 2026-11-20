import { Button, Text } from "@mantine/core";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MOTION_MS, riseStyle } from "@/app/motion";
import { tokens } from "@/app/theme";
import { AppModal } from "@/components/AppModal";
import { ShipSilhouette } from "@/components/ShipSilhouette";
import { PERK_BY_ID } from "@/data/perks";
import { openDraftRank, SHIP_RANK_MAX } from "@/data/shipRanks";
import { pickShipPerk, rerollShipDraft } from "@/game/run/shipRanks";
import { shipDraftRerollAllowed } from "@/game/run/shipRules";
import { useRunStore } from "@/stores/runStore";
import { haptic } from "@/services/tma";
import { useReducedMotion } from "@/stores/settingsStore";
import styles from "./ShipRankDraft.module.css";

const INSTALL_HOLD_MS = MOTION_MS.xl + MOTION_MS.m;

const REDUCED_HOLD_MS = MOTION_MS.m;

export const ShipRankDraft = () => {
  const { t } = useTranslation(["run", "content"]);
  const cards = useRunStore((s) => s.pendingShipDraft);
  const xp = useRunStore((s) => s.shipRankXp);
  const pending = useRunStore((s) => s.pendingRankUps);
  const masteryRank = useRunStore((s) => s.masteryRank);
  const rerollUsed = useRunStore((s) => s.shipDraftRerollUsed);
  const shipId = useRunStore((s) => s.shipId);
  const perks = useRunStore((s) => s.perks);
  const reduced = useReducedMotion();
  const [installing, setInstalling] = useState<string | null>(null);
  const open = cards.length > 0;
  const draftRank = openDraftRank(xp, pending);
  useEffect(() => {
    if (open) haptic("reveal");
  }, [open, draftRank]);
  useEffect(() => {
    if (installing === null) return undefined;
    const id = window.setTimeout(() => {
      setInstalling(null);
      pickShipPerk(installing);
    }, reduced ? REDUCED_HOLD_MS : INSTALL_HOLD_MS);
    return () => {
      window.clearTimeout(id);
    };
  }, [installing, reduced]);
  if (cards.length === 0) return null;
  const rank = draftRank;
  const canReroll = shipDraftRerollAllowed(masteryRank) && !rerollUsed;
  const choose = (id: string): void => {
    if (installing !== null) return;
    setInstalling(id);
    haptic("levelUp");
  };
  return (
    <AppModal
      label={t("run:shipRank.title", { rank, max: SHIP_RANK_MAX })}
      testId="ship-rank-draft"
      dismiss="none"
      onClose={() => undefined}
      className={styles.card ?? ""}
    >
      <Text fw={700}>{t("run:shipRank.title", { rank, max: SHIP_RANK_MAX })}</Text>
      <ShipSilhouette
        shipId={shipId}
        masteryRank={masteryRank}
        perks={installing === null ? perks : [...perks, installing]}
        size="summary"
      />
      <Text size="sm" c={tokens.dim}>
        {t("run:shipRank.body")}
      </Text>
      <div className={styles.options} data-ship-draft-cards={cards.length}>
        {cards.map((id, index) => {
          const def = PERK_BY_ID.get(id);
          if (def === undefined) return null;
          return (
            <Button
              key={id}
              variant="default"
              fullWidth
              h="auto"
              className={styles.perk}
              styles={{
                inner: { height: "auto", justifyContent: "flex-start" },
                label: { height: "auto", overflow: "visible", whiteSpace: "normal", width: "100%" },
              }}
              disabled={installing !== null}
              data-rise
              style={riseStyle(index)}
              data-ship-perk={id}
              data-testid={`ship-rank-pick-${id}`}
              onClick={() => {
                choose(id);
              }}
            >
              <span className={styles.perkBody}>
                <span className={styles.perkName}>{t(def.name)}</span>
                <span className={styles.perkDesc}>{t(def.desc)}</span>
              </span>
            </Button>
          );
        })}
      </div>
      {canReroll ? (
        <Button
          variant="subtle"
          data-testid="ship-rank-reroll"
          disabled={installing !== null}
          onClick={rerollShipDraft}
        >
          {t("run:shipRank.reroll")}
        </Button>
      ) : null}
    </AppModal>
  );
};
