import { Group, List, Paper, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { riseStyle } from "@/app/motion";
import { tokens } from "@/app/theme";
import { MasteryPips } from "@/components/MasteryPips";
import { ShipSilhouette } from "@/components/ShipSilhouette";
import { masteryNumeral } from "@/components/shipModel";
import {
  MASTERY_MAX_RANK,
  MASTERY_PASSIVE_RANK,
  masteryRankOf,
  masteryTableOf,
  nextMasteryRankXp,
} from "@/data/shipMastery";
import { SHIP_BY_ID, type ShipId } from "@/data/ships";
import { useMetaStore } from "@/stores/metaStore";

interface ShipMasteryPanelProps {
  shipId: ShipId;
}

const HULL_RANK = 1;
const RESERVE_RANK = 2;
const MK_RANK = 3;
const HIT_RANK = 4;

export const ShipMasteryPanel = ({ shipId }: ShipMasteryPanelProps) => {
  const { t } = useTranslation(["meta", "content"]);
  const xp = useMetaStore((s) => s.shipMastery[shipId]?.xp ?? 0);
  const def = SHIP_BY_ID.get(shipId);
  const table = masteryTableOf(shipId);
  if (def === undefined || table === undefined) return null;
  const rank = masteryRankOf(xp);
  const next = nextMasteryRankXp(xp);
  const passiveName = def.passiveIIName === undefined ? "" : t(def.passiveIIName);
  const bonuses = [
    { at: HULL_RANK, text: t("meta:hangar.mastery.hull", { n: table.hull }) },
    { at: RESERVE_RANK, text: t("meta:hangar.mastery.reserve", { n: table.reserve }) },
    { at: MK_RANK, text: t("meta:hangar.mastery.mk", { n: table.firstMkDiscountPct }) },
    { at: HIT_RANK, text: t("meta:hangar.mastery.hit", { n: table.firstHitReducePct }) },
    {
      at: MASTERY_PASSIVE_RANK,
      text: t("meta:hangar.mastery.passive", { name: passiveName }),
    },
  ];
  return (
    <Paper
      bg={tokens.surface1}
      p="md"
      radius="md"
      withBorder
      data-testid="hangar-hero"
      data-hangar-hero={shipId}
      data-mastery-rank={rank}
    >
      <Stack gap="xs">
        <ShipSilhouette shipId={shipId} masteryRank={rank} />
        <Group justify="space-between" wrap="wrap" gap={6}>
          <Group gap={8} wrap="nowrap">
            <Text size="sm" fw={700} c={tokens.text}>
              {t("meta:hangar.mastery.rank", { rank: masteryNumeral(rank) })}
            </Text>
            <MasteryPips rank={rank} />
          </Group>
          <Text size="xs" c={tokens.dim} data-testid="hangar-mastery-next">
            {next === null
              ? t("meta:hangar.mastery.max")
              : t("meta:hangar.mastery.next", {
                  xp,
                  next,
                  rank: masteryNumeral(Math.min(rank + 1, MASTERY_MAX_RANK)),
                })}
          </Text>
        </Group>
        <Text size="xs" c={tokens.faint}>
          {t("meta:hangar.mastery.title")}
        </Text>
        <List size="xs" spacing={2} listStyleType="none" data-mastery-bonuses>
          {bonuses.map((bonus, index) => (
            <List.Item
              key={bonus.at}
              data-mastery-bonus={bonus.at}
              data-rise
              style={riseStyle(index)}
            >
              <Text
                component="span"
                size="xs"
                c={rank >= bonus.at ? tokens.amber : tokens.faint}
              >
                {`${masteryNumeral(bonus.at)} · ${bonus.text}`}
              </Text>
            </List.Item>
          ))}
        </List>
        {def.passiveIIDesc === undefined ? null : (
          <Text size="xs" c={rank >= MASTERY_PASSIVE_RANK ? tokens.dim : tokens.faint}>
            {t(def.passiveIIDesc)}
          </Text>
        )}
      </Stack>
    </Paper>
  );
};
