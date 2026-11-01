import { Divider, Group, Paper, Stack, Text } from "@mantine/core";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { riseStyle } from "@/app/motion";
import { tokens } from "@/app/theme";
import { AxisMeter, axisTone } from "@/components/AxisMeter";
import { beaconsResolved, BEACON_FLAGS } from "@/data/events/beacons";
import { chainViews } from "@/data/narrative/chains";
import { speakerTone } from "@/data/speakers";
import { AXIS_MAX, AXIS_MIN } from "@/game/run/axis";
import { journalAxisHistory } from "@/game/run/journal";
import { useNarrativeStore } from "@/stores/narrativeStore";
import { useRunStore } from "@/stores/runStore";
import styles from "./JournalScreen.module.css";

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

export const JournalSidebar = () => {
  const { t } = useTranslation(["run", "content"]);
  const journal = useNarrativeStore((s) => s.journal);
  const flags = useRunStore((s) => s.flags);
  const axis = useRunStore((s) => s.axis);
  const sector = useRunStore((s) => s.sector);
  const resolved = useMemo(() => beaconsResolved(flags), [flags]);
  const chains = useMemo(() => chainViews(flags, sector), [flags, sector]);
  const history = useMemo(() => journalAxisHistory(journal), [journal]);

  return (
    <Stack gap="sm">
      <Paper bg={tokens.surface1} p="md" radius="md" withBorder>
        <Stack gap={8}>
          <Text size="xs" c={tokens.faint}>
            {t("run:journal.chainsTitle")}
          </Text>
          {chains.map((chain, index) => (
            <Stack
              key={chain.id}
              gap={2}
              data-journal-chain={chain.id}
              data-rise
              style={riseStyle(index)}
            >
              <Group gap={6} wrap="nowrap">
                <Text size="sm" fw={600} c={speakerTone(chain.speaker)}>
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
  );
};
