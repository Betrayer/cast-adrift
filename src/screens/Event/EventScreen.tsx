import { Button, Group, Paper, Stack, Text, Title } from "@mantine/core";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { Screen } from "@/app/Screen";
import { STAGGER_MS, staggerStyle } from "@/app/motion";
import { tokens } from "@/app/theme";
import { CARGO_IDS } from "@/data/cargo";
import { beaconsResolved, BEACON_FLAGS } from "@/data/events/beacons";
import { schools } from "@/data/schools";
import { SPEAKER_GLYPH, speakerTone } from "@/data/speakers";
import { applyOutcome } from "@/game/events/apply";
import { deckCheckOdds, deckRefFor, oddsPercent } from "@/game/events/checks";
import {
  eventKind,
  outcomeShipRank,
  selectOutcome,
  unmetRequirement,
  type OptionContext,
} from "@/game/events/engine";
import { AxisMeter } from "@/components/AxisMeter";
import { Typewriter } from "@/components/Typewriter";
import { cargoOfferable } from "@/game/run/cargo";
import { setupForRun } from "@/game/run/modes";
import { rankXpCounts } from "@/game/run/shipRules";
import { emitEventOutcome } from "@/game/narrative/barks";
import { keeperGreeting } from "@/game/narrative/keeperGreeting";
import { useBackGuard } from "@/app/backGuard";
import { completeNode, endRun, startEventBattle } from "@/game/run/flow";
import { nodeById, type NodeId } from "@/game/map/types";
import { duckMusic, playSfx } from "@/services/audio";
import { haptic } from "@/services/tma";
import { useAppStore } from "@/stores/appStore";
import { useMetaStore } from "@/stores/metaStore";
import { useRunStore, type EventRunState } from "@/stores/runStore";
import styles from "./EventScreen.module.css";
import { CheckModal, checkFacesFor, type CheckFace } from "./CheckModal";
import { dialogueTypesIn, EventDialogue } from "./EventDialogue";
import { EventOptionCard } from "./EventOptionCard";
import {
  eventExit,
  resolveEventForNode,
  type EventStreams,
  type Resolved,
} from "./resolveEvent";
import type {
  EventDef,
  EventKind,
  EventOption,
  ForcedBattle,
  Outcome,
} from "@/types/events";

const AXIS_THRESHOLD = 3;

const announceAxisShift = (before: number, after: number): void => {
  if (before === after) return;
  const crossed =
    Math.abs(after) >= AXIS_THRESHOLD && Math.abs(before) < AXIS_THRESHOLD;
  playSfx("axisTick", {
    rate: crossed ? 0.68 : after > before ? 1.08 : 0.92,
    gain: crossed ? 1.6 : 1,
  });
};

const EventRunner = ({
  event,
  streams,
  forced,
  nodeId,
  replay,
}: {
  event: EventDef;
  streams: EventStreams;
  forced: boolean;
  nodeId: NodeId | null;
  replay: EventRunState | null;
}) => {
  const { t } = useTranslation(["run", "battle", "content"]);
  const scrap = useRunStore((s) => s.scrap);
  const hull = useRunStore((s) => s.hull);
  const axis = useRunStore((s) => s.axis);
  const flags = useRunStore((s) => s.flags);
  const seed = useRunStore((s) => s.seed);
  const deck = useRunStore((s) => s.deck);
  const mkLevels = useRunStore((s) => s.mkLevels);
  const sector = useRunStore((s) => s.sector);
  const shipRankXp = useRunStore((s) => s.shipRankXp);
  const pendingRankUps = useRunStore((s) => s.pendingRankUps);
  const contractId = useRunStore((s) => s.contractId);

  const [checkOption, setCheckOption] = useState<EventOption | null>(null);
  const [outcomeText, setOutcomeText] = useState<string | null>(
    replay?.outcomeText ?? null,
  );
  const [follow, setFollow] = useState<ForcedBattle | null>(
    replay?.follow ?? null,
  );

  const deckRefs = useMemo(() => deck.map((die) => deckRefFor(die)), [deck]);

  const offerableCargo = CARGO_IDS.filter((id) => cargoOfferable(id));

  const rankGain =
    outcomeText !== null &&
    rankXpCounts(shipRankXp, pendingRankUps, setupForRun({ contractId }).perksDisabled === true)
      ? outcomeShipRank(event, outcomeText)
      : 0;

  const optionCtx: OptionContext = {
    scrap,
    hull,
    axis,
    deck: deckRefs,
    mkLevels,
    flags,
    offerableCargo,
  };

  const commit = (chosen: Outcome | null, optionIndex = -1): void => {
    if (chosen === null) {
      completeNode({ outcome: "cleared" });
      return;
    }
    const axisBefore = useRunStore.getState().axis;
    const result = applyOutcome(chosen, streams.loot, {
      eventId: event.id,
      optionId: event.options[optionIndex]?.id ?? "",
      optionIndex,
      ...(eventKind(event) === "beacon" ? { beacon: true } : {}),
    });
    emitEventOutcome(chosen);
    playSfx("consequenceChime");
    announceAxisShift(axisBefore, useRunStore.getState().axis);
    if (nodeId !== null) {
      useRunStore
        .getState()
        .recordEventOutcome(nodeId, event.id, chosen.text, result.follow);
    }
    setOutcomeText(chosen.text);
    setFollow(result.follow);
    setCheckOption(null);
  };

  const optionIndexOf = (option: EventOption): number =>
    event.options.findIndex((o) => o.id === option.id);

  const pickOption = (option: EventOption): void => {
    playSfx("optionTick");
    if (option.check !== undefined) {
      setCheckOption(option);
      return;
    }
    commit(
      selectOutcome(option.outcomes ?? [], streams.outcome),
      optionIndexOf(option),
    );
  };

  const onContinue = (): void => {
    switch (eventExit(useRunStore.getState().hull, follow, forced)) {
      case "death":
        endRun(false, "hull");
        return;
      case "battle":
        if (follow !== null) startEventBattle(follow);
        return;
      case "map":
        useAppStore.getState().go("map");
        return;
      case "complete":
        completeNode({ outcome: "cleared" });
    }
  };

  useBackGuard("event", outcomeText === null ? null : onContinue);

  const beacon = eventKind(event) === "beacon";
  const [keeperLine] = useState(() =>
    beacon ? keeperGreeting("beacon", seed, nodeId ?? event.id, flags) : null,
  );
  const resolvedBeacons = beaconsResolved(flags);
  const beaconIndex = Math.min(BEACON_FLAGS.length, resolvedBeacons + 1);

  useEffect(() => {
    if (!beacon) {
      playSfx("eventOpen");
      return;
    }
    playSfx("beaconEntry");
    duckMusic(1400);
    haptic("ending");
  }, [beacon]);

  useEffect(() => {
    if (!beacon) return;
    const id = window.setTimeout(() => {
      playSfx("chainStep", { rate: 0.9 + beaconIndex * 0.08 });
    }, 520);
    return () => {
      window.clearTimeout(id);
    };
  }, [beacon, beaconIndex]);

  const checkFaces: CheckFace[] =
    checkOption?.check === undefined
      ? []
      : checkFacesFor(deckRefs, checkOption.check);

  return (
    <Screen centered>
      <Paper
        bg={tokens.surface1}
        p={{ base: "md", sm: "xl" }}
        radius="md"
        withBorder
        w="100%"
        data-event-frame
        className={beacon ? styles.beaconFrame : undefined}
        style={
          beacon
            ? ({
                "--ca-beacon-line": schools.green.stroke,
                "--ca-beacon-glow": schools.green.text,
              } as CSSProperties)
            : undefined
        }
      >
        <Stack gap="md">
          <Group justify="space-between" align="center" wrap="nowrap">
            <Title order={3} c={beacon ? schools.green.text : tokens.text}>
              {t(beacon ? "run:event.beaconTitle" : "run:event.title")}
            </Title>
            <AxisMeter axis={axis} compact />
          </Group>
          {beacon ? (
            <Group gap={10} align="center" data-beacon-counter={beaconIndex}>
              <span
                className={styles.beaconKicker}
                style={{ color: schools.green.text }}
              >
                {t("run:event.beaconCounter", {
                  n: beaconIndex,
                  max: BEACON_FLAGS.length,
                })}
              </span>
              <span className={styles.beaconPips}>
                {BEACON_FLAGS.map((key, i) => (
                  <span
                    key={key}
                    className={styles.pip}
                    data-lit={i < resolvedBeacons}
                    data-current={i === resolvedBeacons}
                  />
                ))}
              </span>
            </Group>
          ) : null}
          {keeperLine === null ? null : (
            <Stack gap={2}>
              {event.speaker === "beaconKeeper" ? null : (
                <Group gap={6} align="center" data-keeper-speaker="beaconKeeper">
                  <span
                    aria-hidden
                    style={{
                      color: speakerTone("beaconKeeper"),
                      fontSize: 14,
                      lineHeight: 1,
                    }}
                  >
                    {SPEAKER_GLYPH.beaconKeeper}
                  </span>
                  <Text size="xs" c={speakerTone("beaconKeeper")} fw={600}>
                    {t("content:speaker.beaconKeeper")}
                  </Text>
                </Group>
              )}
              <Text size="xs" c={tokens.dim} fs="italic" data-keeper-line={keeperLine.id}>
                {t(keeperLine.text)}
              </Text>
            </Stack>
          )}
          {event.speaker !== undefined ? (
            <Group gap={8} align="center" data-speaker={event.speaker}>
              <span
                aria-hidden
                style={{
                  color: speakerTone(event.speaker),
                  fontSize: 18,
                  lineHeight: 1,
                }}
              >
                {SPEAKER_GLYPH[event.speaker]}
              </span>
              <Text size="sm" c={speakerTone(event.speaker)} fw={600}>
                {t("run:event.speaker", {
                  name: t(`content:speaker.${event.speaker}`),
                })}
              </Text>
            </Group>
          ) : null}
          <Text c={tokens.dim}>{t(event.text)}</Text>
          {event.dialogue === undefined || event.dialogue.length === 0 ? null : (
            <EventDialogue
              lines={event.dialogue}
              typesIn={dialogueTypesIn(replay) && outcomeText === null}
            />
          )}

          {outcomeText === null ? (
            <Stack gap="xs" style={staggerStyle(STAGGER_MS.card)}>
              {event.options.map((option, index) => (
                <EventOptionCard
                  key={option.id}
                  riseIndex={index}
                  option={option}
                  unmet={unmetRequirement(option.requires, optionCtx)}
                  axis={axis}
                  sector={sector}
                  checkOddsPercent={
                    option.check === undefined
                      ? null
                      : oddsPercent(deckCheckOdds(deckRefs, option.check))
                  }
                  onPick={pickOption}
                />
              ))}
            </Stack>
          ) : (
            <Stack gap="md">
              <Paper bg={tokens.surface2} p="md" radius="sm" data-event-outcome>
                <Text c={tokens.text}>
                  <Typewriter
                    text={t(outcomeText)}
                    instant={outcomeText === (replay?.outcomeText ?? null)}
                  />
                </Text>
                {rankGain > 0 ? (
                  <Text size="sm" c={tokens.amber} mt="xs" data-testid="event-ship-rank">
                    {t("run:event.shipRankGain", { n: rankGain })}
                  </Text>
                ) : null}
              </Paper>
              <Button fullWidth onClick={onContinue}>
                {follow !== null
                  ? t("run:event.toBattle")
                  : t("run:event.continue")}
              </Button>
            </Stack>
          )}
        </Stack>
      </Paper>

      {checkOption !== null ? (
        <CheckModal
          option={checkOption}
          faces={checkFaces}
          streams={streams}
          onResolved={(chosen) => {
            commit(chosen, optionIndexOf(checkOption));
          }}
          onCancel={() => {
            setCheckOption(null);
          }}
        />
      ) : null}
    </Screen>
  );
};

const EventFallback = () => {
  const { t } = useTranslation(["run"]);
  const leave = (): void => {
    completeNode({ outcome: "cleared" });
  };
  useBackGuard("event", leave);
  return (
    <Screen centered>
      <Paper bg={tokens.surface1} p="xl" radius="md" withBorder w="100%">
        <Stack align="center" gap="md">
          <Title order={3} c={tokens.text}>
            {t("run:event.title")}
          </Title>
          <Text c={tokens.dim} ta="center">
            {t("run:event.quiet")}
          </Text>
          <Button size="md" onClick={leave}>
            {t("run:event.continue")}
          </Button>
        </Stack>
      </Paper>
    </Screen>
  );
};

export const EventScreen = () => {
  const position = useRunStore((s) => s.position);
  const map = useRunStore((s) => s.map);
  const forcedId = useAppStore((s) => s.params?.eventId);
  const forced = forcedId !== undefined;
  const nodeKind: EventKind =
    map === null || position === null
      ? "event"
      : nodeById(map).get(position)?.type === "beacon"
        ? "beacon"
        : "event";
  const [resolved] = useState<Resolved | null>(() => {
    if (forcedId !== undefined) return resolveEventForNode("", "event", forcedId);
    return position === null
      ? null
      : resolveEventForNode(position, nodeKind);
  });

  const event = resolved?.event ?? null;

  useEffect(() => {
    if (event === null || forced) return;
    useRunStore.getState().markEventSeen(event.id);
    if (position !== null) {
      useRunStore.getState().beginEventNode(position, event.id);
    }
    if (event.codex !== undefined) {
      useMetaStore.getState().unlockCodex(event.codex);
    }
  }, [event, forced, position]);

  if (position === null || map === null) return <Screen />;
  if (!forced && nodeById(map).get(position) === undefined) return <Screen />;
  if (resolved === null || event === null) {
    return <EventFallback />;
  }
  return (
    <EventRunner
      event={event}
      streams={resolved.streams}
      forced={forced}
      nodeId={forced ? null : position}
      replay={resolved.replay}
    />
  );
};
