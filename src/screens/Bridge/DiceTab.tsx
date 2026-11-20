import { Badge, Group, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { tokens } from "@/app/theme";
import { DieCard } from "@/components/DieCard";
import { DieCardTrigger } from "@/components/DieCardModal";
import { schools } from "@/data/schools";
import { handDieCardProps } from "@/game/dice/card";
import { deckResonance } from "@/game/effects/census";
import { HAND_CAP } from "@/game/economy/prices";
import { useMetaStore } from "@/stores/metaStore";
import { useRunStore } from "@/stores/runStore";
import type { School } from "@/types/content";
import styles from "./BridgeScreen.module.css";

export const DiceTab = () => {
  const { t } = useTranslation(["run", "battle", "content"]);
  const deck = useRunStore((s) => s.deck);
  const shipId = useRunStore((s) => s.shipId);
  const perks = useRunStore((s) => s.perks);
  const chartPicks = useRunStore((s) => s.chartPicks);
  const modules = useRunStore((s) => s.modules);
  const engravings = useMetaStore((s) => s.engravings);
  const masteryRank = useRunStore((s) => s.masteryRank);
  const resonance = deckResonance(deck, { shipId, masteryRank, perks, chartPicks, modules });
  return (
    <Stack gap="sm">
      <Text size="xs" c={tokens.faint}>
        {t("run:bridge.deckCount", { n: deck.length, max: HAND_CAP })}
      </Text>
      <Group gap={6} wrap="wrap" data-bridge-resonance>
        {(Object.keys(schools) as School[]).map((school) => {
          const count = resonance.counts[school];
          if (count === 0) return null;
          return (
            <Badge
              key={school}
              variant="light"
              color="gray"
              styles={{ label: { color: schools[school].text } }}
            >
              {`${t(`run:tag.${school}`)} ${String(count)}`}
            </Badge>
          );
        })}
      </Group>
      <div className={styles.deck}>
        {deck.map((die) => (
          <DieCardTrigger
            key={die.uid}
            {...handDieCardProps(die)}
            engravings={engravings}
            testId={`bridge-die-${die.uid}`}
          >
            <DieCard {...handDieCardProps(die)} engravings={engravings} />
          </DieCardTrigger>
        ))}
      </div>
      <Text size="xs" c={tokens.faint}>
        {t("run:bridge.sellDiceHint")}
      </Text>
    </Stack>
  );
};
