import {
  Group,
  Loader,
  Paper,
  SegmentedControl,
  Stack,
  Text,
} from "@mantine/core";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { tokens } from "@/app/theme";
import { boardUid } from "@/game/run/boards";
import { isoWeekKey, utcDateKey } from "@/game/run/modes";
import {
  aroundMe,
  boardsReachable,
  dailyBoardId,
  driftWeeklyBoardId,
  DRIFT_ALLTIME_BOARD,
  entryHidden,
  rankEntries,
  top,
  type RankedEntry,
} from "@/services/leaderboards";
import { Screen } from "@/app/Screen";
import { AppHeader } from "@/components/AppHeader";
import { useScreenParam } from "@/app/useScreenParam";

const TABS = ["daily", "drift", "week"] as const;

type Tab = (typeof TABS)[number];

const boardIdFor = (tab: Tab, now: number): string => {
  if (tab === "daily") return dailyBoardId(utcDateKey(now));
  if (tab === "week") return driftWeeklyBoardId(isoWeekKey(now));
  return DRIFT_ALLTIME_BOARD;
};

type View = "top" | "around";

interface LoadedBoard {
  key: string;
  rows: RankedEntry[];
  myRank: number | null;
  offline: boolean;
}

const debugBoards = (): boolean => {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("debug") === "1";
};

export const LeaderboardScreen = () => {
  const { t } = useTranslation(["meta", "common"]);
  const [tab, setTab] = useScreenParam<Tab>("tab", TABS, "drift");
  const [view, setView] = useState<View>("top");
  const [showFlagged] = useState(debugBoards);
  const [now] = useState(() => Date.now());
  const [loaded, setLoaded] = useState<LoadedBoard | null>(null);

  const board = boardIdFor(tab, now);
  const requestKey = `${board}:${view}`;

  useEffect(() => {
    let cancelled = false;
    const fetchBoard = async (): Promise<void> => {
      const uid = await boardUid();
      const rows =
        view === "around" && uid !== null
          ? (await aroundMe(board, uid)).rows.filter(
              (e) => showFlagged || e.isMe || !entryHidden(e, board),
            )
          : rankEntries(
              (await top(board)).filter(
                (e) => showFlagged || !entryHidden(e, board),
              ),
              uid,
            );
      if (cancelled) return;
      setLoaded({
        key: `${board}:${view}`,
        rows,
        myRank: rows.find((e) => e.isMe)?.rank ?? null,
        offline: uid === null || !boardsReachable(),
      });
    };
    void fetchBoard();
    return () => {
      cancelled = true;
    };
  }, [board, view, showFlagged]);

  const ready = loaded !== null && loaded.key === requestKey;
  const rows = ready ? loaded.rows : null;
  const myRank = ready ? loaded.myRank : null;
  const offline = ready ? loaded.offline : false;

  return (
    <Screen
      header={
        <>
        <AppHeader />
        <Paper bg={tokens.surface1} p="md" radius="md" withBorder mt="xs">
          <Stack gap="xs">
          <SegmentedControl
            fullWidth
            size="xs"
            value={tab}
            data-testid="board-tabs"
            onChange={(value) => {
              setTab(value as Tab);
            }}
            data={[
              { value: "daily", label: t("meta:board.tabDaily") },
              { value: "drift", label: t("meta:board.tabDrift") },
              { value: "week", label: t("meta:board.tabWeek") },
            ]}
          />
          <SegmentedControl
            fullWidth
            size="xs"
            value={view}
            onChange={(value) => {
              setView(value as View);
            }}
            data={[
              { value: "top", label: t("meta:board.viewTop") },
              { value: "around", label: t("meta:board.viewAround") },
            ]}
          />
            <Text size="xs" c={tokens.faint}>
              {myRank === null
                ? t("meta:board.noRank")
                : t("meta:board.myRank", { rank: myRank })}
            </Text>
          </Stack>
        </Paper>
        </>
      }
    >
      <>
        {rows === null ? (
          <Group justify="center" py="xl">
            <Loader size="sm" color="accent" />
          </Group>
        ) : rows.length === 0 ? (
          <Paper bg={tokens.surface1} p="md" radius="md" withBorder>
            <Text
              size="sm"
              c={offline ? tokens.danger : tokens.dim}
              data-testid={offline ? "board-offline" : "board-empty"}
            >
              {t(offline ? "meta:board.offline" : "meta:board.empty")}
            </Text>
          </Paper>
        ) : (
          <Stack gap={4} pb="md">
            {rows.map((entry) => {
              const flagged = showFlagged && entryHidden(entry, board);
              return (
                <Paper
                  key={entry.uid}
                  bg={entry.isMe ? tokens.surface2 : tokens.surface1}
                  p="xs"
                  radius="sm"
                  withBorder
                  style={flagged ? { opacity: 0.4 } : undefined}
                >
                  <Group justify="space-between" wrap="nowrap" gap="xs">
                    <Text size="sm" c={tokens.faint} w={32}>
                      {entry.rank}
                    </Text>
                    <Text
                      size="sm"
                      c={entry.isMe ? tokens.accent : tokens.text}
                      fw={entry.isMe ? 700 : 400}
                      style={{ flex: 1, overflow: "hidden" }}
                      truncate
                    >
                      {entry.name}
                    </Text>
                    <Text size="xs" c={tokens.faint}>
                      {t("meta:board.depth", { n: entry.depth })}
                    </Text>
                    <Text size="sm" c={tokens.amber} fw={700}>
                      {entry.score}
                    </Text>
                  </Group>
                </Paper>
              );
            })}
          </Stack>
        )}
      </>
    </Screen>
  );
};
