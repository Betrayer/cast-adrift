import { Button, Group, Modal, Paper, Stack, Text, Title } from "@mantine/core";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Screen } from "@/app/Screen";
import { tokens } from "@/app/theme";
import { DIE_BY_ID } from "@/data/dice";
import { ALL_EVENTS, EVENT_BY_ID } from "@/data/events";
import { beaconsResolved, BEACON_FLAGS } from "@/data/events/beacons";
import { schools } from "@/data/schools";
import { SPEAKER_GLYPH, SPEAKER_TONE } from "@/data/speakers";
import { applyOutcome } from "@/game/events/apply";
import {
  checkOdds,
  checkPassed,
  checkTotal,
  oddsPercent,
  rollCheckDice,
  topDiceForCheck,
  type FaceDie,
} from "@/game/events/checks";
import {
  eventKind,
  optionAxisRange,
  optionMet,
  optionOutcomes,
  pickEvent,
  selectOutcome,
  type EventContext,
  type OptionContext,
} from "@/game/events/engine";
import { AxisMeter } from "@/components/AxisMeter";
import { DieCard } from "@/components/DieCard";
import { TapPopover } from "@/components/TapPopover";
import { clampAxis } from "@/game/run/axis";
import { emitEventOutcome } from "@/game/narrative/barks";
import { useBackGuard } from "@/app/backGuard";
import { completeNode, startEventBattle } from "@/game/run/flow";
import { nodeById } from "@/game/map/types";
import { eventPickSeed } from "@/game/narrative/chainMarkers";
import { duckMusic, playSfx } from "@/services/audio";
import { haptic } from "@/services/tma";
import { createStream, deriveSeed } from "@/services/rng";
import { useAppStore } from "@/stores/appStore";
import { useMetaStore } from "@/stores/metaStore";
import { useRunStore } from "@/stores/runStore";
import type { School } from "@/types/content";
import styles from "./EventScreen.module.css";
import type {
  CheckDef,
  EventDef,
  EventKind,
  EventOption,
  ForcedBattle,
  OptionRequirement,
  Outcome,
} from "@/types/events";

interface EventStreams {
  outcome: ReturnType<typeof createStream>;
  check: ReturnType<typeof createStream>;
  loot: ReturnType<typeof createStream>;
}

interface Resolved {
  nodeId: string;
  event: EventDef | null;
  streams: EventStreams;
}

const buildStreams = (seed: number, key: string): EventStreams => ({
  outcome: createStream(deriveSeed(seed, `evout:${key}`)),
  check: createStream(deriveSeed(seed, `evcheck:${key}`)),
  loot: createStream(deriveSeed(seed, `evloot:${key}`)),
});

const resolveEventForNode = (
  nodeId: string,
  kind: EventKind,
  forcedId?: string,
): Resolved => {
  const s = useRunStore.getState();
  if (forcedId !== undefined) {
    return {
      nodeId: `dbg:${forcedId}`,
      event: EVENT_BY_ID.get(forcedId) ?? null,
      streams: buildStreams(s.seed, `dbg:${forcedId}`),
    };
  }
  const pickStream = createStream(eventPickSeed(s.seed, nodeId));
  const ctx: EventContext = {
    sector: s.sector,
    axis: s.axis,
    flags: s.flags,
    seenEvents: s.seenEvents,
  };
  const event = pickEvent(ALL_EVENTS, ctx, kind, pickStream);
  return { nodeId, event, streams: buildStreams(s.seed, nodeId) };
};

const requirementLabel = (
  req: OptionRequirement,
  t: TFunction<["run", "battle"]>,
): string => {
  switch (req.req) {
    case "scrap":
      return t("run:event.reqScrap", { n: req.n });
    case "hull":
      return t("run:event.reqHull", { n: req.n });
    case "school":
      return t("run:event.reqSchool", {
        n: req.n,
        school: t(`battle:school.${req.school}`),
      });
    case "dieTier":
      return t("run:event.reqDieTier", { tier: req.tier });
    case "dieSchool":
      return t("run:event.reqDieSchool", {
        school: t(`battle:school.${req.school}`),
      });
    case "mk":
      return t("run:event.reqMk", {
        slot: t(`battle:slot.${req.slot}`),
        mk: req.mk,
      });
    case "flag":
      return t("run:event.reqFlag");
    case "axis":
      return req.min !== undefined
        ? t("run:event.reqAxisMin", { n: req.min })
        : t("run:event.reqAxisMax", { n: req.max ?? 0 });
  }
};

interface CheckFace extends FaceDie {
  school: School;
}

const checkGoalLabel = (
  check: CheckDef,
  t: TFunction<["run", "battle"]>,
): string => {
  if (check.pick === "sum") return t("run:event.checkSum", { n: check.target });
  if (check.pick === "lowest")
    return t("run:event.checkLowest", { n: check.target });
  return t("run:event.checkHighest", { n: check.target });
};

const checkPoolLabel = (
  check: CheckDef,
  t: TFunction<["run", "battle"]>,
): string | null => {
  const parts: string[] = [];
  if (check.school !== undefined) {
    parts.push(
      t("run:event.checkSchool", { school: t(`battle:school.${check.school}`) }),
    );
  }
  if (check.tierAtLeast !== undefined) {
    parts.push(t("run:event.checkTierMin", { tier: check.tierAtLeast }));
  }
  if (check.tierAtMost !== undefined) {
    parts.push(t("run:event.checkTierMax", { tier: check.tierAtMost }));
  }
  return parts.length === 0 ? null : parts.join(" · ");
};

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

export const outcomeRatio = (option: EventOption): string | null => {
  const outcomes = option.outcomes ?? [];
  if (outcomes.length < 2) return null;
  const weights = outcomes.map((o) => Math.max(1, o.weight ?? 1));
  const divisor = weights.reduce((a, b) => gcd(a, b));
  return weights.map((w) => String(Math.round(w / divisor))).join(":");
};

const DieChip = ({
  face,
  value,
}: {
  face: CheckFace;
  value: number | null;
}) => {
  const colors = schools[face.school];
  return (
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: colors.fill,
        border: `2px solid ${colors.stroke}`,
        color: colors.text,
        fontWeight: 700,
        fontSize: 18,
      }}
    >
      {value ?? "?"}
    </div>
  );
};

const CHECK_STING_MS = 340;
const AXIS_THRESHOLD = 3;

interface CheckModalProps {
  option: EventOption;
  faces: CheckFace[];
  onResolved: (outcome: Outcome | null) => void;
  onCancel: () => void;
  streams: EventStreams;
}

const CheckModal = ({
  option,
  faces,
  onResolved,
  onCancel,
  streams,
}: CheckModalProps) => {
  const { t } = useTranslation(["run", "battle", "common"]);
  const check = option.check;
  const [rolled, setRolled] = useState<{
    values: number[];
    total: number;
    success: boolean;
  } | null>(null);

  if (check === undefined) return null;
  const odds = oddsPercent(checkOdds(faces, check.pick, check.target));

  const doRoll = (): void => {
    const values = rollCheckDice(faces, streams.check);
    const total = checkTotal(values, check.pick);
    const success = checkPassed(total, check.pick, check.target);
    playSfx("checkDrum");
    window.setTimeout(() => {
      playSfx(success ? "checkPass" : "checkFail");
    }, CHECK_STING_MS);
    setRolled({ values, total, success });
  };

  const confirm = (): void => {
    if (rolled === null) return;
    const list = optionOutcomes(option, rolled.success);
    onResolved(selectOutcome(list, streams.outcome));
  };

  return (
    <Modal
      opened
      onClose={onCancel}
      centered
      withCloseButton={false}
      title={
        <Text fw={600} c={tokens.text}>
          {t("run:event.checkTitle")}
        </Text>
      }
    >
      <Stack align="center" gap="md">
        <Text size="sm" c={tokens.dim} ta="center">
          {checkGoalLabel(check, t)}
        </Text>
        {checkPoolLabel(check, t) === null ? null : (
          <Text size="xs" c={tokens.faint} ta="center">
            {checkPoolLabel(check, t)}
          </Text>
        )}
        <Group gap="xs" justify="center">
          {faces.map((face, i) => (
            <TapPopover
              key={`${face.defId}-${String(i)}`}
              label={t("battle:die.open", {
                name: t(DIE_BY_ID.get(face.defId)?.name ?? face.defId),
              })}
              testId={`check-die-${String(i)}`}
              content={<DieCard defId={face.defId} plain />}
            >
              <DieChip face={face} value={rolled?.values[i] ?? null} />
            </TapPopover>
          ))}
        </Group>
        {rolled === null ? (
          <Text fw={700} c={tokens.accent}>
            {t("run:event.odds", { n: odds })}
          </Text>
        ) : (
          <Text
            fw={700}
            c={rolled.success ? "#A8DF8E" : tokens.danger}
          >
            {t(rolled.success ? "run:event.pass" : "run:event.fail", {
              total: rolled.total,
            })}
          </Text>
        )}
        {rolled === null ? (
          <Group>
            <Button variant="default" onClick={onCancel}>
              {t("common:cancel")}
            </Button>
            <Button data-check-roll onClick={doRoll}>
              {t("run:event.roll")}
            </Button>
          </Group>
        ) : (
          <Button data-check-confirm onClick={confirm}>
            {t("run:event.continue")}
          </Button>
        )}
      </Stack>
    </Modal>
  );
};

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
}: {
  event: EventDef;
  streams: EventStreams;
  forced: boolean;
}) => {
  const { t } = useTranslation(["run", "battle", "content"]);
  const scrap = useRunStore((s) => s.scrap);
  const hull = useRunStore((s) => s.hull);
  const axis = useRunStore((s) => s.axis);
  const flags = useRunStore((s) => s.flags);
  const deck = useRunStore((s) => s.deck);
  const mkLevels = useRunStore((s) => s.mkLevels);

  const [checkOption, setCheckOption] = useState<EventOption | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [follow, setFollow] = useState<ForcedBattle | null>(null);

  const deckRefs = useMemo(
    () =>
      deck.map((d) => {
        const def = DIE_BY_ID.get(d.defId);
        return { defId: d.defId, tier: def?.tier ?? 6, school: def?.school ?? "grey" };
      }),
    [deck],
  );

  const optionCtx: OptionContext = {
    scrap,
    hull,
    axis,
    deck: deckRefs,
    mkLevels,
    flags,
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
    setOutcome(chosen);
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
    if (follow !== null) {
      startEventBattle(follow);
      return;
    }
    if (forced) {
      useAppStore.getState().go("map");
      return;
    }
    completeNode({ outcome: "cleared" });
  };

  useBackGuard("event", outcome === null ? null : onContinue);

  const axisPreview = (option: EventOption): number | null => {
    const range = optionAxisRange(option);
    if (range === null) return null;
    return clampAxis(axis + (Math.abs(range.min) >= Math.abs(range.max) ? range.min : range.max));
  };

  const beacon = eventKind(event) === "beacon";
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
      : topDiceForCheck(deckRefs, checkOption.check.dice, checkOption.check).map((f) => ({
          ...f,
          school: DIE_BY_ID.get(f.defId)?.school ?? "grey",
        }));

  return (
    <Screen centered>
      <Paper
        bg={tokens.surface1}
        p="xl"
        radius="md"
        withBorder
        w="100%"
        className={beacon ? styles.beaconFrame : undefined}
        style={
          beacon
            ? ({
                "--ca-beacon-line": schools.green.stroke,
                "--ca-beacon-glow": schools.green.text,
              } as React.CSSProperties)
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
          {event.speaker !== undefined ? (
            <Group gap={8} align="center" data-speaker={event.speaker}>
              <span
                aria-hidden
                style={{
                  color: SPEAKER_TONE[event.speaker],
                  fontSize: 18,
                  lineHeight: 1,
                }}
              >
                {SPEAKER_GLYPH[event.speaker]}
              </span>
              <Text size="sm" c={SPEAKER_TONE[event.speaker]} fw={600}>
                {t("run:event.speaker", {
                  name: t(`content:speaker.${event.speaker}`),
                })}
              </Text>
            </Group>
          ) : null}
          <Text c={tokens.dim}>{t(event.text)}</Text>

          {outcome === null ? (
            <Stack gap="xs">
              {event.options.map((option) => {
                const met = optionMet(option.requires, optionCtx);
                return (
                  <Stack gap={2} key={option.id}>
                    <Button
                      fullWidth
                      variant="default"
                      h="auto"
                      py={8}
                      data-event-option={option.id}
                      disabled={!met}
                      styles={{ label: { whiteSpace: "normal", lineHeight: 1.3 } }}
                      onClick={() => {
                        pickOption(option);
                      }}
                    >
                      {t(option.label)}
                    </Button>
                    {option.requires !== undefined && !met ? (
                      <Text size="xs" c={tokens.faint} ta="center">
                        {requirementLabel(option.requires, t)}
                      </Text>
                    ) : null}
                    {outcomeRatio(option) === null ? null : (
                      <Text size="xs" c={tokens.faint} ta="center">
                        {t("run:event.outcomeOdds", {
                          odds: outcomeRatio(option),
                        })}
                      </Text>
                    )}
                    {axisPreview(option) === null ? null : (
                      <Group gap={6} justify="center">
                        <AxisMeter
                          axis={axis}
                          preview={axisPreview(option) ?? axis}
                          compact
                        />
                      </Group>
                    )}
                    {option.check !== undefined ? (
                      <Text size="xs" c={tokens.faint} ta="center">
                        {t("run:event.checkHint", {
                          n: oddsPercent(
                            checkOdds(
                              topDiceForCheck(
                                deckRefs,
                                option.check.dice,
                                option.check,
                              ),
                              option.check.pick,
                              option.check.target,
                            ),
                          ),
                        })}
                      </Text>
                    ) : null}
                  </Stack>
                );
              })}
            </Stack>
          ) : (
            <Stack gap="md">
              <Paper bg={tokens.surface2} p="md" radius="sm">
                <Text c={tokens.text}>{t(outcome.text)}</Text>
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
    if (event.codex !== undefined) {
      useMetaStore.getState().unlockCodex(event.codex);
    }
  }, [event, forced]);

  if (position === null || map === null) return <Screen />;
  if (!forced && nodeById(map).get(position) === undefined) return <Screen />;
  if (resolved === null || event === null) {
    return <EventFallback />;
  }
  return (
    <EventRunner event={event} streams={resolved.streams} forced={forced} />
  );
};
