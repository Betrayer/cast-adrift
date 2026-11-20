import { Button, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { AppSheet } from "@/components/AppModal";
import { riseStyle } from "@/app/motion";
import { rarityColor } from "@/app/rarity";
import { schools } from "@/data/schools";
import { tokens } from "@/app/theme";
import { TagChips } from "@/components/TagChips";
import { DIE_BY_ID } from "@/data/dice";
import { ENGRAVING_BY_ID } from "@/data/engravings";
import { MODULE_BY_ID } from "@/data/modules";
import { moduleTags } from "@/data/modules/types";
import { PERK_BY_ID } from "@/data/perks";
import { draftedPerks } from "@/data/perks/ship";
import { perkTags } from "@/data/perks/types";
import { RESONANCE_BONUSES } from "@/data/resonance";
import { nextThreshold } from "@/game/battle/resonance";
import {
  factVars,
  systemFact,
  type FactInput,
  type FactVars,
  type SystemFactId,
} from "@/game/battle/systemFacts";
import { nudgeChargePrice } from "@/game/battle/view/actions";
import {
  activeCensusTags,
  deckResonance,
  loadoutCensus,
} from "@/game/effects/census";
import { fogRowsFor } from "@/game/map/fog";
import { useAppStore } from "@/stores/appStore";
import { useBattleStore } from "@/stores/battleStore";
import { useMetaStore } from "@/stores/metaStore";
import { useRunStore } from "@/stores/runStore";
import type { School } from "@/types/content";
import styles from "./BuildSheet.module.css";

interface SystemNote {
  id: SystemFactId;
  title: string;
  body: string;
  vars: FactVars;
}

const SYSTEM_NOTE_TITLES: readonly (readonly [SystemFactId, string])[] = [
  ["manoeuvre", "battle:manoeuvreTitle"],
  ["targeting", "battle:targetingTitle"],
  ["charge", "battle:chargeTitle"],
  ["mk", "battle:slot.mkTitle"],
  ["fog", "battle:fogTitle"],
];

const systemNotes = (input: FactInput): readonly SystemNote[] =>
  SYSTEM_NOTE_TITLES.map(([id, title]) => ({
    id,
    title,
    body: systemFact(id).text,
    vars: factVars(id, input),
  }));

const tierDesc = (school: School, threshold: number): string | undefined =>
  RESONANCE_BONUSES.find(
    (bonus) => bonus.school === school && bonus.threshold === threshold,
  )?.desc;

export const BuildSheet = ({ onClose }: { onClose: () => void }) => {
  const { t } = useTranslation(["run", "content", "battle"]);
  const deck = useRunStore((s) => s.deck);
  const allPerks = useRunStore((s) => s.perks);
  const perks = draftedPerks(allPerks);
  const masteryRank = useRunStore((s) => s.masteryRank);
  const modules = useRunStore((s) => s.modules);
  const shipId = useRunStore((s) => s.shipId);
  const chartPicks = useRunStore((s) => s.chartPicks);
  const officers = useRunStore((s) => s.officers);
  const mutators = useRunStore((s) => s.mutators);
  const echo = useRunStore((s) => s.echo);
  const banished = useRunStore((s) => s.banishedPerks);
  const nudgeCost = nudgeChargePrice({ perks, chartPicks, modules, officers, mutators });
  const fogRows = fogRowsFor({
    sensorsMk: 1,
    deepScan: false,
    bonusReveal: 0,
    sectorReveal: 0,
    echo,
    mutators,
  });
  const engravings = useMetaStore((s) => s.engravings);
  const inBattle = useAppStore((s) => s.screen) === "battle";
  const battleResonance = useBattleStore((s) => s.resonance);

  const deckDefIds = deck.map((d) => d.defId);
  const census = loadoutCensus({ deckDefIds, perks, modules, engravings });
  const resonance = inBattle
    ? battleResonance
    : deckResonance(deck, { shipId, masteryRank, perks: allPerks, chartPicks, modules });

  const activeTags = activeCensusTags(census);

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
          {(Object.keys(schools) as School[]).map((school, index) => {
            const count = resonance.counts[school];
            if (count === 0) return null;
            const next = nextThreshold(count);
            const desc = next === null ? undefined : tierDesc(school, next);
            return (
              <div
                key={school}
                className={styles.row}
                data-rise
                style={riseStyle(index)}
              >
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
                  {next === null
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
          {systemNotes({ shipId, nudgeCost, fogRows }).map((note, index) => (
            <div
              key={note.id}
              className={styles.entry}
              data-system-note={note.id}
              data-rise
              style={riseStyle(index)}
            >
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
            perks.map((id, index) => {
              const def = PERK_BY_ID.get(id);
              if (def === undefined) return null;
              return (
                <div
                  key={id}
                  className={styles.entry}
                  data-build-perk={id}
                  data-rise
                  style={{
                    borderLeftColor: rarityColor(def.rarity),
                    ...riseStyle(index),
                  }}
                >
                  <Text size="sm" fw={600} c={tokens.text}>
                    {t(def.name)}
                  </Text>
                  <Text size="xs" c={tokens.dim}>
                    {t(def.desc)}
                  </Text>
                  <TagChips tags={perkTags(def)} />
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
            modules.map((id, index) => {
              const def = MODULE_BY_ID.get(id);
              if (def === undefined) return null;
              return (
                <div
                  key={id}
                  className={styles.entry}
                  data-rise
                  style={{
                    borderLeftColor: rarityColor(def.rarity),
                    ...riseStyle(index),
                  }}
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
            engraved.map((entry, index) => {
              const dieDef = DIE_BY_ID.get(entry.defId);
              return (
                <div
                  key={entry.defId}
                  className={styles.entry}
                  data-rise
                  style={riseStyle(index)}
                >
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
