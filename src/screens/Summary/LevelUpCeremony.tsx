import { Badge, Button, Paper, RingProgress, Text, Title } from "@mantine/core";
import { useEffect, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { tokens } from "@/app/theme";
import { ParticleRain } from "@/components/ParticleRain";
import { emitBark } from "@/game/narrative/barks";
import { rafClock, Tweens, UI_GROUP } from "@/pixi/tween";
import { duckMusic, playSfx } from "@/services/audio";
import { haptic } from "@/services/tma";
import styles from "./LevelUpCeremony.module.css";

const CARD_DELAY_MS = 620;
const CARD_STAGGER_MS = 240;

interface Props {
  fromLevel: number;
  toLevel: number;
  milestones: readonly string[];
  unlocks: readonly string[];
  reduced: boolean;
  onContinue: () => void;
}

export const LevelUpCeremony = ({
  fromLevel,
  toLevel,
  milestones,
  unlocks,
  reduced,
  onContinue,
}: Props) => {
  const { t } = useTranslation(["meta"]);
  const points = toLevel - fromLevel;

  useEffect(() => {
    emitBark("levelUp");
    playSfx("levelUp");
    duckMusic(2200);
    haptic("levelUp");
    const clock = rafClock();
    const tweens = new Tweens(clock);
    const cards = [...milestones, ...unlocks];
    tweens.channel(UI_GROUP).sequence([
      { delay: CARD_DELAY_MS },
      ...cards.map((_, index) => ({
        ms: CARD_STAGGER_MS,
        run: () => {
          playSfx("unlockCard", { rate: 1 + index * 0.06 });
        },
      })),
    ]);
    return () => {
      tweens.destroy();
      clock.destroy();
    };
  }, [milestones, unlocks]);

  const cls = (name: string): string => (reduced ? "" : (styles[name] ?? ""));

  const cardDelay = (index: number): CSSProperties | undefined =>
    reduced
      ? undefined
      : {
          animationDelay: `${String(CARD_DELAY_MS + index * CARD_STAGGER_MS)}ms`,
        };

  return (
    <div className={`${styles.overlay ?? ""}`}>
      {reduced ? null : (
        <ParticleRain
          color={tokens.amber}
          seedLabel="levelUpRain"
          className={styles.rain}
        />
      )}
      <div className={cls("ring")}>
        <RingProgress
          size={140}
          thickness={10}
          roundCaps
          sections={[{ value: 100, color: "accent" }]}
          label={
            <Text ta="center" size="xl" fw={800} c={tokens.text}>
              {toLevel}
            </Text>
          }
        />
      </div>
      <Title order={2} c={tokens.text} className={cls("level")}>
        {t("meta:levelup.level", { level: toLevel })}
      </Title>
      <Badge size="lg" color="accent" variant="light" className={cls("chip")}>
        {points > 1
          ? t("meta:levelup.points", { n: points })
          : t("meta:levelup.point")}
      </Badge>
      {milestones.map((label, i) => (
        <Paper
          key={i}
          bg={tokens.surface1}
          p="sm"
          radius="md"
          withBorder
          className={cls("card")}
          style={cardDelay(i)}
          maw={320}
          w="100%"
          data-milestone-card
        >
          <Text ta="center" c={tokens.amber} fw={600}>
            {t(label)}
          </Text>
        </Paper>
      ))}
      {unlocks.map((label, i) => (
        <Paper
          key={`unlock-${String(i)}`}
          bg={tokens.surface1}
          p="sm"
          radius="md"
          withBorder
          className={cls("card")}
          style={cardDelay(milestones.length + i)}
          maw={320}
          w="100%"
          data-unlock-card
        >
          <Text ta="center" size="xs" c={tokens.faint}>
            {t("meta:unlock.opened")}
          </Text>
          <Text ta="center" c={tokens.accent} fw={600}>
            {t(label)}
          </Text>
        </Paper>
      ))}
      <Button size="md" mt="sm" onClick={onContinue}>
        {t("meta:levelup.continue")}
      </Button>
    </div>
  );
};
