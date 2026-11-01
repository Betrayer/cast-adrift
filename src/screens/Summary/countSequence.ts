import { MOTION_MS, STAGGER_MS } from "@/app/motion";

export const SUMMARY_COUNT_ORDER = [
  "xp",
  "shards",
  "nodes",
  "kills",
  "scrap",
] as const;

export type SummaryCountId = (typeof SUMMARY_COUNT_ORDER)[number];

export interface SummaryCountStep {
  id: SummaryCountId;
  delay: number;
  ms: number;
}

const HEADLINE_MS = MOTION_MS.l;

const RUN_STAT_MS = MOTION_MS.m;

const RUN_STATS_AT = HEADLINE_MS * 2;

export const SUMMARY_COUNT_STEPS: readonly SummaryCountStep[] = [
  { id: "xp", delay: 0, ms: HEADLINE_MS },
  { id: "shards", delay: HEADLINE_MS, ms: HEADLINE_MS },
  { id: "nodes", delay: RUN_STATS_AT, ms: RUN_STAT_MS },
  { id: "kills", delay: RUN_STATS_AT + STAGGER_MS.card, ms: RUN_STAT_MS },
  { id: "scrap", delay: RUN_STATS_AT + STAGGER_MS.card * 2, ms: RUN_STAT_MS },
];

export const SUMMARY_SEQUENCE_MS = Math.max(
  ...SUMMARY_COUNT_STEPS.map((step) => step.delay + step.ms),
);

export const SUMMARY_CEREMONY_AT_MS = SUMMARY_SEQUENCE_MS + MOTION_MS.s;

export const COUNT_MARK = "";

export const splitAtCountMark = (
  text: string,
): { before: string; after: string } => {
  const [before = "", ...after] = text.split(COUNT_MARK);
  return { before, after: after.join("") };
};
