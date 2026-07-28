import {
  Badge,
  Button,
  Divider,
  Group,
  Paper,
  Progress,
  ScrollArea,
  SegmentedControl,
  Select,
  Stack,
  Text,
} from "@mantine/core";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { tokens } from "@/app/theme";
import { ALL_DICE, DIE_BY_ID } from "@/data/dice";
import { schools } from "@/data/schools";
import { PLAYABLE_SHIPS } from "@/data/ships";
import { diePoints, metaDiePrice } from "@/data/metaShop";
import { hubBudgetBonus } from "@/game/chart/engine";
import { validateDeck } from "@/game/meta/deck";
import { ENGRAVING_STATION_LEVEL, hangarBudget } from "@/data/milestones";
import { useAppStore } from "@/stores/appStore";
import { useMetaStore } from "@/stores/metaStore";
import type { DieItemDef, Rarity, School } from "@/types/content";

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
const RARITIES: readonly (Rarity | "all")[] = [
  "all",
  "common",
  "uncommon",
  "rare",
  "legendary",
];

const dieLabel = (def: DieItemDef, t: (k: string) => string): string =>
  `${t(def.name)} · d${String(def.tier)}`;

export const HangarScreen = () => {
  const { t } = useTranslation(["meta", "common", "content"]);
  const go = useAppStore((s) => s.go);
  const savedDeck = useMetaStore((s) => s.hangar.deck);
  const collection = useMetaStore((s) => s.collection);
  const chartPicks = useMetaStore((s) => s.chartPicks);
  const level = useMetaStore((s) => s.level);
  const shards = useMetaStore((s) => s.shards);
  const ships = useMetaStore((s) => s.ships);
  const selectedShip = useMetaStore((s) => s.selectedShip);
  const setDeck = useMetaStore((s) => s.setDeck);
  const buyDie = useMetaStore((s) => s.buyDie);
  const buyShip = useMetaStore((s) => s.buyShip);
  const selectShip = useMetaStore((s) => s.selectShip);

  const [tab, setTab] = useState("build");
  const [draft, setDraft] = useState<string[]>([...savedDeck]);
  const [schoolFilter, setSchoolFilter] = useState<School | "all">("all");
  const [rarityFilter, setRarityFilter] = useState<Rarity | "all">("all");

  const budget = hangarBudget(level, hubBudgetBonus(chartPicks));
  const validation = useMemo(
    () => validateDeck(draft, budget),
    [draft, budget],
  );
  const owned = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of collection) map.set(e.defId, e.count);
    return map;
  }, [collection]);
  const inDeck = useMemo(() => {
    const map = new Map<string, number>();
    for (const id of draft) map.set(id, (map.get(id) ?? 0) + 1);
    return map;
  }, [draft]);

  const dirty =
    draft.length !== savedDeck.length ||
    draft.some((id, i) => id !== savedDeck[i]);

  const filtered = (list: readonly string[]): string[] =>
    list.filter((id) => {
      const def = DIE_BY_ID.get(id);
      if (def === undefined) return false;
      if (schoolFilter !== "all" && def.school !== schoolFilter) return false;
      if (rarityFilter !== "all" && def.rarity !== rarityFilter) return false;
      return true;
    });

  const addToDeck = (id: string): void => {
    const have = owned.get(id) ?? 0;
    if ((inDeck.get(id) ?? 0) >= have) return;
    if (draft.length >= 9) return;
    setDraft((d) => [...d, id]);
  };

  const removeFromDeck = (index: number): void => {
    setDraft((d) => d.filter((_, i) => i !== index));
  };

  const save = (): void => {
    if (validation.valid) setDeck(draft);
  };

  const collectionIds = filtered(collection.map((e) => e.defId));
  const shopIds = filtered(ALL_DICE.map((d) => d.id));

  return (
    <Stack align="center" mih="100dvh" p="md" bg={tokens.bg} gap="sm">
      <Paper bg={tokens.surface1} p="md" radius="md" withBorder maw={460} w="100%">
        <Group justify="space-between" mb="xs">
          <Text fw={700} c={tokens.text}>
            {t("meta:hangar.title")}
          </Text>
          <Group gap="xs">
            <Badge variant="light" color="yellow">
              {shards} ◈
            </Badge>
            <Button size="xs" variant="default" onClick={() => { go("menu"); }}>
              {t("common:back")}
            </Button>
          </Group>
        </Group>

        <Group gap={6} mb="sm">
          {PLAYABLE_SHIPS.map((ship) => {
            const isOwned = ships.includes(ship.id);
            const equipped = selectedShip === ship.id;
            const unlocked = level >= ship.unlockLevel;
            return (
              <Paper
                key={ship.id}
                p="xs"
                radius="md"
                withBorder
                bg={equipped ? tokens.surface2 : tokens.bg}
                style={{ flex: 1 }}
              >
                <Stack gap={4} align="center">
                  <Text size="sm" c={tokens.text}>
                    {t(ship.name)}
                  </Text>
                  <Text size="xs" c={tokens.faint}>
                    ♥ {ship.hullMax}
                  </Text>
                  {isOwned ? (
                    <Button
                      size="compact-xs"
                      variant={equipped ? "filled" : "default"}
                      disabled={equipped}
                      onClick={() => { selectShip(ship.id); }}
                    >
                      {equipped
                        ? t("meta:hangar.shipEquipped")
                        : t("meta:hangar.shipEquip")}
                    </Button>
                  ) : unlocked ? (
                    <Button
                      size="compact-xs"
                      disabled={shards < ship.price}
                      onClick={() => { buyShip(ship.id, ship.price); }}
                    >
                      {t("meta:hangar.shipBuy", { price: ship.price })}
                    </Button>
                  ) : (
                    <Text size="xs" c={tokens.faint} ta="center">
                      {t("meta:hangar.shipLocked", { level: ship.unlockLevel })}
                    </Text>
                  )}
                </Stack>
              </Paper>
            );
          })}
        </Group>

        <SegmentedControl
          fullWidth
          size="xs"
          value={tab}
          onChange={setTab}
          data={[
            { value: "build", label: t("meta:hangar.deck") },
            { value: "shop", label: t("meta:hangar.shop") },
          ]}
        />
      </Paper>

      <Paper bg={tokens.surface1} p="md" radius="md" withBorder maw={460} w="100%">
        <Group justify="space-between">
          <Text size="sm" c={validation.over ? tokens.danger : tokens.dim}>
            {t("meta:hangar.budget", { used: validation.pts, max: budget })}
          </Text>
          <Text size="sm" c={tokens.faint}>
            {draft.length}/9
          </Text>
        </Group>
        <Progress
          mt={4}
          value={Math.min(100, (validation.pts / budget) * 100)}
          color={validation.over ? "danger" : "accent"}
        />
        <Text size="xs" mt={4} c={validation.valid ? "teal" : tokens.danger}>
          {validation.over
            ? t("meta:hangar.invalidOver")
            : validation.overCap
              ? t("meta:hangar.invalidCap")
              : validation.underMin
                ? t("meta:hangar.invalidMin")
                : validation.multiFate
                  ? t("meta:hangar.invalidFate")
                  : t("meta:hangar.valid")}
        </Text>
        <Group gap={4} mt="xs">
          {draft.length === 0 ? (
            <Text size="xs" c={tokens.faint}>
              {t("meta:hangar.empty")}
            </Text>
          ) : (
            draft.map((id, i) => {
              const def = DIE_BY_ID.get(id);
              if (def === undefined) return null;
              return (
                <Badge
                  key={`${id}-${String(i)}`}
                  variant="outline"
                  style={{ color: schools[def.school].text, cursor: "pointer" }}
                  onClick={() => { removeFromDeck(i); }}
                >
                  {dieLabel(def, t)} · {diePoints(id)}
                </Badge>
              );
            })
          )}
        </Group>
        <Button
          mt="sm"
          size="xs"
          fullWidth
          disabled={!validation.valid || !dirty}
          onClick={save}
        >
          {dirty ? t("meta:hangar.save") : t("meta:hangar.saved")}
        </Button>
      </Paper>

      <Paper bg={tokens.surface1} p="md" radius="md" withBorder maw={460} w="100%">
        <Group gap="xs" mb="xs">
          <Select
            size="xs"
            w={130}
            value={schoolFilter}
            onChange={(v) => { setSchoolFilter((v as School | "all") ?? "all"); }}
            data={SCHOOLS.map((s) => ({
              value: s,
              label: s === "all" ? t("meta:hangar.filterAll") : t(`meta:constellation.${s}`),
            }))}
          />
          <Select
            size="xs"
            w={130}
            value={rarityFilter}
            onChange={(v) => { setRarityFilter((v as Rarity | "all") ?? "all"); }}
            data={RARITIES.map((r) => ({
              value: r,
              label: r === "all" ? t("meta:hangar.filterAll") : r,
            }))}
          />
        </Group>
        <ScrollArea h={280}>
          <Stack gap={6}>
            {(tab === "build" ? collectionIds : shopIds).map((id) => {
              const def = DIE_BY_ID.get(id);
              if (def === undefined) return null;
              const ownedCount = owned.get(id) ?? 0;
              const usedCount = inDeck.get(id) ?? 0;
              return (
                <Group
                  key={id}
                  justify="space-between"
                  px="xs"
                  py={4}
                  style={{
                    border: `1px solid ${tokens.line}`,
                    borderRadius: 8,
                  }}
                >
                  <Stack gap={0}>
                    <Text size="sm" style={{ color: schools[def.school].text }}>
                      {dieLabel(def, t)}
                    </Text>
                    <Text size="xs" c={tokens.faint}>
                      {def.rarity} · {diePoints(id)} pts ·{" "}
                      {t("meta:collection.owned", { n: ownedCount })}
                    </Text>
                  </Stack>
                  {tab === "build" ? (
                    <Button
                      size="compact-xs"
                      variant="default"
                      disabled={usedCount >= ownedCount || draft.length >= 9}
                      onClick={() => { addToDeck(id); }}
                    >
                      {t("meta:hangar.add")}
                    </Button>
                  ) : (
                    <Button
                      size="compact-xs"
                      disabled={shards < metaDiePrice(id)}
                      onClick={() => { buyDie(id, metaDiePrice(id)); }}
                    >
                      {t("meta:hangar.buy", { price: metaDiePrice(id) })}
                    </Button>
                  )}
                </Group>
              );
            })}
          </Stack>
        </ScrollArea>
        <Divider my="xs" color={tokens.line} />
        <Group gap="xs" grow>
          <Button
            size="xs"
            variant="subtle"
            onClick={() => { go("collection"); }}
          >
            {t("meta:collection.title")}
          </Button>
          <Button
            size="xs"
            variant="subtle"
            disabled={level < ENGRAVING_STATION_LEVEL}
            onClick={() => { go("engraving"); }}
          >
            {t("meta:engraving.title")}
          </Button>
        </Group>
      </Paper>
    </Stack>
  );
};
