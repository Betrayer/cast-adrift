import { Divider, Paper, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { cx } from "@/app/cx";
import { rarityColor } from "@/app/rarity";
import { tokens } from "@/app/theme";
import { TagChips } from "@/components/TagChips";
import { PERK_BY_ID } from "@/data/perks";
import { perkTags } from "@/data/perks/types";
import { activeCensusTags, loadoutCensus } from "@/game/effects/census";
import { useMetaStore } from "@/stores/metaStore";
import { useRunStore } from "@/stores/runStore";
import { useFocusScroll, type BridgePanelProps } from "./bridgeFocus";
import styles from "./BridgeScreen.module.css";

export const PerksTab = ({ focus }: BridgePanelProps) => {
  const { t } = useTranslation(["run", "battle", "content"]);
  const focusId = focus?.kind === "perk" ? focus.id : null;
  const focusRef = useFocusScroll<HTMLDivElement>(focusId);
  const deck = useRunStore((s) => s.deck);
  const perks = useRunStore((s) => s.perks);
  const modules = useRunStore((s) => s.modules);
  const banished = useRunStore((s) => s.banishedPerks);
  const engravings = useMetaStore((s) => s.engravings);
  const census = loadoutCensus({
    deckDefIds: deck.map((d) => d.defId),
    perks,
    modules,
    engravings,
  });
  const activeTags = activeCensusTags(census);
  return (
    <Stack gap="sm">
      <Text size="xs" c={tokens.faint}>
        {t("run:build.tags")}
      </Text>
      {activeTags.length === 0 ? (
        <Text size="xs" c={tokens.faint}>
          {t("run:build.empty")}
        </Text>
      ) : (
        <TagChips tags={activeTags} counts={census} size="sm" />
      )}
      <Divider color={tokens.line} label={t("run:build.perks", { n: perks.length })} />
      {perks.length === 0 ? (
        <Text size="xs" c={tokens.faint}>
          {t("run:build.empty")}
        </Text>
      ) : (
        perks.map((id) => {
          const def = PERK_BY_ID.get(id);
          if (def === undefined) return null;
          const focused = id === focusId;
          return (
            <Paper
              key={id}
              ref={focused ? focusRef : undefined}
              bg={tokens.surface1}
              p="sm"
              radius="md"
              withBorder
              className={cx(focused && styles.focused)}
              data-bridge-perk={id}
              data-bridge-focus={focused ? "1" : undefined}
              tabIndex={focused ? -1 : undefined}
              style={{ borderLeftColor: rarityColor(def.rarity) }}
            >
              <Text size="sm" fw={600} c={tokens.text}>
                {t(def.name)}
              </Text>
              <Text size="xs" c={tokens.dim}>
                {t(def.desc)}
              </Text>
              <TagChips tags={perkTags(def)} />
            </Paper>
          );
        })
      )}
      {banished.length === 0 ? null : (
        <>
          <Divider color={tokens.line} label={t("run:build.banished")} />
          {banished.map((id) => (
            <Text key={id} size="xs" c={tokens.faint}>
              {t(PERK_BY_ID.get(id)?.name ?? id)}
            </Text>
          ))}
        </>
      )}
    </Stack>
  );
};
