import { Box, Button, Group, Modal, Paper, Stack, Text, Title } from "@mantine/core";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { tokens } from "@/app/theme";
import { DIE_BY_ID } from "@/data/dice";
import { ALL_EVENTS, EVENT_BY_ID } from "@/data/events";
import { schools } from "@/data/schools";
import { applyOutcome } from "@/game/events/apply";
import {
  checkOdds,
  checkTotal,
  oddsPercent,
  rollCheckDice,
  topDiceForCheck,
  type FaceDie,
} from "@/game/events/checks";
import {
  optionMet,
  optionOutcomes,
  pickEvent,
  selectOutcome,
  type EventContext,
  type OptionContext,
} from "@/game/events/engine";
import { emitEventOutcome } from "@/game/narrative/barks";
import { completeNode, startEventBattle } from "@/game/run/flow";
import { nodeById } from "@/game/map/types";
import { createStream, deriveSeed } from "@/services/rng";
import { useAppStore } from "@/stores/appStore";
import { useMetaStore } from "@/stores/metaStore";
import { useRunStore } from "@/stores/runStore";
import type { School } from "@/types/content";
import type {
  EventDef,
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

const resolveEventForNode = (nodeId: string, forcedId?: string): Resolved => {
  const s = useRunStore.getState();
  if (forcedId !== undefined) {
    return {
      nodeId: `dbg:${forcedId}`,
      event: EVENT_BY_ID.get(forcedId) ?? null,
      streams: buildStreams(s.seed, `dbg:${forcedId}`),
    };
  }
  const pickStream = createStream(deriveSeed(s.seed, `evpick:${nodeId}`));
  const ctx: EventContext = {
    sector: s.sector,
    axis: s.axis,
    flags: s.flags,
    seenEvents: s.seenEvents,
  };
  const event = pickEvent(ALL_EVENTS, ctx, "event", pickStream);
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
  }
};

interface CheckFace extends FaceDie {
  school: School;
}

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
  const { t } = useTranslation(["run", "battle"]);
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
    setRolled({ values, total, success: total >= check.target });
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
          {check.pick === "sum"
            ? t("run:event.checkSum", { n: check.target })
            : t("run:event.checkHighest", { n: check.target })}
        </Text>
        <Group gap="xs" justify="center">
          {faces.map((face, i) => (
            <DieChip
              key={`${face.defId}-${String(i)}`}
              face={face}
              value={rolled?.values[i] ?? null}
            />
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
              {t("run:event.back")}
            </Button>
            <Button onClick={doRoll}>{t("run:event.roll")}</Button>
          </Group>
        ) : (
          <Button onClick={confirm}>{t("run:event.continue")}</Button>
        )}
      </Stack>
    </Modal>
  );
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
    deck: deckRefs,
    mkLevels,
    flags,
  };

  const commit = (chosen: Outcome | null): void => {
    if (chosen === null) {
      completeNode({ outcome: "cleared" });
      return;
    }
    const result = applyOutcome(chosen, streams.loot);
    emitEventOutcome(chosen);
    setOutcome(chosen);
    setFollow(result.follow);
    setCheckOption(null);
  };

  const pickOption = (option: EventOption): void => {
    if (option.check !== undefined) {
      setCheckOption(option);
      return;
    }
    commit(selectOutcome(option.outcomes ?? [], streams.outcome));
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

  const checkFaces: CheckFace[] =
    checkOption?.check === undefined
      ? []
      : topDiceForCheck(deckRefs, checkOption.check.dice).map((f) => ({
          ...f,
          school: DIE_BY_ID.get(f.defId)?.school ?? "grey",
        }));

  return (
    <Stack align="center" justify="center" mih="100dvh" p="md" bg={tokens.bg}>
      <Paper bg={tokens.surface1} p="xl" radius="md" withBorder maw={460} w="100%">
        <Stack gap="md">
          <Title order={3} c={tokens.text}>
            {t("run:event.title")}
          </Title>
          {event.speaker !== undefined ? (
            <Text size="sm" c={tokens.accent} fw={600}>
              {t("run:event.speaker", {
                name: t(`content:speaker.${event.speaker}`),
              })}
            </Text>
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
                      disabled={!met}
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
                    {option.check !== undefined ? (
                      <Text size="xs" c={tokens.faint} ta="center">
                        {t("run:event.checkHint", {
                          n: oddsPercent(
                            checkOdds(
                              topDiceForCheck(deckRefs, option.check.dice),
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
          onResolved={commit}
          onCancel={() => {
            setCheckOption(null);
          }}
        />
      ) : null}
    </Stack>
  );
};

const EventFallback = () => {
  const { t } = useTranslation(["run"]);
  return (
    <Stack align="center" justify="center" mih="100dvh" p="md" bg={tokens.bg}>
      <Paper bg={tokens.surface1} p="xl" radius="md" withBorder maw={420}>
        <Stack align="center" gap="md">
          <Title order={3} c={tokens.text}>
            {t("run:event.title")}
          </Title>
          <Text c={tokens.dim} ta="center">
            {t("run:event.quiet")}
          </Text>
          <Button
            size="md"
            onClick={() => {
              completeNode({ outcome: "cleared" });
            }}
          >
            {t("run:event.continue")}
          </Button>
        </Stack>
      </Paper>
    </Stack>
  );
};

export const EventScreen = () => {
  const position = useRunStore((s) => s.position);
  const map = useRunStore((s) => s.map);
  const forcedId = useAppStore((s) => s.params?.eventId);
  const forced = forcedId !== undefined;
  const [resolved] = useState<Resolved | null>(() => {
    if (forcedId !== undefined) return resolveEventForNode("", forcedId);
    return position === null ? null : resolveEventForNode(position);
  });

  const event = resolved?.event ?? null;

  useEffect(() => {
    if (event === null || forced) return;
    useRunStore.getState().markEventSeen(event.id);
    if (event.codex !== undefined) {
      useMetaStore.getState().unlockCodex(event.codex);
    }
  }, [event, forced]);

  if (position === null || map === null) {
    return <Box bg={tokens.bg} mih="100dvh" />;
  }
  if (!forced && nodeById(map).get(position) === undefined) {
    return <Box bg={tokens.bg} mih="100dvh" />;
  }
  if (resolved === null || event === null) {
    return <EventFallback />;
  }
  return (
    <EventRunner event={event} streams={resolved.streams} forced={forced} />
  );
};
