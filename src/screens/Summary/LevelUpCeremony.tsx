import { Badge, Button, Paper, RingProgress, Text, Title } from "@mantine/core";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { tokens } from "@/app/theme";
import { emitBark } from "@/game/narrative";
import { haptic } from "@/services/tma";
import styles from "./LevelUpCeremony.module.css";

interface Props {
  fromLevel: number;
  toLevel: number;
  milestones: readonly string[];
  reduced: boolean;
  onContinue: () => void;
}

export const LevelUpCeremony = ({
  fromLevel,
  toLevel,
  milestones,
  reduced,
  onContinue,
}: Props) => {
  const { t } = useTranslation(["meta"]);
  const points = toLevel - fromLevel;

  useEffect(() => {
    emitBark("levelUp");
    haptic("heavy");
  }, []);

  const cls = (name: string): string => (reduced ? "" : (styles[name] ?? ""));

  return (
    <div className={`${styles.overlay ?? ""}`}>
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
          maw={320}
          w="100%"
        >
          <Text ta="center" c={tokens.amber} fw={600}>
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
