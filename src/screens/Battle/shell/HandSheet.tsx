import { Modal, Stack, Text } from '@mantine/core';
import { useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { tokens } from '@/app/theme';
import { DieCard } from '@/components/DieCard';
import { handGroups, type HandGroupId } from '@/game/battle/table';
import { useBattleStore } from '@/stores/battleStore';
import type { RolledDie } from '@/types/battle';
import styles from './HandSheet.module.css';

const GROUP_ORDER: readonly HandGroupId[] = ['table', 'reserve', 'bag', 'discard'];

const HAND_FLIP_STEPS = 12;

const flipStyle = (index: number): CSSProperties =>
  ({
    '--ca-card-index': String(Math.min(Math.max(0, index), HAND_FLIP_STEPS)),
  }) as CSSProperties;

const groupOffsets = (
  groups: Record<HandGroupId, readonly RolledDie[]>,
): Record<HandGroupId, number> => {
  const offsets: Record<HandGroupId, number> = { table: 0, reserve: 0, bag: 0, discard: 0 };
  let at = 0;
  for (const id of GROUP_ORDER) {
    offsets[id] = at;
    at += groups[id].length;
  }
  return offsets;
};

const BagGlyph = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
    <path
      d="M3.5 3.5 L4.6 1.5 H7.4 L8.5 3.5 M2 4 H10 L9.2 10.5 H2.8 Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
  </svg>
);

const Group = ({
  id,
  dice,
  offset,
}: {
  id: HandGroupId;
  dice: readonly RolledDie[];
  offset: number;
}) => {
  const { t } = useTranslation(['battle']);
  return (
    <section className={styles.group} data-hand-group={id} data-count={dice.length}>
      <Text size="xs" c={tokens.dim} className={styles.groupTitle}>
        {t(`battle:bag.group.${id}`, { n: dice.length })}
      </Text>
      {dice.length === 0 ? (
        <Text size="xs" c={tokens.faint}>
          {t('battle:bag.empty')}
        </Text>
      ) : (
        <div className={styles.cards}>
          {dice.map((die, index) => (
            <div
              key={die.uid}
              className={styles.card}
              data-hand-die={die.uid}
              data-entrance="flip"
              data-dim={die.state === 'burned' ? '1' : undefined}
              style={flipStyle(offset + index)}
            >
              <DieCard defId={die.defId} size="mini" fusion={die.fusion} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export const BagChip = () => {
  const { t } = useTranslation(['battle']);
  const dice = useBattleStore((s) => s.dice);
  const [open, setOpen] = useState(false);
  const groups = handGroups(dice);
  const offsets = groupOffsets(groups);
  const bag = groups.bag.length;
  const discard = groups.discard.length;
  return (
    <>
      <button
        type="button"
        className={styles.chip}
        data-testid="bag-chip"
        data-bag={bag}
        data-discard={discard}
        aria-label={t('battle:bag.label', { bag, discard })}
        onClick={() => {
          setOpen(true);
        }}
      >
        <BagGlyph />
        <span className={styles.chipLong}>{t('battle:bag.chip', { bag, discard })}</span>
        <span className={styles.chipShort}>{t('battle:bag.chipShort', { bag, discard })}</span>
      </button>
      <Modal
        opened={open}
        onClose={() => {
          setOpen(false);
        }}
        title={t('battle:bag.title', { n: dice.length })}
        centered
      >
        <Stack gap="sm" data-testid="hand-sheet">
          <Text size="xs" c={tokens.faint}>
            {t('battle:bag.hint')}
          </Text>
          {GROUP_ORDER.map((id) => (
            <Group key={id} id={id} dice={groups[id]} offset={offsets[id]} />
          ))}
        </Stack>
      </Modal>
    </>
  );
};
