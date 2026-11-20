import { SegmentedControl, Stack, Text } from "@mantine/core";
import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Screen } from "@/app/Screen";
import { AppHeader } from "@/components/AppHeader";
import { riseStyle, scrollIntoFocus } from "@/app/motion";
import { tokens } from "@/app/theme";
import { useScreenParam } from "@/app/useScreenParam";
import { TabPanel } from "@/components/TabPanel";
import type { JournalEntry } from "@/game/run/journal";
import { RunBattleLog } from "@/screens/Journal/RunBattleLog";
import { useAppStore } from "@/stores/appStore";
import { useNarrativeStore } from "@/stores/narrativeStore";
import { journalEntryText } from "./entryText";
import { JournalSidebar } from "./JournalSidebar";
import styles from "./JournalScreen.module.css";

const MARKER: Record<JournalEntry["k"], string> = {
  choice: "▸",
  consequence: "↳",
  chain: "⟡",
  beacon: "✦",
  memory: "◈",
  achievement: "✧",
  axis: "±",
  wormhole: "◉",
  cargo: "▣",
  singularity: "●",
  bark: "◆",
  system: "▪",
};

const TABS = ["story", "battle"] as const;

type Tab = (typeof TABS)[number];

const FOCUS_MS = 2600;

const EntryRow = ({ entry }: { entry: JournalEntry }) => {
  const { t } = useTranslation(["run", "content", "battle", "settings"]);
  const body = journalEntryText(entry, t);
  return (
    <div
      className={styles.entry}
      data-journal-entry={entry.k}
      data-journal-id={entry.id}
    >
      <span className={styles.marker} style={{ color: tokens.faint }}>
        {MARKER[entry.k]}
      </span>
      <Text
        size="sm"
        c={entry.k === "consequence" ? tokens.amber : tokens.dim}
        style={{ flex: 1 }}
      >
        {body}
      </Text>
    </div>
  );
};

export const JournalScreen = () => {
  const { t } = useTranslation(["run", "content"]);
  const journal = useNarrativeStore((s) => s.journal);
  const [tab, setTab] = useScreenParam<Tab>("tab", TABS, "story");
  const focusId = useAppStore((s) => s.params?.entry);
  const listRef = useRef<HTMLDivElement | null>(null);

  const sectors = useMemo(() => {
    const seen: number[] = [];
    for (const entry of journal) {
      if (!seen.includes(entry.sector)) seen.push(entry.sector);
    }
    return seen;
  }, [journal]);

  useEffect(() => {
    if (focusId === undefined || tab !== "story") return;
    const target = listRef.current?.querySelector(
      `[data-journal-id="${focusId}"]`,
    );
    if (!(target instanceof HTMLElement)) return;
    scrollIntoFocus(target);
    target.dataset.journalFocus = "yes";
    const timer = window.setTimeout(() => {
      delete target.dataset.journalFocus;
    }, FOCUS_MS);
    return () => {
      window.clearTimeout(timer);
      delete target.dataset.journalFocus;
    };
  }, [focusId, tab, journal.length]);

  return (
    <Screen
      width="wide"
      header={
        <>
          <AppHeader />
          <SegmentedControl
            fullWidth
            size="xs"
            mt="xs"
            value={tab}
            data-testid="journal-tabs"
            onChange={(value) => {
              setTab(value as Tab);
            }}
            data={[
              { value: "story", label: t("run:journal.tabStory") },
              { value: "battle", label: t("run:journal.tabBattle") },
            ]}
          />
        </>
      }
    >
      <TabPanel id={tab}>
      {tab === "battle" ? (
        <RunBattleLog />
      ) : (
        <div
          className={styles.columns}
          style={
            {
              "--ca-journal-line": tokens.line,
              "--ca-journal-bg": tokens.bg,
            } as React.CSSProperties
          }
        >
          <Stack gap="xs" ref={listRef}>
            {journal.length === 0 ? (
              <Text size="sm" c={tokens.faint}>
                {t("run:journal.empty")}
              </Text>
            ) : (
              sectors.map((n, index) => (
                <Stack
                  key={n}
                  gap={0}
                  data-journal-sector={n}
                  data-rise
                  style={riseStyle(index)}
                >
                  <div className={styles.sectorHead}>
                    <Text size="xs" c={tokens.faint} fw={600}>
                      {t("run:journal.sector", { n })}
                    </Text>
                  </div>
                  {journal
                    .filter((entry) => entry.sector === n)
                    .map((entry) => (
                      <EntryRow key={entry.id} entry={entry} />
                    ))}
                </Stack>
              ))
            )}
          </Stack>

          <JournalSidebar />
        </div>
      )}
      </TabPanel>
    </Screen>
  );
};
