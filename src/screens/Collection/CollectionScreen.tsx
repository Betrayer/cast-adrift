import {
  Badge,
  Button,
  Group,
  Paper,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { tokens } from "@/app/theme";
import { DIE_BY_ID } from "@/data/dice";
import { schools } from "@/data/schools";
import { diePoints } from "@/data/metaShop";
import { useAppStore } from "@/stores/appStore";
import { useMetaStore } from "@/stores/metaStore";
import type { DieTier, School } from "@/types/content";

const SCHOOLS: readonly (School | "all")[] = [
  "all",
  "red",
  "blue",
  "green",
  "yellow",
  "black",
  "grey",
  "prismatic",
];
const TIERS: readonly (DieTier | 0)[] = [0, 4, 6, 8, 10, 12, 20, 100];

export const CollectionScreen = () => {
  const { t } = useTranslation(["meta", "common", "content"]);
  const go = useAppStore((s) => s.go);
  const collection = useMetaStore((s) => s.collection);
  const [schoolFilter, setSchoolFilter] = useState<School | "all">("all");
  const [tierFilter, setTierFilter] = useState<number>(0);

  const owned = [...collection].filter((e) => e.count > 0);
  const filtered = owned.filter((e) => {
    const def = DIE_BY_ID.get(e.defId);
    if (def === undefined) return false;
    if (schoolFilter !== "all" && def.school !== schoolFilter) return false;
    if (tierFilter !== 0 && def.tier !== tierFilter) return false;
    return true;
  });

  return (
    <Stack align="center" mih="100dvh" p="md" bg={tokens.bg} gap="sm">
      <Paper bg={tokens.surface1} p="md" radius="md" withBorder maw={460} w="100%">
        <Group justify="space-between" mb="xs">
          <Text fw={700} c={tokens.text}>
            {t("meta:collection.title")}
          </Text>
          <Button size="xs" variant="default" onClick={() => { go("menu"); }}>
            {t("common:back")}
          </Button>
        </Group>
        <Text size="xs" c={tokens.faint} mb="xs">
          {t("meta:collection.count", { n: owned.reduce((a, e) => a + e.count, 0) })}
        </Text>
        <Group gap="xs">
          <Select
            size="xs"
            w={130}
            value={schoolFilter}
            onChange={(v) => { setSchoolFilter((v as School | "all") ?? "all"); }}
            data={SCHOOLS.map((s) => ({
              value: s,
              label:
                s === "all"
                  ? t("meta:hangar.filterAll")
                  : t(`meta:constellation.${s}`),
            }))}
          />
          <Select
            size="xs"
            w={130}
            value={String(tierFilter)}
            onChange={(v) => { setTierFilter(Number(v ?? 0)); }}
            data={TIERS.map((tier) => ({
              value: String(tier),
              label: tier === 0 ? t("meta:hangar.filterAll") : `d${String(tier)}`,
            }))}
          />
        </Group>
      </Paper>

      <Paper bg={tokens.surface1} p="md" radius="md" withBorder maw={460} w="100%">
        <ScrollArea h={420}>
          <SimpleGrid cols={2} spacing="xs">
            {filtered.map((entry) => {
              const def = DIE_BY_ID.get(entry.defId);
              if (def === undefined) return null;
              return (
                <Paper
                  key={entry.defId}
                  p="xs"
                  radius="md"
                  withBorder
                  bg={schools[def.school].fill}
                >
                  <Group justify="space-between">
                    <Text size="sm" style={{ color: schools[def.school].text }}>
                      {t(def.name)}
                    </Text>
                    <Badge size="sm" variant="light" color="gray">
                      {t("meta:collection.owned", { n: entry.count })}
                    </Badge>
                  </Group>
                  <Text size="xs" c={tokens.faint}>
                    d{def.tier} · {def.rarity} · {diePoints(entry.defId)} pts
                  </Text>
                </Paper>
              );
            })}
          </SimpleGrid>
        </ScrollArea>
      </Paper>
    </Stack>
  );
};
