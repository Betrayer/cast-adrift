import { Button, Group, Overlay, Stack, Text, Title } from '@mantine/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/app/Screen';
import { LootReveal } from '@/screens/Battle/LootReveal';
import { useLootStore } from '@/stores/lootStore';
import type { TFunction } from 'i18next';
import type { Application } from 'pixi.js';
import { tokens } from '@/app/theme';
import { WarpStreaks } from '@/components/WarpStreaks';
import { STARTER_DECK } from '@/data/decks';
import { ENEMY_BY_ID } from '@/data/enemies';
import { DIE_BY_ID } from '@/data/dice';
import { FATE_DIE_ID, FATE_TABLE } from '@/data/fate';
import { schools } from '@/data/schools';
import {
  canBank,
  canCopy,
  canFlip,
  canSplit,
  canSwap,
} from '@/game/battle/actives';
import {
  activeThresholds,
  nextThreshold,
  RESONANCE_THRESHOLDS,
  SCHOOL_ORDER,
} from '@/game/battle/resonance';
import {
  BONUS_REROLL_COST,
  CHARGE_CAP,
  NUDGE_COST,
  SURGE_COST,
} from '@/game/battle/resolver';
import { isInverted } from '@/game/battle/order';
import { resolveActiveBattle } from '@/game/run/flow';
import { emitBark } from '@/game/narrative';
import { hasTrait } from '@/game/run/perkMods';
import { runHasTrait } from '@/game/run/runMods';
import { mountBattleScene } from '@/pixi/battle/BattleScene';
import { PixiCanvas } from '@/pixi/PixiCanvas';
import { initAudio, playSfx } from '@/services/audio';
import { now } from '@/services/clock';
import { haptic } from '@/services/tma';
import { createStreams } from '@/services/rng';
import { resolveReducedMotion, useSettingsStore } from '@/stores/settingsStore';
import { useAppStore } from '@/stores/appStore';
import { allowedSlotsForTurn, useBattleStore } from '@/stores/battleStore';
import { useRunStore } from '@/stores/runStore';
import { BossIntro } from '@/screens/Battle/BossIntro';
import { FateInvocation } from '@/screens/Battle/FateInvocation';
import { DebugPanel } from '@/screens/Battle/DebugPanel';
import { BuildSheet } from '@/screens/Build/BuildSheet';
import bossStyles from './BossIntro.module.css';
import type { EnemyState } from '@/types/battle';
import type { Intent } from '@/types/content';
import styles from './BattleScreen.module.css';

const BOSS_HIT_STOP_MS = 300;
const BATTLE_WARP_MS = 400;

const startTestBattleIfIdle = (): void => {
  const store = useBattleStore.getState();
  if (store.phase !== 'idle') return;
  store.startBattle(
    { enemyIds: ['raider'] },
    STARTER_DECK,
    createStreams(now() >>> 0),
  );
};

const intentLabel = (t: TFunction<['battle', 'content']>, intent: Intent): string => {
  switch (intent.t) {
    case 'attack':
      return t('battle:intent.attack', { n: intent.n });
    case 'shield':
      return t('battle:intent.shield', { n: intent.n });
    case 'shieldAll':
      return t('battle:intent.shieldAll', { n: intent.n });
    case 'multi':
      return t('battle:intent.multi', { n: intent.n, k: intent.k });
    case 'charge':
      return t('battle:intent.charge');
    case 'jamSlot':
      return t('battle:intent.jamSlot');
    case 'lockDie':
      return t('battle:intent.lockDie');
    case 'summon':
      return t('battle:intent.summon');
    case 'healAllies':
      return t('battle:intent.healAllies', { n: intent.n });
    case 'mirrorHalf':
      return t('battle:intent.mirrorHalf');
    case 'stealScrap':
      return t('battle:intent.stealScrap', { n: intent.n });
    case 'capShrink':
      return t('battle:intent.capShrink');
    case 'twistDie':
      return t('battle:intent.twistDie');
    case 'swapValues':
      return t('battle:intent.swapValues');
    case 'storm':
      return t('battle:intent.storm');
    case 'curseDie':
      return t('battle:intent.curseDie', { n: intent.n });
    case 'shieldGate':
      return t('battle:intent.shieldGate', { n: intent.n });
    case 'mirrorSchool':
      return t('battle:intent.mirrorSchool');
    case 'drainCharge':
      return t('battle:intent.drainCharge', { n: intent.n });
    case 'siphonShield':
      return t('battle:intent.siphonShield', { n: intent.n });
    case 'bargain':
      return t('battle:intent.bargain', { n: intent.n, heal: intent.heal });
    case 'enrage':
      return t('battle:intent.enrage', { n: intent.n });
    case 'hijack':
      return t('battle:intent.hijack');
    case 'echoTotal':
      return t('battle:intent.echoTotal', { n: intent.cap });
    case 'foldOrder':
      return t('battle:intent.foldOrder');
    case 'devourDie':
      return t('battle:intent.devourDie');
  }
};

const ATTACK_INTENTS: ReadonlySet<Intent['t']> = new Set([
  'attack',
  'multi',
  'mirrorHalf',
  'mirrorSchool',
  'enrage',
]);

const SHIELD_INTENTS: ReadonlySet<Intent['t']> = new Set([
  'shield',
  'shieldAll',
  'shieldGate',
  'siphonShield',
]);

const intentPillClass = (intent: Intent): string => {
  if (ATTACK_INTENTS.has(intent.t)) return styles.intentAttack ?? '';
  if (SHIELD_INTENTS.has(intent.t)) return styles.intentShield ?? '';
  return styles.intentUtility ?? '';
};

const CausalityBanner = () => {
  const { t } = useTranslation(['battle']);
  const inverted = useBattleStore((s) => isInverted(s));
  const storm = useBattleStore((s) => s.nodeStorm);

  useEffect(() => {
    if (inverted) playSfx('inversionCue');
  }, [inverted]);

  if (!inverted && !storm) return null;
  return (
    <div
      className={`${styles.causalityBanner ?? ''} ${inverted ? styles.causalitySlide ?? '' : ''}`}
      data-band="causality"
    >
      {inverted ? (
        <span
          className={`${styles.pill ?? ''} ${styles.pillDanger ?? ''}`}
          data-causality="inverted"
          title={t('battle:invertedHint')}
        >
          {t('battle:inverted')}
        </span>
      ) : null}
      {storm ? (
        <span
          className={`${styles.pill ?? ''} ${styles.pillCharge ?? ''}`}
          data-causality="storm"
          title={t('battle:stormHint')}
        >
          {t('battle:storm')}
        </span>
      ) : null}
    </div>
  );
};

const StatusCard = ({ onOpenBuild }: { onOpenBuild: () => void }) => {
  const { t } = useTranslation(['battle', 'run']);
  const hull = useBattleStore((s) => s.hull);
  const hullMax = useBattleStore((s) => s.hullMax);
  const shield = useBattleStore((s) => s.shield);
  const charge = useBattleStore((s) => s.charge);
  const scrap = useBattleStore((s) => s.scrap);
  const interference = useBattleStore((s) => s.interference);
  const turn = useBattleStore((s) => s.turn);
  const phase = useBattleStore((s) => s.phase);
  const rerollMode = useBattleStore((s) => s.rerollMode);
  const rerollsLeft = useBattleStore((s) => s.rerollsLeft);
  const spendBonusReroll = useBattleStore((s) => s.spendBonusReroll);
  const spendSurge = useBattleStore((s) => s.spendSurge);
  const fillRef = useRef<HTMLDivElement | null>(null);
  const prevHull = useRef(hull);

  useEffect(() => {
    const dropped = hull < prevHull.current;
    prevHull.current = hull;
    const el = fillRef.current;
    const flashClass = styles.hullFlash;
    if (!dropped || el === null || flashClass === undefined) return;
    el.classList.remove(flashClass);
    void el.offsetWidth;
    el.classList.add(flashClass);
  }, [hull]);

  const ratio = hullMax > 0 ? Math.max(0, Math.min(1, hull / hullMax)) : 0;
  const spendable = phase === 'placement' && !rerollMode;

  return (
    <div className={styles.statusCard} data-band="status">
      <div className={styles.statusLeft}>
        <Text size="sm" c={tokens.text}>
          {t('battle:hull', { hp: hull, max: hullMax })}
        </Text>
        <div className={styles.hullTrack}>
          <div
            ref={fillRef}
            className={styles.hullFill}
            style={{ width: `${String(ratio * 100)}%` }}
          />
        </div>
        <Text size="xs" c={tokens.dim}>
          {t('battle:turn', { n: turn })}
        </Text>
      </div>
      <div className={styles.statusRight}>
        <span className={`${styles.pill ?? ''} ${styles.pillShield ?? ''}`}>
          {t('battle:shield', { n: shield })}
        </span>
        {interference > 0 ? (
          <span className={`${styles.pill ?? ''} ${styles.pillDanger ?? ''}`}>
            {t('battle:interference', { n: interference })}
          </span>
        ) : null}
        {scrap > 0 ? (
          <span className={`${styles.pill ?? ''} ${styles.pillScrap ?? ''}`}>
            {t('battle:scrap', { n: scrap })}
          </span>
        ) : null}
        <span
          className={`${styles.pill ?? ''} ${styles.pillCharge ?? ''}`}
          data-coach="charge"
        >
          {t('battle:charge', { n: charge, max: CHARGE_CAP })}
        </span>
        <Group gap={4} justify="flex-end">
          <Button
            className={styles.clickable}
            size="compact-xs"
            variant="default"
            disabled={!spendable || rerollsLeft <= 0 || charge < BONUS_REROLL_COST}
            onClick={() => {
              playSfx('reroll');
              spendBonusReroll();
            }}
          >
            {t('battle:buyReroll')}
          </Button>
          <Button
            className={styles.clickable}
            size="compact-xs"
            variant="default"
            disabled={!spendable || charge < SURGE_COST}
            onClick={() => {
              playSfx('surge');
              spendSurge();
            }}
          >
            {t('battle:surge')}
          </Button>
          <Button
            className={styles.clickable}
            size="compact-xs"
            variant="subtle"
            color="gray"
            data-open-build
            onClick={onOpenBuild}
          >
            {t('run:build.open')}
          </Button>
        </Group>
      </div>
    </div>
  );
};

const COMPACT_ENEMY_COUNT = 3;

const EnemyTraitChips = ({ enemy }: { enemy: EnemyState }) => {
  const { t } = useTranslation(['battle']);
  const chips: { key: string; label: string; color: string }[] = [];
  if (enemy.ward !== undefined) {
    chips.push({
      key: 'ward',
      label: t('battle:enemyWard', { school: t(`battle:school.${enemy.ward}`) }),
      color: schools[enemy.ward].text,
    });
  }
  if ((enemy.gate ?? 0) > 0) {
    chips.push({
      key: 'gate',
      label: t('battle:enemyGate', { n: enemy.gate }),
      color: schools.blue.text,
    });
  }
  if ((enemy.rage ?? 0) > 0) {
    chips.push({
      key: 'rage',
      label: t('battle:enemyRage', { n: enemy.rage }),
      color: schools.red.text,
    });
  }
  if ((enemy.statuses.mark ?? 0) > 0) {
    chips.push({
      key: 'vulnerable',
      label: t('battle:enemyVulnerable', { n: enemy.statuses.mark }),
      color: schools.grey.text,
    });
  }
  if (chips.length === 0) return null;
  return (
    <div className={styles.enemyTraitRow} data-enemy-traits={enemy.id}>
      {chips.map((chip) => (
        <span
          key={chip.key}
          className={styles.enemyTraitChip}
          style={{ color: chip.color, borderColor: chip.color }}
        >
          {chip.label}
        </span>
      ))}
    </div>
  );
};

const EnemyChips = () => {
  const { t } = useTranslation(['battle', 'content']);
  const enemies = useBattleStore((s) => s.enemies);
  const targetId = useBattleStore((s) => s.targetId);
  const setTarget = useBattleStore((s) => s.setTarget);
  const compact = enemies.length >= COMPACT_ENEMY_COUNT;
  return (
    <div className={styles.enemyRow} data-band="enemies">
      {enemies.map((enemy) => {
        const def = ENEMY_BY_ID.get(enemy.defId);
        if (def === undefined) return null;
        const intent = enemy.nextIntent;
        const targeted =
          targetId === enemy.id ||
          enemy.subsystems.some((sub) => sub.id === targetId);
        return (
          <div
            key={enemy.id}
            role="button"
            tabIndex={0}
            className={`${styles.enemyChip ?? ''} ${compact ? styles.enemyChipCompact ?? '' : ''} ${targeted ? styles.enemyChipTargeted ?? '' : ''}`}
            style={{ opacity: enemy.hp > 0 ? 1 : 0.45 }}
            onClick={() => {
              if (enemy.hp > 0) setTarget(enemy.id);
            }}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' && event.key !== ' ') return;
              if (enemy.hp > 0) setTarget(enemy.id);
            }}
          >
            <Text
              size={compact ? 'xs' : 'sm'}
              fw={600}
              c={tokens.text}
              className={styles.enemyName}
            >
              {t(def.name)}
            </Text>
            <Text size="xs" c={tokens.dim}>
              {t(compact ? 'battle:hpShort' : 'battle:hp', {
                hp: enemy.hp,
                max: enemy.hpMax,
              })}
              {enemy.shield > 0
                ? ` · ${t('battle:shield', { n: enemy.shield })}`
                : ''}
            </Text>
            {enemy.hp > 0 ? <EnemyTraitChips enemy={enemy} /> : null}
            {enemy.hp > 0 ? (
              <span
                key={intentLabel(t, intent)}
                className={`${styles.intentPill ?? ''} ${intentPillClass(intent)} ${styles.intentPulse ?? ''}`}
              >
                {intentLabel(t, intent)}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

const ResonanceChips = () => {
  const { t } = useTranslation(['battle']);
  const resonance = useBattleStore((s) => s.resonance);
  const present = SCHOOL_ORDER.filter((school) => resonance.counts[school] > 0);
  if (present.length === 0) return null;
  return (
    <div className={styles.resonanceRow}>
      {present.map((school) => {
        const count = resonance.counts[school];
        const next = nextThreshold(count);
        const active = activeThresholds(resonance, school);
        const colors = schools[school];
        const schoolLabel = t(`battle:school.${school}`);
        const label =
          next === null
            ? t('battle:resChipFull', { school: schoolLabel, count })
            : t('battle:resChip', { school: schoolLabel, count, next });
        return (
          <span
            key={school}
            className={`${styles.resChip ?? ''} ${active.length > 0 ? styles.resChipActive ?? '' : ''
              }`}
            style={{ borderColor: colors.stroke, color: colors.text }}
          >
            {label}
            <span className={styles.resPips}>
              {RESONANCE_THRESHOLDS.map((th) => (
                <span
                  key={th}
                  className={`${styles.resPip ?? ''} ${active.includes(th) ? styles.resPipOn ?? '' : ''
                    }`}
                />
              ))}
            </span>
          </span>
        );
      })}
    </div>
  );
};

const DieControls = () => {
  const { t } = useTranslation(['battle', 'content']);
  const charge = useBattleStore((s) => s.charge);
  const freeNudges = useBattleStore((s) => s.freeNudges);
  const resonance = useBattleStore((s) => s.resonance);
  const selectedDieUid = useBattleStore((s) => s.selectedDieUid);
  const spendNudge = useBattleStore((s) => s.spendNudge);
  const flipDie = useBattleStore((s) => s.flipDie);
  const copyDie = useBattleStore((s) => s.copyDie);
  const beginSwap = useBattleStore((s) => s.beginSwap);
  const cancelSwap = useBattleStore((s) => s.cancelSwap);
  const bankDie = useBattleStore((s) => s.bankDie);
  const splitDie = useBattleStore((s) => s.splitDie);
  const swapSourceUid = useBattleStore((s) => s.swapSourceUid);
  const die = useBattleStore((s) =>
    s.dice.find((d) => d.uid === s.selectedDieUid),
  );
  if (selectedDieUid === null || die === undefined) return null;
  const def = DIE_BY_ID.get(die.defId);
  const free = freeNudges > 0;
  const affordable = free || charge >= NUDGE_COST;
  return (
    <>
      {def !== undefined ? (
        <Text size="xs" fw={600} c={tokens.text} className={styles.railLabel}>
          {`${t(def.name)} · d${String(def.tier)}`}
        </Text>
      ) : null}
      <Button
        className={styles.clickable}
        size="compact-sm"
        variant="default"
        disabled={!affordable || die.value <= 1}
        onClick={() => {
          playSfx('nudge');
          spendNudge(selectedDieUid, -1);
        }}
      >
        {t(free ? 'battle:nudgeFree' : 'battle:nudgeMinus')}
      </Button>
      <Button
        className={styles.clickable}
        size="compact-sm"
        variant="default"
        disabled={!affordable || die.value >= die.tier}
        onClick={() => {
          playSfx('nudge');
          spendNudge(selectedDieUid, 1);
        }}
      >
        {t(free ? 'battle:nudgeFreePlus' : 'battle:nudgePlus')}
      </Button>
      {canFlip(die) ? (
        <Button
          className={styles.clickable}
          size="compact-sm"
          variant="default"
          onClick={() => {
            flipDie(selectedDieUid);
          }}
        >
          {t('battle:flip')}
        </Button>
      ) : null}
      {die.state === 'tray' && canCopy(die, resonance) ? (
        <Button
          className={styles.clickable}
          size="compact-sm"
          variant="default"
          onClick={() => {
            copyDie(selectedDieUid);
          }}
        >
          {t('battle:copy')}
        </Button>
      ) : null}
      {canSwap(die) ? (
        <Button
          className={styles.clickable}
          size="compact-sm"
          variant={swapSourceUid === die.uid ? 'filled' : 'default'}
          onClick={() => {
            if (swapSourceUid === die.uid) cancelSwap();
            else beginSwap(selectedDieUid);
          }}
        >
          {t(swapSourceUid === die.uid ? 'battle:swapPick' : 'battle:swap')}
        </Button>
      ) : null}
      {canBank(die) ? (
        <Button
          className={styles.clickable}
          size="compact-sm"
          variant="default"
          onClick={() => {
            bankDie(selectedDieUid);
          }}
        >
          {t('battle:bank')}
        </Button>
      ) : null}
      {canSplit(die) ? (
        <Button
          className={styles.clickable}
          size="compact-sm"
          variant="default"
          onClick={() => {
            splitDie(selectedDieUid);
          }}
        >
          {t('battle:split')}
        </Button>
      ) : null}
    </>
  );
};

const PerkControls = () => {
  const { t } = useTranslation(['battle']);
  const perks = useBattleStore((s) => s.perks);
  const hull = useBattleStore((s) => s.hull);
  const bloodUsed = useBattleStore((s) => s.bloodReactorUsed);
  const selected = useBattleStore((s) => s.selectedDieUid);
  const bloodReactor = useBattleStore((s) => s.bloodReactor);
  const sacrificeDie = useBattleStore((s) => s.sacrificeDie);
  const hasBlood = hasTrait(perks, 'bloodReactor');
  const hasSac = hasTrait(perks, 'sacrifice');
  if (!hasBlood && !hasSac) return null;
  return (
    <>
      {hasBlood ? (
        <Button
          className={styles.clickable}
          size="compact-sm"
          variant="default"
          disabled={bloodUsed || hull <= 2}
          onClick={bloodReactor}
        >
          {t('battle:bloodReactor')}
        </Button>
      ) : null}
      {hasSac ? (
        <Button
          className={styles.clickable}
          size="compact-sm"
          variant="default"
          disabled={selected === null}
          onClick={() => {
            if (selected !== null) sacrificeDie(selected);
          }}
        >
          {t('battle:sacrifice')}
        </Button>
      ) : null}
    </>
  );
};

const FateControls = () => {
  const { t } = useTranslation(['battle', 'content']);
  const dice = useBattleStore((s) => s.dice);
  const fateUses = useBattleStore((s) => s.fateUses);
  const perks = useBattleStore((s) => s.perks);
  const chartPicks = useBattleStore((s) => s.chartPicks);
  const modules = useBattleStore((s) => s.modules);
  const fateRoll = useBattleStore((s) => s.fateRoll);
  const fateOutcomeId = useBattleStore((s) => s.fateOutcomeId);
  const rollFate = useBattleStore((s) => s.rollFate);
  const clearFateResult = useBattleStore((s) => s.clearFateResult);
  const hasFate = dice.some((d) => d.defId === FATE_DIE_ID);
  const maxUses = runHasTrait(perks, chartPicks, 'fateTwice', modules) ? 2 : 1;
  const fateUsed = fateUses >= maxUses;
  if (!hasFate) return null;
  const outcome =
    fateOutcomeId === null
      ? undefined
      : FATE_TABLE.find((o) => o.id === fateOutcomeId);
  return (
    <>
      <Button
        className={styles.clickable}
        size="compact-sm"
        variant={fateUsed ? 'default' : 'filled'}
        disabled={fateUsed}
        onClick={rollFate}
      >
        {t('battle:fate')}
      </Button>
      {fateRoll !== null && outcome !== undefined ? (
        <Text
          size="xs"
          c={tokens.amber}
          className={`${styles.clickable ?? ''} ${styles.railLabel ?? ''}`}
          onClick={clearFateResult}
        >
          {t('battle:fateResult', { roll: fateRoll, text: t(outcome.text) })}
        </Text>
      ) : null}
    </>
  );
};

const ActionRail = () => {
  const phase = useBattleStore((s) => s.phase);
  const perks = useBattleStore((s) => s.perks);
  const dice = useBattleStore((s) => s.dice);
  const selectedDieUid = useBattleStore((s) => s.selectedDieUid);
  const hasPerkControls =
    hasTrait(perks, 'bloodReactor') || hasTrait(perks, 'sacrifice');
  const hasFate = dice.some((d) => d.defId === FATE_DIE_ID);
  if (phase !== 'placement') return null;
  if (selectedDieUid === null && !hasPerkControls && !hasFate) return null;
  return (
    <div className={styles.actionRail} data-band="rail" data-action-rail>
      <DieControls />
      <PerkControls />
      <FateControls />
    </div>
  );
};

const ScriptHint = () => {
  const { t } = useTranslation(['battle']);
  const scriptedSlots = useBattleStore((s) => s.scriptedSlots);
  const turn = useBattleStore((s) => s.turn);
  const allowed = allowedSlotsForTurn(scriptedSlots, turn);
  if (allowed === null || allowed.length === 0) return null;
  return (
    <Text size="xs" c={tokens.amber} ta="center">
      {t('battle:scriptHint', {
        slots: allowed.map((slot) => t(`battle:slot.${slot}`)).join(' · '),
      })}
    </Text>
  );
};

const BottomBar = () => {
  const { t } = useTranslation(['battle']);
  const phase = useBattleStore((s) => s.phase);
  const rerollsLeft = useBattleStore((s) => s.rerollsLeft);
  const rerollSize = useBattleStore((s) => s.rerollSize);
  const rerollMode = useBattleStore((s) => s.rerollMode);
  const rerollSelection = useBattleStore((s) => s.rerollSelection);
  const toggleRerollMode = useBattleStore((s) => s.toggleRerollMode);
  const confirmReroll = useBattleStore((s) => s.confirmReroll);
  const endTurn = useBattleStore((s) => s.endTurn);
  return (
    <div className={styles.bottomBar} data-band="bottom">
      <ResonanceChips />
      <ScriptHint />
      {rerollMode ? (
        <Text size="xs" c={tokens.dim} ta="center" className={styles.hint}>
          {t('battle:rerollHint', { size: rerollSize })}
        </Text>
      ) : (
        <Text size="xs" c={tokens.faint} ta="center" className={styles.hint}>
          {t('battle:burnHint')}
        </Text>
      )}
      <div className={styles.rerollRow}>
        {rerollMode ? (
          <>
            <Button
              className={styles.clickable}
              size="sm"
              variant="default"
              data-testid="battle-reroll-cancel"
              onClick={toggleRerollMode}
            >
              {t('battle:rerollCancel')}
            </Button>
            <Button
              className={styles.clickable}
              size="sm"
              disabled={rerollSelection.length === 0}
              data-testid="battle-reroll-confirm"
              onClick={() => {
                playSfx('reroll');
                confirmReroll();
              }}
            >
              {t('battle:rerollConfirm', {
                k: rerollSelection.length,
                size: rerollSize,
              })}
            </Button>
          </>
        ) : (
          <Button
            className={styles.clickable}
            size="sm"
            variant="default"
            disabled={phase !== 'placement' || rerollsLeft <= 0}
            onClick={toggleRerollMode}
            data-coach="reroll"
            data-testid="battle-reroll"
          >
            {t('battle:reroll', { n: rerollsLeft })}
          </Button>
        )}
      </div>
      <Button
        className={styles.clickable}
        size="md"
        fullWidth
        disabled={phase !== 'placement' || rerollMode}
        onClick={endTurn}
        data-coach="endTurn"
        data-testid="battle-end-turn"
      >
        {t('battle:endTurn')}
      </Button>
    </div>
  );
};

const EndOverlay = () => {
  const { t } = useTranslation(['battle']);
  const outcome = useBattleStore((s) => s.outcome);
  const reset = useBattleStore((s) => s.reset);
  const lootPending = useLootStore((s) => s.pending);
  const clearLoot = useLootStore((s) => s.clear);
  const go = useAppStore((s) => s.go);
  if (outcome === undefined || lootPending !== null) return null;
  return (
    <Overlay backgroundOpacity={0.82} color={tokens.bg} blur={2} zIndex="var(--z-modal)">
      <Stack align="center" justify="center" h="100%" gap="lg">
        <Title order={1} c={outcome === 'victory' ? tokens.text : tokens.danger}>
          {t(outcome === 'victory' ? 'battle:victory' : 'battle:defeat')}
        </Title>
        <Button
          size="md"
          data-testid="battle-to-menu"
          onClick={() => {
            clearLoot();
            reset();
            go('menu');
          }}
        >
          {t('battle:toMenu')}
        </Button>
      </Stack>
    </Overlay>
  );
};

export const BattleScreen = () => {
  const { t } = useTranslation(['battle']);
  const phase = useBattleStore((s) => s.phase);
  const outcome = useBattleStore((s) => s.outcome);
  const runActive = useRunStore((s) => s.active);
  const hull = useBattleStore((s) => s.hull);
  const hullMax = useBattleStore((s) => s.hullMax);
  const dropLoot = useLootStore((s) => s.drop);
  const introEnemyId = useBattleStore((s) => s.introEnemyId);
  const enemyBeats = useBattleStore((s) => s.enemyBeats);
  const beatSeq = useBattleStore((s) => s.beatSeq);
  const bossFight = introEnemyId !== null;
  const reduced = resolveReducedMotion(
    useSettingsStore((s) => s.reducedMotion),
  );
  const bossFall =
    bossFight && phase === 'ended' && outcome === 'victory' && !reduced;
  const droppedRef = useRef(false);
  const resolvedRef = useRef(false);
  const lowHullRef = useRef(false);
  const [buildOpen, setBuildOpen] = useState(false);
  const [warping, setWarping] = useState(true);

  useEffect(() => {
    if (!runActive || hullMax <= 0) {
      lowHullRef.current = false;
      return;
    }
    const low = hull > 0 && hull / hullMax < 0.3;
    if (low && !lowHullRef.current) emitBark('lowHull');
    lowHullRef.current = low;
  }, [hull, hullMax, runActive]);

  useEffect(() => {
    initAudio();
    if (!useRunStore.getState().active) startTestBattleIfIdle();
  }, []);

  useEffect(() => {
    if (reduced) return;
    const id = window.setTimeout(() => {
      setWarping(false);
    }, BATTLE_WARP_MS);
    return () => {
      window.clearTimeout(id);
    };
  }, [reduced]);

  useEffect(() => {
    if (!bossFight || beatSeq === 0) return;
    if (enemyBeats.some((b) => b.kind === 'phase')) emitBark('bossPhase');
  }, [beatSeq, enemyBeats, bossFight]);

  useEffect(() => {
    if (runActive) return;
    if (outcome === 'victory' && !droppedRef.current) {
      droppedRef.current = true;
      dropLoot('vulture');
    }
    if (outcome === undefined) droppedRef.current = false;
  }, [outcome, dropLoot, runActive]);

  useEffect(() => {
    if (!runActive) return;
    if (phase !== 'ended' || resolvedRef.current) return;
    resolvedRef.current = true;
    if (!bossFall) {
      resolveActiveBattle();
      return;
    }
    haptic('bossIntro');
    const id = window.setTimeout(resolveActiveBattle, BOSS_HIT_STOP_MS);
    return () => {
      window.clearTimeout(id);
    };
  }, [phase, runActive, bossFall]);

  const mountScene = useMemo(
    () => (app: Application) =>
      mountBattleScene(app, {
        slotTitle: (slot) => t(`battle:slot.${slot}`),
        capLabel: (cap, mk) => t('battle:slot.cap', { cap, mk }),
        evasionLabel: (dodge, glancing) =>
          t('battle:slot.evasion', { dodge, glancing }),
        pierceLabel: (n) => t('battle:pierce', { n }),
        reserveTitle: t('battle:reserve'),
        statusGlyph: (key) => t(`battle:status.${key}`),
        jamLabel: t('battle:jam'),
        beatGlyph: (kind) => t(`battle:beat.${kind}`),
      }),
    [t],
  );

  const debugEnabled =
    import.meta.env.DEV &&
    new URLSearchParams(window.location.search).get('debug') === '1';

  return (
    <Screen
      width="full"
      pad={false}
      scroll={false}
      passThrough
      bodyClassName={styles.board}
      background={<PixiCanvas mount={mountScene} />}
      header={
        <div className={styles.topBands}>
          <CausalityBanner />
          <StatusCard
            onOpenBuild={() => {
              setBuildOpen(true);
            }}
          />
          <EnemyChips />
          <ActionRail />
        </div>
      }
      footer={
        <div className={styles.centreColumn}>
          <BottomBar />
        </div>
      }
      overlay={
        <>
          {buildOpen ? (
            <BuildSheet
              onClose={() => {
                setBuildOpen(false);
              }}
            />
          ) : null}
          {warping && !reduced ? (
            <WarpStreaks
              color={tokens.accent}
              count={14}
              durationMs={BATTLE_WARP_MS}
            />
          ) : null}
          <LootReveal />
          <FateInvocation />
          {bossFall ? <div className={bossStyles.bossFall} /> : null}
          <BossIntro />
          {phase === 'ended' && !runActive ? <EndOverlay /> : null}
          {debugEnabled ? <DebugPanel /> : null}
        </>
      }
    />
  );
};
