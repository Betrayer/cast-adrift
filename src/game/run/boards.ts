import i18n from "i18next";
import { isoWeekKey, runScore } from "@/game/run/modes";
import { plausibility } from "@/game/run/plausibility";
import { trackEvent } from "@/services/analytics";
import {
  aroundMe,
  dailyBoardId,
  driftWeeklyBoardId,
  DRIFT_ALLTIME_BOARD,
  startDaily,
  submit,
  truncateName,
  type BoardEntry,
} from "@/services/leaderboards";
import { useAppStore } from "@/stores/appStore";
import { useMetaStore } from "@/stores/metaStore";
import { useRunStore } from "@/stores/runStore";
import { useSummaryStore } from "@/stores/summaryStore";

export const captainName = (): string => {
  const tgName = useAppStore.getState().tgName;
  if (tgName !== null && tgName.trim().length > 0) return truncateName(tgName);
  const uid = useAppStore.getState().uid ?? "0000";
  const tail = uid.slice(-4).toUpperCase();
  return truncateName(i18n.t("meta:board.captain", { tail }));
};

export const boardUid = async (): Promise<string | null> => {
  const cached = useAppStore.getState().uid;
  if (cached !== null) return cached;
  try {
    const { ensureAnonAuth } = await import("@/services/firebase");
    const uid = await ensureAnonAuth();
    if (uid !== null) useAppStore.getState().setUid(uid);
    return uid;
  } catch (error) {
    console.warn("boards: auth failed", error);
    return null;
  }
};

const captureSubmission = (): {
  boards: string[];
  entry: Omit<BoardEntry, "uid">;
  dailyDate: string | null;
  score: number;
} => {
  const run = useRunStore.getState();
  const meta = useMetaStore.getState();
  const score = runScore(run.stats);
  const daily = run.mode === "daily";
  const check = plausibility({
    score,
    depth: run.stats.depth,
    kills: run.stats.kills,
    scrap: run.stats.scrapEarned,
    hash: run.stats.actionHash,
    requiresHash: daily,
  });
  return {
    boards: daily
      ? [dailyBoardId(run.dailyDate ?? "")]
      : [DRIFT_ALLTIME_BOARD, driftWeeklyBoardId(isoWeekKey(Date.now()))],
    dailyDate: run.dailyDate,
    score,
    entry: {
      name: captainName(),
      score,
      level: meta.level,
      ship: run.shipId,
      depth: run.stats.depth,
      kills: run.stats.kills,
      scrap: run.stats.scrapEarned,
      updatedAt: Date.now(),
      hash: run.stats.actionHash,
      ...(daily ? { state: "done" as const } : {}),
      ...(check.ok ? {} : { flagged: true as const }),
    },
  };
};

export const finishScoredRun = async (): Promise<void> => {
  const run = useRunStore.getState();
  const summary = useSummaryStore.getState();
  const captured = captureSubmission();

  if (run.mode === "drift") {
    const previous = useMetaStore.getState().best.drift;
    const beaten = useMetaStore
      .getState()
      .recordDriftScore(captured.score, isoWeekKey(Date.now()));
    summary.setPersonalBest(previous, beaten);
  } else if (captured.dailyDate !== null) {
    useMetaStore
      .getState()
      .recordDaily(captured.dailyDate, captured.score, null);
    summary.setPersonalBest(captured.score, false);
    trackEvent({
      name: "daily_played",
      params: { date: captured.dailyDate, score: captured.score },
    });
  }

  summary.setSubmit("pending");
  const uid = await boardUid();
  if (uid === null) {
    useSummaryStore.getState().setSubmit("offline");
    return;
  }
  const entry: BoardEntry = { ...captured.entry, uid };
  const results = await Promise.all(
    captured.boards.map((board) => submit(board, entry)),
  );
  useSummaryStore
    .getState()
    .setSubmit(results.some(Boolean) ? "sent" : "failed");

  if (captured.dailyDate === null) return;
  const { rank } = await aroundMe(dailyBoardId(captured.dailyDate), uid);
  useMetaStore
    .getState()
    .recordDaily(captured.dailyDate, captured.score, rank);
};

export const claimDailyAttempt = async (date: string): Promise<boolean> => {
  const meta = useMetaStore.getState();
  if (meta.dailyPlayed[date] !== undefined) return false;
  const uid = await boardUid();
  if (uid === null) {
    meta.markDailyStarted(date);
    return true;
  }
  const claimed = await startDaily(
    dailyBoardId(date),
    uid,
    captainName(),
    meta.level,
    meta.selectedShip,
  );
  useMetaStore.getState().markDailyStarted(date);
  return claimed;
};
