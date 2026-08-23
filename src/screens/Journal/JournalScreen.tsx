import { Divider, Group, Paper, Stack, Text } from "@mantine/core";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Screen } from "@/app/Screen";
import { AppHeader } from "@/components/AppHeader";
import { tokens } from "@/app/theme";
import { AxisMeter, axisTone } from "@/components/AxisMeter";
import { beaconsResolved, BEACON_FLAGS } from "@/data/events/beacons";
import { chainViews } from "@/data/narrative/chains";
import { SPEAKER_TONE } from "@/data/speakers";
import { AXIS_MAX, AXIS_MIN } from "@/game/run/axis";
import { journalAxisHistory, type JournalEntry } from "@/game/run/journal";
import { useNarrativeStore } from "@/stores/narrativeStore";
import { useRunStore } from "@/stores/runStore";
import styles from "./JournalScreen.module.css";

const MARKER: Record<JournalEntry["k"], string> = {
  choice: "▸",
  consequence: "↳",
  chain: "⟡",
  beacon: "✦",
  memory: "◈",
  axis: "±",
  wormhole: "◉",
};

const SILENT_TELEGRAPH_AT = 3;

const Sparkline = ({ points }: { points: readonly number[] }) => {
  if (points.length < 2) return null;
  const width = 240;
  const height = 44;
  const span = AXIS_MAX - AXIS_MIN;
  const x = (i: number): number =>
    points.length === 1 ? 0 : (i / (points.length - 1)) * width;
  const y = (v: number): number => height - ((v - AXIS_MIN) / span) * height;
  const path = points
    .map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`)
    .join(" ");
  const last = points[points.length - 1] ?? 0;
  return (
    <svg
      className={styles.sparkline}
      viewBox={`0 0 ${String(width)} ${String(height)}`}
      preserveAspectRatio="none"
      role="img"
      data-axis-sparkline
    >
      <line
        x1={0}
        y1={y(0)}
        x2={width}
        y2={y(0)}
        stroke={tokens.line}
        strokeDasharray="4 4"
      />
      <path d={path} fill="none" stroke={axisTone(last)} strokeWidth={2} />
    </svg>
  );
};

const EntryRow = ({ entry }: { entry: JournalEntry }) => {
  const { t } = useTranslation(["run", "content"]);
  const body = ((): string => {
    switch (entry.k) {
      case "choice":
        return t(entry.text);
      case "consequence":
        return t(entry.origin);
      case "chain":
        return t(entry.label);
      case "beacon":
        return t("run:journal.beacon", { n: entry.resolved, max: BEACON_FLAGS.length });
      case "memory":
        return t("run:journal.memory", { n: entry.order });
      case "axis":
        return t(`run:journal.axis.${entry.source}`, {
          from: entry.from,
          to: entry.to,
        });
      case "wormhole":
        return t(`run:journal.wormhole.${entry.branch}`, {
          rows: Math.abs(entry.rows),
          way: t(`run:journal.wormholeWay.${entry.direction}`),
        });
    }
  })();
  return (
    <div className={styles.entry} data-journal-entry={entry.k}>
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
  const flags = useRunStore((s) => s.flags);
  const axis = useRunStore((s) => s.axis);
  const sector = useRunStore((s) => s.sector);

  const resolved = useMemo(() => beaconsResolved(flags), [flags]);
  const chains = useMemo(() => chainViews(flags, sector), [flags, sector]);
  const history = useMemo(() => journalAxisHistory(journal), [journal]);
  const sectors = useMemo(() => {
    const seen: number[] = [];
    for (const entry of journal) {
      if (!seen.includes(entry.sector)) seen.push(entry.sector);
    }
    return seen;
  }, [journal]);

  return (
    <Screen
      width="wide"
      header={<AppHeader />}
    >
      <div
        className={styles.columns}
        style={
          {
            "--ca-journal-line": tokens.line,
            "--ca-journal-bg": tokens.bg,
          } as React.CSSProperties
        }
      >
        <Stack gap="xs">
          {journal.length === 0 ? (
            <Text size="sm" c={tokens.faint}>
              {t("run:journal.empty")}
            </Text>
          ) : (
            sectors.map((n) => (
              <Stack key={n} gap={0}>
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

        <Stack gap="sm">
          <Paper bg={tokens.surface1} p="md" radius="md" withBorder>
            <Stack gap={8}>
              <Text size="xs" c={tokens.faint}>
                {t("run:journal.chainsTitle")}
              </Text>
              {chains.map((chain) => (
                <Stack key={chain.id} gap={2} data-journal-chain={chain.id}>
                  <Group gap={6} wrap="nowrap">
                    <Text size="sm" fw={600} c={SPEAKER_TONE[chain.speaker]}>
                      {t(chain.name)}
                    </Text>
                    <Text size="xs" c={tokens.faint}>
                      {t("run:journal.chainStep", {
                        cur: chain.step,
                        max: chain.total,
                      })}
                    </Text>
                    {chain.availableHere ? (
                      <Text size="xs" fw={700} c={tokens.amber}>
                        {t("run:journal.chainHere")}
                      </Text>
                    ) : null}
                  </Group>
                  <Text
                    size="xs"
                    c={chain.state === "betrayed" ? tokens.danger : tokens.dim}
                  >
                    {t(chain.hint)}
                  </Text>
                </Stack>
              ))}
            </Stack>
          </Paper>

          <Paper bg={tokens.surface1} p="md" radius="md" withBorder>
            <Stack gap={6}>
              <Text size="xs" c={tokens.faint}>
                {t("run:journal.axisTitle")}
              </Text>
              <AxisMeter axis={axis} />
              <Sparkline points={history} />
            </Stack>
          </Paper>

          <Paper bg={tokens.surface1} p="md" radius="md" withBorder>
            <Stack gap={4}>
              <Text size="xs" c={tokens.faint}>
                {t("run:journal.beaconsTitle")}
              </Text>
              <Text size="sm" c={tokens.text} data-journal-beacons>
                {t("run:journal.beaconsCount", {
                  n: resolved,
                  max: BEACON_FLAGS.length,
                })}
              </Text>
              {resolved >= SILENT_TELEGRAPH_AT ? (
                <Text size="xs" c={tokens.amber}>
                  {t("run:journal.beaconsHint")}
                </Text>
              ) : null}
            </Stack>
          </Paper>

          <Divider color={tokens.line} />
          <Text size="xs" c={tokens.faint}>
            {t("run:journal.here", { n: sector })}
          </Text>
        </Stack>
      </div>
    </Screen>
  );
};
