import { Button, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { rarityColor } from "@/app/rarity";
import { tokens } from "@/app/theme";
import { TagChips } from "@/components/TagChips";
import { PERK_BY_ID } from "@/data/perks";
import { loadoutCensus } from "@/game/effects/census";
import {
  DRAFT_REROLL_COST,
  skipScrapFor,
} from "@/game/run/perkDraft";
import {
  banishPerkChoice,
  rerollPerkDraft,
  resolvePerkChoice,
} from "@/game/run/flow";
import { resolveReducedMotion, useSettingsStore } from "@/stores/settingsStore";
import { useRunStore } from "@/stores/runStore";
import styles from "./Rewards.module.css";

export const PerkDraft = ({ choices }: { choices: readonly string[] }) => {
  const { t } = useTranslation(["run", "content"]);
  const reduced = resolveReducedMotion(
    useSettingsStore((s) => s.reducedMotion),
  );
  const sector = useRunStore((s) => s.sector);
  const scrap = useRunStore((s) => s.scrap);
  const deck = useRunStore((s) => s.deck);
  const perks = useRunStore((s) => s.perks);
  const modules = useRunStore((s) => s.modules);
  const banishUsed = useRunStore((s) => s.banishUsed);
  const rerollUsed = useRunStore((s) => s.draftRerollUsed);

  const census = loadoutCensus({
    deckDefIds: deck.map((d) => d.defId),
    perks,
    modules,
  });

  return (
    <div className={styles.overlay}>
      <Text className={styles.title} c={tokens.dim}>
        {t("run:perk.title")}
      </Text>
      <div className={styles.perkRow}>
        {choices.map((id, index) => {
          const perk = PERK_BY_ID.get(id);
          if (perk === undefined) return null;
          const chips = [...(perk.synergy ?? []), ...(perk.tags ?? [])];
          const unique = [...new Set(chips)];
          return (
            <div
              key={id}
              className={styles.perkCard}
              data-perk={id}
              style={{
                borderColor: rarityColor(perk.rarity),
                animationDelay: reduced ? undefined : `${String(index * 90)}ms`,
                animation: reduced ? "none" : undefined,
              }}
            >
              <Text fw={700} c={tokens.text}>
                {t(perk.name)}
              </Text>
              <TagChips tags={unique} counts={census} />
              <Text size="sm" c={tokens.dim} style={{ flex: 1 }}>
                {t(perk.desc)}
              </Text>
              <Button
                size="sm"
                fullWidth
                onClick={() => {
                  resolvePerkChoice(id);
                }}
              >
                {t("run:perk.pick")}
              </Button>
              <Button
                size="compact-xs"
                variant="subtle"
                color="gray"
                disabled={banishUsed}
                onClick={() => {
                  banishPerkChoice(id);
                }}
              >
                {t("run:perk.banish")}
              </Button>
            </div>
          );
        })}
      </div>
      <div className={styles.draftActions}>
        <Button
          size="compact-sm"
          variant="default"
          data-draft="reroll"
          disabled={rerollUsed || scrap < DRAFT_REROLL_COST}
          onClick={rerollPerkDraft}
        >
          {t("run:perk.reroll", { n: DRAFT_REROLL_COST })}
        </Button>
        <Button
          variant="subtle"
          color="gray"
          onClick={() => {
            resolvePerkChoice(null);
          }}
        >
          {t("run:perk.skip", { n: skipScrapFor(sector) })}
        </Button>
      </div>
      {banishUsed ? null : (
        <Text size="xs" c={tokens.faint} ta="center">
          {t("run:perk.banishHint")}
        </Text>
      )}
    </div>
  );
};
