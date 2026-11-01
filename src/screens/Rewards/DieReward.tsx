import { OwnedLine } from "@/components/OwnedLine";
import { Button, Text } from "@mantine/core";
import { useEffect, useMemo, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { springLinearCss } from "@/app/motion";
import { dieFrameColor } from "@/app/rarity";
import { useRollSettings } from "@/app/rollSettings";
import { auraHostClass, LegendaryAura } from "@/components/LegendaryAura";
import { tokens } from "@/app/theme";
import { DiceRollOverlay } from "@/components/DiceRollOverlay";
import { DieCard } from "@/components/DieCard";
import { showcaseDie } from "@/components/showcaseDie";
import { DIE_BY_ID } from "@/data/dice";
import { handDie } from "@/game/dice/tier";
import { HAND_CAP, ptsForDie, sellValue } from "@/game/economy/prices";
import { resolveDieReward } from "@/game/run/flow";
import { playLootCue, playSfx } from "@/services/audio";
import { deriveSeed } from "@/services/rng";
import { haptic } from "@/services/tma";
import { useMetaStore } from "@/stores/metaStore";
import { useRunStore } from "@/stores/runStore";
import { entranceCardStyle, useEntranceRow } from "./entrance";
import styles from "./Rewards.module.css";

const REWARD_DIE_SIZE = 72;

const CARD_SPRING = springLinearCss();

export const DieReward = ({ dieId }: { dieId: string }) => {
  const { t } = useTranslation(["run", "battle", "content"]);
  const deckSize = useRunStore((s) => s.deck.length);
  const runSeed = useRunStore((s) => s.seed);
  const engravings = useMetaStore((s) => s.engravings);
  const { entrance, row } = useEntranceRow(dieId);
  const roll = useRollSettings();
  const rarity = DIE_BY_ID.get(dieId)?.rarity;
  const showcase = useMemo(() => {
    const die = showcaseDie(handDie(dieId), `reward-${dieId}`);
    return die === null ? [] : [die];
  }, [dieId]);
  const rollSeed = useMemo(
    () => deriveSeed(runSeed, `reward-die:${dieId}`),
    [runSeed, dieId],
  );

  useEffect(() => {
    if (rarity === undefined) return;
    playLootCue(rarity);
    haptic("reveal");
  }, [rarity]);

  const def = DIE_BY_ID.get(dieId);
  if (def === undefined) return null;

  const deckFull = deckSize >= HAND_CAP;

  return (
    <div className={styles.overlay}>
      <Text className={styles.title} c={tokens.dim}>
        {t("run:rewards.dieTitle")}
      </Text>
      <DiceRollOverlay
        dice={showcase}
        seed={rollSeed}
        style={roll.style}
        durationMs={roll.durationMs}
        reduced={roll.reduced}
        size={REWARD_DIE_SIZE}
        testId="reward-roll"
        onSettled={() => {
          haptic("resolveTick");
        }}
      />
      <div ref={row} className={styles.cardRow} data-entrance={entrance}>
        <div
          className={`${styles.card ?? ""} ${styles.cardDie ?? ""} ${styles.entryCard ?? ""} ${def.rarity === "legendary" ? auraHostClass : ""}`}
          style={
            {
              borderColor: dieFrameColor(def),
              "--ca-card-spring": CARD_SPRING,
              ...entranceCardStyle(0, 1),
            } as CSSProperties
          }
          data-rarity={def.rarity}
          data-school={def.school}
          data-entrance-card={0}
          data-spring="1"
        >
          {def.rarity === "legendary" ? <LegendaryAura defId={dieId} school={def.school} /> : null}
          <DieCard defId={dieId} plain aura={false} engravings={engravings} />
        </div>
      </div>
      <OwnedLine defId={dieId} />
      <div className={styles.actions}>
        <Button
          size="md"
          data-testid="reward-die-keep"
          onClick={() => {
            playSfx("optionTick", { rate: 1.12 });
            resolveDieReward(true);
          }}
        >
          {deckFull ? t("run:rewards.replace") : t("run:rewards.keep")}
        </Button>
        <Button
          size="md"
          variant="default"
          data-testid="reward-die-sell"
          onClick={() => {
            playSfx("buy");
            resolveDieReward(false);
          }}
        >
          {t("run:rewards.sell", { n: sellValue(ptsForDie(dieId)) })}
        </Button>
      </div>
    </div>
  );
};
