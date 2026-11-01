import { Button, Group, Modal, Stack, Text } from "@mantine/core";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useSweepWhen } from "@/app/motion";
import { tokens } from "@/app/theme";
import { useRollSettings } from "@/app/rollSettings";
import { DIE_BY_ID } from "@/data/dice";
import {
  checkOdds,
  oddsPercent,
  rollCheck,
  topDiceForCheck,
  type CheckOutcome,
  type CheckRoll,
  type DeckRef,
  type FaceDie,
} from "@/game/events/checks";
import { optionOutcomes, selectOutcome } from "@/game/events/engine";
import { noteCheckWon } from "@/game/meta/counters";
import { DieCard } from "@/components/DieCard";
import { DiceRollOverlay, type OverlayDie } from "@/components/DiceRollOverlay";
import { TapPopover } from "@/components/TapPopover";
import { playSfx } from "@/services/audio";
import { haptic } from "@/services/tma";
import type { School } from "@/types/content";
import type { CheckDef, EventOption, Outcome } from "@/types/events";
import type { EventStreams } from "./resolveEvent";

export interface CheckFace extends FaceDie {
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

const CHECK_DIE_SIZE = 80;

const withSchool = (face: FaceDie): CheckFace => ({
  ...face,
  school: DIE_BY_ID.get(face.defId)?.school ?? "grey",
});

export const checkFacesFor = (
  deck: readonly DeckRef[],
  check: CheckDef,
): CheckFace[] => topDiceForCheck(deck, check.dice, check).map(withSchool);

const checkDice = (faces: readonly CheckFace[], rolled: CheckRoll | null): OverlayDie[] =>
  faces.map((face, i) => ({
    key: `${face.defId}-${String(i)}`,
    defId: face.defId,
    tier: face.tier,
    faces: face.faces,
    school: face.school,
    value: rolled?.values[i] ?? null,
  }));

interface CheckDismiss {
  onClose: () => void;
  closeOnEscape: boolean;
  closeOnClickOutside: boolean;
}

export const checkDismissGuard = (
  rolled: CheckOutcome | null,
  cancel: () => void,
): CheckDismiss => ({
  onClose: () => {
    if (rolled === null) cancel();
  },
  closeOnEscape: rolled === null,
  closeOnClickOutside: rolled === null,
});

export interface CheckModalProps {
  option: EventOption;
  faces: CheckFace[];
  onResolved: (outcome: Outcome | null) => void;
  onCancel: () => void;
  streams: Pick<EventStreams, "check" | "outcome">;
}

export const CheckModal = ({
  option,
  faces,
  onResolved,
  onCancel,
  streams,
}: CheckModalProps) => {
  const { t } = useTranslation(["run", "battle", "common"]);
  const check = option.check;
  const [rolled, setRolled] = useState<CheckRoll | null>(null);
  const [settled, setSettled] = useState(false);
  const roll = useRollSettings();
  const dice = useMemo(() => checkDice(faces, rolled), [faces, rolled]);
  const attachConfirm = useSweepWhen<HTMLButtonElement>(settled);

  if (check === undefined) return null;
  const poolLabel = checkPoolLabel(check, t);
  const odds = oddsPercent(checkOdds(faces, check.pick, check.target));

  const doRoll = (): void => {
    const outcome = rollCheck(faces, check, streams.check);
    if (outcome.success) noteCheckWon();
    playSfx("checkDrum");
    setRolled(outcome);
  };

  const land = (): void => {
    if (rolled === null) return;
    setSettled(true);
    playSfx(rolled.success ? "checkPass" : "checkFail");
    haptic("resolveTick");
  };

  const confirm = (): void => {
    if (rolled === null) return;
    const list = optionOutcomes(option, rolled.success);
    onResolved(selectOutcome(list, streams.outcome));
  };

  return (
    <Modal
      opened
      {...checkDismissGuard(rolled, onCancel)}
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
        {poolLabel === null ? null : (
          <Text size="xs" c={tokens.faint} ta="center">
            {poolLabel}
          </Text>
        )}
        {faces.length === 0 ? (
          <Text size="xs" c={tokens.danger} ta="center" data-check-empty>
            {t("run:event.checkNoDice")}
          </Text>
        ) : null}
        <DiceRollOverlay
          dice={dice}
          seed={rolled?.seed ?? 0}
          style={roll.style}
          durationMs={roll.durationMs}
          reduced={roll.reduced}
          size={CHECK_DIE_SIZE}
          idle={rolled === null}
          onSettled={land}
          testId="check-roll"
          wrapDie={(die, i, canvas) => (
            <TapPopover
              label={t("battle:die.open", {
                name: t(DIE_BY_ID.get(die.defId)?.name ?? die.defId),
              })}
              testId={`check-die-${String(i)}`}
              content={
                <DieCard defId={die.defId} fusion={faces[i]?.fusion} plain />
              }
            >
              {canvas}
            </TapPopover>
          )}
        />
        {rolled === null ? (
          <Text fw={700} c={tokens.accent}>
            {t("run:event.odds", { n: odds })}
          </Text>
        ) : !settled ? (
          <Text fw={700} c={tokens.faint} aria-hidden>
            {"\u00a0"}
          </Text>
        ) : (
          <Text
            fw={700}
            c={rolled.success ? "#A8DF8E" : tokens.danger}
            data-check-result={rolled.success ? "pass" : "fail"}
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
          <Button
            ref={attachConfirm}
            data-check-confirm
            data-sweep-host
            disabled={!settled}
            onClick={confirm}
          >
            {t("run:event.continue")}
          </Button>
        )}
      </Stack>
    </Modal>
  );
};
