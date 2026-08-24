import {
  Badge,
  Button,
  Divider,
  Group,
  Paper,
  Stack,
  Text,
} from "@mantine/core";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Screen } from "@/app/Screen";
import { riseStyle } from "@/app/motion";
import { AppHeader } from "@/components/AppHeader";
import { tokens } from "@/app/theme";
import { Sparkle, type SparkleBurst } from "@/components/Sparkle";
import { TagChips } from "@/components/TagChips";
import { DieCard } from "@/components/DieCard";
import { DIE_BY_ID } from "@/data/dice";
import {
  ENGRAVINGS,
  ENGRAVING_BY_ID,
  ENGRAVING_PAIRS,
  socketsForDie,
} from "@/data/engravings";
import { ENGRAVING_STATION_LEVEL } from "@/data/milestones";
import { schools } from "@/data/schools";
import { playSfx } from "@/services/audio";
import { useMetaStore } from "@/stores/metaStore";

const pairPartner = (id: string): string | undefined => {
  for (const [a, b] of ENGRAVING_PAIRS) {
    if (a === id) return b;
    if (b === id) return a;
  }
  return undefined;
};

export const EngravingScreen = () => {
  const { t } = useTranslation(["meta", "common", "content"]);
  const level = useMetaStore((s) => s.level);
  const shards = useMetaStore((s) => s.shards);
  const collection = useMetaStore((s) => s.collection);
  const engravings = useMetaStore((s) => s.engravings);
  const engrave = useMetaStore((s) => s.engrave);
  const removeEngraving = useMetaStore((s) => s.removeEngraving);

  const [selected, setSelected] = useState<string | null>(null);
  const [burst, setBurst] = useState<SparkleBurst | null>(null);
  const unlocked = level >= ENGRAVING_STATION_LEVEL;
  const owned = collection.filter((e) => e.count > 0);
  const activeDie = selected ?? owned[0]?.defId ?? null;
  const fitted = activeDie === null ? [] : (engravings[activeDie] ?? []);
  const sockets = activeDie === null ? 0 : socketsForDie(activeDie);
  const free = sockets - fitted.length;

  return (
    <Screen
      header={
        <AppHeader
          subtitle={
            unlocked
              ? t("meta:engraving.hint")
              : t("meta:engraving.locked", { level: ENGRAVING_STATION_LEVEL })
          }
          actions={
            <Badge variant="light" color="yellow">
              {shards} ◈
            </Badge>
          }
        />
      }
    >
      <Stack gap="sm">
      {unlocked ? (
        <>
          <Paper
            bg={tokens.surface1}
            p="md"
            radius="md"
            withBorder
            data-rise
            style={riseStyle(0)}
          >
            <Text size="sm" c={tokens.dim} mb={6}>
              {t("meta:engraving.pickDie")}
            </Text>
              <Group gap={4}>
                {owned.map((entry) => {
                  const def = DIE_BY_ID.get(entry.defId);
                  if (def === undefined) return null;
                  const fittedCount = (engravings[entry.defId] ?? []).length;
                  return (
                    <Badge
                      key={entry.defId}
                      variant={activeDie === entry.defId ? "filled" : "outline"}
                      style={{
                        color:
                          activeDie === entry.defId
                            ? undefined
                            : schools[def.school].text,
                        cursor: "pointer",
                      }}
                      onClick={() => { setSelected(entry.defId); }}
                    >
                      {t(def.name)} · {fittedCount}/{socketsForDie(entry.defId)}
                    </Badge>
                  );
                })}
              </Group>

            {activeDie === null ? null : (
              <Paper bg={tokens.bg} p={0} mt="xs" radius="md">
                <DieCard
                  defId={activeDie}
                  size="full"
                  engravings={engravings}
                />
              </Paper>
            )}

            <Divider my="xs" color={tokens.line} />
            <Text size="sm" c={tokens.dim}>
              {t("meta:engraving.sockets", { used: fitted.length, max: sockets })}
            </Text>
            <Group gap={4} mt={4}>
              {fitted.length === 0 ? (
                <Text size="xs" c={tokens.faint}>
                  {t("meta:engraving.empty")}
                </Text>
              ) : (
                fitted.map((id) => {
                  const def = ENGRAVING_BY_ID.get(id);
                  if (def === undefined || activeDie === null) return null;
                  return (
                    <Button
                      key={id}
                      size="compact-xs"
                      variant="light"
                      color="gray"
                      onClick={() => { removeEngraving(activeDie, id); }}
                    >
                      {t(def.name)} · {t("meta:engraving.remove")}
                    </Button>
                  );
                })
              )}
            </Group>
          </Paper>

          <Paper bg={tokens.surface1} p="md" radius="md" withBorder>
              <Stack gap={6}>
                {ENGRAVINGS.map((def, index) => {
                  const already = fitted.includes(def.id);
                  const affordable =
                    activeDie !== null &&
                    !already &&
                    free > 0 &&
                    shards >= def.price;
                  return (
                    <Group
                      key={def.id}
                      justify="space-between"
                      px="xs"
                      py={4}
                      data-rise
                      data-press
                      data-engraving-row={def.id}
                      style={{
                        border: `1px solid ${tokens.line}`,
                        borderRadius: 8,
                        ...riseStyle(index),
                      }}
                    >
                      <Stack gap={2} style={{ flex: 1 }}>
                        <Text size="sm" c={tokens.text}>
                          {t(def.name)}
                        </Text>
                        <Text size="xs" c={tokens.faint}>
                          {t(def.desc)}
                        </Text>
                        <TagChips tags={def.tags ?? []} />
                        {pairPartner(def.id) === undefined ? null : (
                          <Text size="xs" c={tokens.amber}>
                            {t("meta:engraving.pair", {
                              name: t(
                                ENGRAVING_BY_ID.get(pairPartner(def.id) ?? "")
                                  ?.name ?? "",
                              ),
                            })}
                          </Text>
                        )}
                      </Stack>
                      <Button
                        size="compact-xs"
                        disabled={!affordable}
                        onClick={(event) => {
                          if (activeDie === null) return;
                          if (!engrave(activeDie, def.id, def.price)) return;
                          playSfx("setComplete");
                          const rect =
                            event.currentTarget.getBoundingClientRect();
                          setBurst({
                            key: Date.now(),
                            x: rect.left + rect.width / 2,
                            y: rect.top + rect.height / 2,
                            color: tokens.amber,
                          });
                        }}
                      >
                        {already
                          ? t("meta:engraving.fitted")
                          : t("meta:engraving.fit", { price: def.price })}
                      </Button>
                    </Group>
                  );
                })}
              </Stack>
          </Paper>
        </>
      ) : null}
      <Sparkle burst={burst} />
      </Stack>
    </Screen>
  );
};
