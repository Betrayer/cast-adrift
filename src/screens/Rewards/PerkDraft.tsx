import { Button, Text } from "@mantine/core";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { rarityColor } from "@/app/rarity";
import { tokens } from "@/app/theme";
import { TagChips } from "@/components/TagChips";
import { LOOT_SFX } from "@/data/audio";
import { PERK_BY_ID } from "@/data/perks";
import { perkTags, type PerkPool } from "@/data/perks/types";
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
import { duckMusic, playSfx } from "@/services/audio";
import { haptic } from "@/services/tma";
import { useReducedMotion } from "@/stores/settingsStore";
import { useRunStore } from "@/stores/runStore";
import {
  entranceCardStyle,
  useCardRevealSfx,
  useEntranceRow,
} from "./entrance";
import styles from "./Rewards.module.css";
import { usePerkPick } from "./usePerkPick";

const poolGlow = (pool: PerkPool): string =>
  pool === "systems" ? "var(--ca-accent)" : `var(--ca-school-${pool}-stroke)`;

export const PerkDraft = ({ choices }: { choices: readonly string[] }) => {
  const { t } = useTranslation(["run", "content"]);
  const reduced = useReducedMotion();
  const draft = choices.join("|");
  const { entrance, row } = useEntranceRow(draft);
  const { pickedId, busy, isLocked, commit } = usePerkPick(
    draft,
    row,
    reduced,
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

  useCardRevealSfx(choices, 0.05);

  const pick = (id: string): void => {
    if (isLocked()) return;
    const rarity = PERK_BY_ID.get(id)?.rarity;
    if (rarity !== undefined) {
      playSfx(LOOT_SFX[rarity]);
      duckMusic(rarity === "rare" ? 1800 : 1100);
      haptic("reveal");
    }
    commit(id);
  };

  return (
    <div className={styles.overlay}>
      <Text className={styles.title} c={tokens.dim}>
        {t("run:perk.title")}
      </Text>
      <div
        ref={row}
        className={styles.perkRow}
        data-entrance={entrance}
        data-picking={busy ? "1" : undefined}
      >
        {choices.map((id, index) => {
          const perk = PERK_BY_ID.get(id);
          if (perk === undefined) return null;
          const picked = pickedId === id;
          const dismissed = busy && !picked;
          return (
            <div
              key={id}
              className={`${styles.perkCard ?? ""} ${styles.entryCard ?? ""}`}
              data-perk={id}
              data-pool={perk.pool}
              data-entrance-card={index}
              data-picked={picked ? "1" : undefined}
              data-dismissed={dismissed ? "1" : undefined}
              style={
                {
                  borderColor: rarityColor(perk.rarity),
                  "--ca-pick-glow": poolGlow(perk.pool),
                  ...entranceCardStyle(index, choices.length),
                } as CSSProperties
              }
            >
              <Text fw={700} c={tokens.text}>
                {t(perk.name)}
              </Text>
              <TagChips tags={perkTags(perk)} counts={census} />
              <Text size="sm" c={tokens.dim} style={{ flex: 1 }}>
                {t(perk.desc)}
              </Text>
              <Button
                size="sm"
                fullWidth
                data-testid={`reward-perk-pick-${String(index)}`}
                disabled={dismissed}
                aria-disabled={busy || undefined}
                onClick={() => {
                  pick(id);
                }}
              >
                {t("run:perk.pick")}
              </Button>
              <Button
                size="compact-xs"
                variant="subtle"
                color="gray"
                disabled={banishUsed || busy}
                onClick={() => {
                  if (isLocked()) return;
                  playSfx("banish");
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
          disabled={busy || rerollUsed || scrap < DRAFT_REROLL_COST}
          onClick={() => {
            if (isLocked()) return;
            playSfx("buy", { gain: 0.7 });
            playSfx("draftReroll");
            rerollPerkDraft();
          }}
        >
          {t("run:perk.reroll", { n: DRAFT_REROLL_COST })}
        </Button>
        <Button
          variant="subtle"
          color="gray"
          data-testid="reward-perk-skip"
          disabled={busy}
          onClick={() => {
            if (isLocked()) return;
            playSfx("optionTick", { rate: 0.88 });
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
