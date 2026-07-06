import {
  Button,
  Group,
  Paper,
  ScrollArea,
  Select,
  Stack,
  Text,
} from "@mantine/core";
import { useState } from "react";
import { tokens } from "@/app/theme";
import { ALL_EVENTS } from "@/data/events";
import { PUZZLES } from "@/data/puzzles";
import { TIDE_CAP } from "@/game/events/apply";
import { useAppStore } from "@/stores/appStore";
import { useRunStore } from "@/stores/runStore";

const isDebug = (): boolean =>
  import.meta.env.DEV &&
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("debug") === "1";

const FLAGS: readonly string[] = [
  "courierFreed",
  "courierDiscount",
  "maraFriend",
  "maraGrudge",
  "hunterMark",
  "hunterEngaged",
  "heardChoir",
  "crewSaved",
  "alerted",
  "patrolCleared",
  "yusufFriend",
  "yusufGrudge",
];

const eventOptions = ALL_EVENTS.map((e) => ({
  value: e.id,
  label: `${e.requires?.flags !== undefined ? "⇄ " : ""}${e.id}`,
}));

const puzzleOptions = PUZZLES.map((p) => ({
  value: p.id,
  label: `${p.id} · ${p.goal.g}`,
}));

export const DevPanel = () => {
  const active = useRunStore((s) => s.active);
  const screen = useAppStore((s) => s.screen);
  const flags = useRunStore((s) => s.flags);
  const anomalyStreak = useRunStore((s) => s.anomalyStreak);
  const interferenceStacks = useRunStore((s) => s.interferenceStacks);
  const [eventId, setEventId] = useState<string | null>(
    eventOptions[0]?.value ?? null,
  );
  const [puzzleId, setPuzzleId] = useState<string | null>(
    puzzleOptions[0]?.value ?? null,
  );

  if (!isDebug() || !active || screen === "battle") return null;

  const go = useAppStore.getState().go;

  const toggleFlag = (key: string): void => {
    const s = useRunStore.getState();
    if (s.flags[key] !== undefined) s.clearFlag(key);
    else s.setFlag(key, key === "courierDiscount" ? 2 : true);
  };

  const bumpTide = (n: number): void => {
    const s = useRunStore.getState();
    useRunStore.setState({ tide: Math.max(0, Math.min(TIDE_CAP, s.tide + n)) });
  };

  return (
    <Paper
      pos="fixed"
      top={8}
      right={8}
      w={228}
      p="xs"
      radius="md"
      withBorder
      bg="rgba(8,12,20,0.94)"
      style={{ zIndex: 600 }}
    >
      <ScrollArea.Autosize mah="82dvh">
        <Stack gap={6}>
          <Text size="xs" fw={700} c={tokens.text}>
            dev · campaign
          </Text>

          <Select
            size="xs"
            label="event (⇄ = callback)"
            data={eventOptions}
            value={eventId}
            onChange={setEventId}
            searchable
            comboboxProps={{ zIndex: 1000, withinPortal: true }}
          />
          <Button
            size="compact-xs"
            disabled={eventId === null}
            onClick={() => {
              if (eventId !== null) go("event", { eventId });
            }}
          >
            open event
          </Button>

          <Select
            size="xs"
            label="puzzle"
            data={puzzleOptions}
            value={puzzleId}
            onChange={setPuzzleId}
            searchable
            comboboxProps={{ zIndex: 1000, withinPortal: true }}
          />
          <Button
            size="compact-xs"
            disabled={puzzleId === null}
            onClick={() => {
              if (puzzleId !== null) go("puzzle", { puzzleId });
            }}
          >
            open puzzle
          </Button>

          <Text size="xs" fw={700} c={tokens.text} mt={4}>
            interference (streak {anomalyStreak} · ×{interferenceStacks})
          </Text>
          <Group gap={3}>
            <Button
              size="compact-xs"
              variant="default"
              onClick={() => {
                useRunStore.getState().recordAnomalyUnsolved();
              }}
            >
              leave unsolved +1
            </Button>
            <Button
              size="compact-xs"
              variant="default"
              onClick={() => {
                useRunStore.getState().recordAnomalySolved();
              }}
            >
              solve · clear
            </Button>
          </Group>

          <Text size="xs" fw={700} c={tokens.text} mt={4}>
            flags
          </Text>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3 }}>
            {FLAGS.map((key) => {
              const on = flags[key] !== undefined;
              return (
                <Button
                  key={key}
                  size="compact-xs"
                  variant={on ? "filled" : "default"}
                  color={on ? "accent" : "gray"}
                  onClick={() => {
                    toggleFlag(key);
                  }}
                  styles={{ label: { fontSize: 9 } }}
                >
                  {key}
                </Button>
              );
            })}
          </div>

          <Text size="xs" fw={700} c={tokens.text} mt={4}>
            resources
          </Text>
          <Group gap={3}>
            <Button size="compact-xs" variant="default" onClick={() => { useRunStore.getState().addScrap(50); }}>
              +50 scrap
            </Button>
            <Button size="compact-xs" variant="default" onClick={() => { const s = useRunStore.getState(); s.spendScrap(Math.min(20, s.scrap)); }}>
              −20
            </Button>
          </Group>
          <Group gap={3}>
            <Button size="compact-xs" variant="default" onClick={() => { const s = useRunStore.getState(); s.setHull(s.hullMax); }}>
              full hull
            </Button>
            <Button size="compact-xs" variant="default" onClick={() => { const s = useRunStore.getState(); s.setHull(s.hull - 10); }}>
              −10 hull
            </Button>
          </Group>
          <Group gap={3}>
            <Button size="compact-xs" variant="default" onClick={() => { useRunStore.getState().addAxis(2); }}>
              axis +2
            </Button>
            <Button size="compact-xs" variant="default" onClick={() => { useRunStore.getState().addAxis(-2); }}>
              axis −2
            </Button>
            <Button size="compact-xs" variant="default" onClick={() => { bumpTide(1); }}>
              tide +1
            </Button>
            <Button size="compact-xs" variant="default" onClick={() => { bumpTide(-1); }}>
              tide −1
            </Button>
          </Group>

          <Text size="xs" fw={700} c={tokens.text} mt={4}>
            go to
          </Text>
          <Group gap={3}>
            <Button size="compact-xs" variant="default" onClick={() => { go("map"); }}>
              map
            </Button>
            <Button size="compact-xs" variant="default" onClick={() => { go("shop"); }}>
              shop
            </Button>
            <Button size="compact-xs" variant="default" onClick={() => { go("shipyard"); }}>
              shipyard
            </Button>
            <Button size="compact-xs" variant="default" onClick={() => { go("codex"); }}>
              codex
            </Button>
          </Group>
        </Stack>
      </ScrollArea.Autosize>
    </Paper>
  );
};
