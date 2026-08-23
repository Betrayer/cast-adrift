import { Button, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { AppSheet } from "@/components/AppModal";
import { rarityColor } from "@/app/rarity";
import { schools } from "@/data/schools";
import { tokens } from "@/app/theme";
import { TagChips } from "@/components/TagChips";
import { DIE_BY_ID } from "@/data/dice";
import { ENGRAVING_BY_ID } from "@/data/engravings";
import { MODULE_BY_ID } from "@/data/modules";
import { moduleTags } from "@/data/modules/types";
import { PERK_BY_ID } from "@/data/perks";
import { RESONANCE_BONUSES } from "@/data/resonance";
import { MECHANIC_TAGS, SYSTEM_TAGS, type ContentTag } from "@/data/tags";
import { computeCensus } from "@/game/battle/resonance";
import {
  DODGE_PCT_CAP,
  DODGE_PCT_PER_VALUE,
  GLANCING_PCT_CAP,
  GLANCING_PCT_PER_VALUE,
  INTERCEPT_VALUE,
  VULNERABLE_CAP,
} from "@/game/battle/resolver";
import { loadoutCensus } from "@/game/effects/census";
import { useMetaStore } from "@/stores/metaStore";
import { useRunStore } from "@/stores/runStore";
import type { School } from "@/types/content";
import styles from "./BuildSheet.module.css";

const SYSTEM_NOTES: readonly {
  id: string;
  title: string;
  body: string;
  vars?: Record<string, number>;
}[] = [
  {
    id: "manoeuvre",
    title: "battle:manoeuvreTitle",
    body: "battle:manoeuvreWhy",
    vars: {
      dodge: DODGE_PCT_PER_VALUE,
      glancing: GLANCING_PCT_PER_VALUE,
      dodgeCap: DODGE_PCT_CAP,
      glancingCap: GLANCING_PCT_CAP,
      intercept: INTERCEPT_VALUE,
    },
  },
  {
    id: "targeting",
    title: "battle:targetingTitle",
    body: "battle:targetingWhy",
    vars: { cap: VULNERABLE_CAP },
  },
  { id: "charge", title: "battle:chargeTitle", body: "battle:chargeWhy" },
  { id: "mk", title: "battle:slot.mkTitle", body: "battle:mkWhy" },
];

const RESONANCE_TIERS: readonly number[] = [2, 4, 6];

const nextThreshold = (count: number): number | undefined =>
  RESONANCE_TIERS.find((tier) => count < tier);

const tierDesc = (school: School, threshold: number): string | undefined =>
  RESONANCE_BONUSES.find(
    (bonus) => bonus.school === school && bonus.threshold === threshold,
  )?.desc;

export const BuildSheet = ({ onClose }: { onClose: () => void }) => {
  const { t } = useTranslation(["run", "content", "battle"]);
  const deck = useRunStore((s) => s.deck);
  const perks = useRunStore((s) => s.perks);
  const modules = useRunStore((s) => s.modules);
  const banished = useRunStore((s) => s.banishedPerks);
  const engravings = useMetaStore((s) => s.engravings);

  const deckDefIds = deck.map((d) => d.defId);
  const census = loadoutCensus({ deckDefIds, perks, modules, engravings });
  const resonance = computeCensus(
    deckDefIds
      .map((defId) => DIE_BY_ID.get(defId))
      .filter((def) => def !== undefined)
      .map((def) => ({ school: def.school })),
  );

  const activeTags: ContentTag[] = [...SYSTEM_TAGS, ...MECHANIC_TAGS].filter(
    (tag) => (census[tag] ?? 0) > 0,
  );

  const engraved = [...new Set(deckDefIds)]
    .map((defId) => ({ defId, ids: engravings[defId] ?? [] }))
    .filter((entry) => entry.ids.length > 0);

  return (
    <AppSheet
      label={t("run:build.title")}
      testId="build-sheet"
      onClose={onClose}
    >
      <div className={styles.head}>
        <Text fw={700} c={tokens.text}>
          {t("run:build.title")}
        </Text>
        <Button size="compact-xs" variant="subtle" color="gray" onClick={onClose}>
          {t("run:build.close")}
        </Button>
      </div>

      <div className={styles.body}>
        <section className={styles.section}>
          <Text size="xs" c={tokens.faint} className={styles.sectionTitle}>
            {t("run:build.resonance")}
          </Text>
          {(Object.keys(schools) as School[]).map((school) => {
            const count = resonance.counts[school];
            if (count === 0) return null;
            const next = nextThreshold(count);
            const desc = next === undefined ? undefined : tierDesc(school, next);
            return (
              <div key={school} className={styles.row}>
                <span
                  className={styles.schoolDot}
                  style={{ background: schools[school].stroke }}
                />
                <Text size="sm" c={schools[school].text} fw={600}>
                  {t(`run:tag.${school}`)}
                </Text>
                <Text size="sm" c={tokens.dim}>
                  {String(count)}
                </Text>
                <Text size="xs" c={tokens.faint} className={styles.hint}>
                  {next === undefined
                    ? t("run:build.resonanceMax")
                    : desc === undefined
                      ? t("run:build.resonanceNext", { n: next - count })
                      : t("run:build.resonanceNextDesc", {
                          n: next - count,
                          desc: t(desc),
                        })}
                </Text>
              </div>
            );
          })}
        </section>

        <section className={styles.section} data-build-systems>
          <Text size="xs" c={tokens.faint} className={styles.sectionTitle}>
            {t("battle:systemsTitle")}
          </Text>
          {SYSTEM_NOTES.map((note) => (
            <div key={note.id} className={styles.entry} data-system-note={note.id}>
              <Text size="sm" fw={600} c={tokens.text}>
                {t(note.title)}
              </Text>
              <Text size="xs" c={tokens.dim}>
                {t(note.body, note.vars)}
              </Text>
            </div>
          ))}
        </section>

        <section className={styles.section}>
          <Text size="xs" c={tokens.faint} className={styles.sectionTitle}>
            {t("run:build.tags")}
          </Text>
          {activeTags.length === 0 ? (
            <Text size="xs" c={tokens.faint}>
              {t("run:build.empty")}
            </Text>
          ) : (
            <TagChips tags={activeTags} counts={census} size="sm" />
          )}
        </section>

        <section className={styles.section}>
          <Text size="xs" c={tokens.faint} className={styles.sectionTitle}>
            {t("run:build.perks", { n: perks.length })}
          </Text>
          {perks.length === 0 ? (
            <Text size="xs" c={tokens.faint}>
              {t("run:build.empty")}
            </Text>
          ) : (
            perks.map((id) => {
              const def = PERK_BY_ID.get(id);
              if (def === undefined) return null;
              return (
                <div
                  key={id}
                  className={styles.entry}
                  style={{ borderLeftColor: rarityColor(def.rarity) }}
                >
                  <Text size="sm" fw={600} c={tokens.text}>
                    {t(def.name)}
                  </Text>
                  <Text size="xs" c={tokens.dim}>
                    {t(def.desc)}
                  </Text>
                  <TagChips
                    tags={[...new Set([...(def.synergy ?? []), ...(def.tags ?? [])])]}
                  />
                </div>
              );
            })
          )}
        </section>

        <section className={styles.section}>
          <Text size="xs" c={tokens.faint} className={styles.sectionTitle}>
            {t("run:build.modules", { n: modules.length })}
          </Text>
          {modules.length === 0 ? (
            <Text size="xs" c={tokens.faint}>
              {t("run:build.empty")}
            </Text>
          ) : (
            modules.map((id) => {
              const def = MODULE_BY_ID.get(id);
              if (def === undefined) return null;
              return (
                <div
                  key={id}
                  className={styles.entry}
                  style={{ borderLeftColor: rarityColor(def.rarity) }}
                >
                  <Text size="sm" fw={600} c={tokens.text}>
                    {t(def.name)}
                  </Text>
                  <Text size="xs" c={tokens.dim}>
                    {t(def.desc)}
                  </Text>
                  <TagChips tags={moduleTags(def)} />
                </div>
              );
            })
          )}
        </section>

        <section className={styles.section}>
          <Text size="xs" c={tokens.faint} className={styles.sectionTitle}>
            {t("run:build.engravings", { n: engraved.length })}
          </Text>
          {engraved.length === 0 ? (
            <Text size="xs" c={tokens.faint}>
              {t("run:build.empty")}
            </Text>
          ) : (
            engraved.map((entry) => {
              const dieDef = DIE_BY_ID.get(entry.defId);
              return (
                <div key={entry.defId} className={styles.entry}>
                  <Text size="sm" fw={600} c={tokens.text}>
                    {dieDef === undefined ? entry.defId : t(dieDef.name)}
                  </Text>
                  {entry.ids.map((id) => {
                    const eng = ENGRAVING_BY_ID.get(id);
                    if (eng === undefined) return null;
                    return (
                      <Text key={id} size="xs" c={tokens.dim}>
                        {`${t(eng.name)} — ${t(eng.desc)}`}
                      </Text>
                    );
                  })}
                  <TagChips
                    tags={[
                      ...new Set(
                        entry.ids.flatMap(
                          (id) => ENGRAVING_BY_ID.get(id)?.tags ?? [],
                        ),
                      ),
                    ]}
                  />
                </div>
              );
            })
          )}
        </section>

        {banished.length === 0 ? null : (
          <section className={styles.section}>
            <Text size="xs" c={tokens.faint} className={styles.sectionTitle}>
              {t("run:build.banished")}
            </Text>
            {banished.map((id) => (
              <Text key={id} size="xs" c={tokens.faint}>
                {t(PERK_BY_ID.get(id)?.name ?? id)}
              </Text>
            ))}
          </section>
        )}
      </div>
    </AppSheet>
  );
};
