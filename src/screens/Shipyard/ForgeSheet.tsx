import { Button, Modal, Stack, Text } from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { riseStyle } from "@/app/motion";
import { useBackBlock } from "@/app/backGuard";
import { tokens } from "@/app/theme";
import { DieCard } from "@/components/DieCard";
import {
  forgeOptions,
  forgePartners,
  hasForgeablePair,
  type ForgeOption,
} from "@/game/dice/forge";
import { forgeLevel, handDie, type HandDie } from "@/game/dice/tier";
import { autosaveRun } from "@/game/run/flow";
import { forgeInRun } from "@/game/run/forge";
import { playSfx } from "@/services/audio";
import { haptic } from "@/services/tma";
import { useMetaStore } from "@/stores/metaStore";
import { useRunStore } from "@/stores/runStore";
import { useReducedMotion } from "@/stores/settingsStore";
import {
  FORGE_BEAT_MS,
  forgeOffsets,
  forgeOffsetStyle,
  type ForgeOffset,
} from "./forgeBeat";
import { ForgeOptionCard } from "./ForgeOptionCard";
import { ForgeReveal } from "./ForgeReveal";
import styles from "./ShipyardScreen.module.css";

interface Forging {
  offsets: ReadonlyMap<string, ForgeOffset>;
}

const forgedResult = (option: ForgeOption): HandDie | undefined =>
  option.kind === "recipe"
    ? handDie(option.result)
    : useRunStore.getState().deck.find((die) => die.uid === option.signature);

interface ForgeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ForgeSheet = ({ open, onOpenChange }: ForgeSheetProps) => {
  const { t } = useTranslation(["run", "content"]);
  const deck = useRunStore((s) => s.deck);
  const scrap = useRunStore((s) => s.scrap);
  const engravings = useMetaStore((s) => s.engravings);
  const [first, setFirst] = useState<string | null>(null);
  const [second, setSecond] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<HandDie | null>(null);
  const [forging, setForging] = useState<Forging | null>(null);
  const forgingNow = useRef(false);
  const beat = useRef(0);
  const tiles = useRef<Map<string, HTMLButtonElement>>(new Map());
  const reduced = useReducedMotion();

  useBackBlock(forging !== null);

  const available = hasForgeablePair(deck);
  const partners = first === null ? [] : forgePartners(deck, first);
  const a = deck.find((die) => die.uid === first);
  const b = deck.find((die) => die.uid === second);
  const options: ForgeOption[] = a !== undefined && b !== undefined ? forgeOptions(a, b) : [];

  const reset = (): void => {
    setFirst(null);
    setSecond(null);
  };

  const clear = (): void => {
    setRevealed(null);
    reset();
  };

  useEffect(
    () => () => {
      window.clearTimeout(beat.current);
      forgingNow.current = false;
    },
    [],
  );

  const trackTile =
    (uid: string) =>
    (node: HTMLButtonElement | null): void => {
      if (node === null) tiles.current.delete(uid);
      else tiles.current.set(uid, node);
    };

  const pick = (uid: string): void => {
    if (forgingNow.current) return;
    if (first === null || uid === first) {
      setFirst(uid === first ? null : uid);
      setSecond(null);
      return;
    }
    if (!partners.includes(uid)) return;
    setSecond(uid === second ? null : uid);
  };

  const close = (): void => {
    if (forgingNow.current) return;
    onOpenChange(false);
  };

  const commit = (option: ForgeOption): void => {
    if (!forgeInRun(option)) return;
    playSfx("buy");
    playSfx("mkSweep");
    haptic("purchase");
    autosaveRun();
    const die = forgedResult(option);
    if (die === undefined) {
      onOpenChange(false);
      return;
    }
    reset();
    setRevealed(die);
  };

  const confirm = (option: ForgeOption): void => {
    if (forgingNow.current) return;
    const tileA = a === undefined ? undefined : tiles.current.get(a.uid);
    const tileB = b === undefined ? undefined : tiles.current.get(b.uid);
    if (
      reduced ||
      a === undefined ||
      b === undefined ||
      tileA === undefined ||
      tileB === undefined
    ) {
      commit(option);
      return;
    }
    const offsets = forgeOffsets(
      tileA.getBoundingClientRect(),
      tileB.getBoundingClientRect(),
    );
    forgingNow.current = true;
    setForging({
      offsets: new Map([
        [a.uid, offsets.a],
        [b.uid, offsets.b],
      ]),
    });
    beat.current = window.setTimeout(() => {
      forgingNow.current = false;
      setForging(null);
      commit(option);
    }, FORGE_BEAT_MS);
  };

  return (
    <Stack gap="xs" data-forge>
      <Text size="xs" c={tokens.faint}>
        {t("run:shipyard.forgeHint")}
      </Text>
      <Button
        variant="light"
        disabled={!available}
        data-testid="forge-open"
        onClick={() => {
          clear();
          onOpenChange(true);
        }}
      >
        {available ? t("run:shipyard.forgeOpen") : t("run:shipyard.forgeNone")}
      </Button>
      <Modal
        opened={open}
        onClose={close}
        onExitTransitionEnd={clear}
        title={t("run:shipyard.forgeTitle")}
        centered
        size="lg"
      >
        {revealed !== null ? (
          <ForgeReveal die={revealed} engravings={engravings} onDone={close} />
        ) : (
          <Stack
            gap="sm"
            data-testid="forge-sheet"
            data-forge-phase={forging === null ? "pick" : "forging"}
          >
            <Text size="xs" c={tokens.dim} data-forge-step={first === null ? "1" : second === null ? "2" : "3"}>
              {first === null
                ? t("run:shipyard.forgeStepOne")
                : second === null
                  ? t("run:shipyard.forgeStepTwo")
                  : t("run:shipyard.forgeStepThree")}
            </Text>
            <div className={styles.forgeGrid}>
              {deck.map((die, index) => {
                const chosen = die.uid === first || die.uid === second;
                const eligible =
                  first === null ? forgePartners(deck, die.uid).length > 0 : die.uid === first || partners.includes(die.uid);
                const offset = forging?.offsets.get(die.uid);
                return (
                  <button
                    key={die.uid}
                    ref={trackTile(die.uid)}
                    type="button"
                    className={styles.forgeTile}
                    data-testid={`forge-die-${die.uid}`}
                    data-chosen={chosen ? "1" : undefined}
                    data-eligible={eligible ? "1" : undefined}
                    data-forging={offset === undefined ? undefined : "1"}
                    data-rise
                    style={{ ...riseStyle(index), ...forgeOffsetStyle(offset) }}
                    disabled={!eligible}
                    onClick={() => {
                      pick(die.uid);
                    }}
                  >
                    <DieCard defId={die.defId} size="mini" fusion={forgeLevel(die)} engravings={engravings} />
                  </button>
                );
              })}
            </div>
            {options.map((option, index) => {
              const optionKey = option.kind === "recipe" ? "recipe" : `colour-${option.signature}`;
              const signature =
                option.kind === "colour" ? deck.find((die) => die.uid === option.signature) : undefined;
              return (
                <ForgeOptionCard
                  key={optionKey}
                  optionKey={optionKey}
                  option={option}
                  riseIndex={index}
                  source={a}
                  signature={signature}
                  engravings={engravings}
                  enabled={forging === null && scrap >= option.cost}
                  onConfirm={() => {
                    confirm(option);
                  }}
                />
              );
            })}
          </Stack>
        )}
      </Modal>
    </Stack>
  );
};
