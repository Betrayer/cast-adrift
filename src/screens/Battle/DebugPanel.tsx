import {
  Box,
  Button,
  Modal,
  NumberInput,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { useState } from 'react';
import { STARTER_DECK } from '@/data/decks';
import {
  ENCOUNTER_GROUPS,
  ENEMY_BY_ID,
  SECTOR1_ENEMIES,
} from '@/data/enemies/sector1';
import { SHIPS, type ShipId } from '@/data/ships';
import { mountTextureGrid } from '@/pixi/battle/textureGrid';
import { PixiCanvas } from '@/pixi/PixiCanvas';
import { createStreams } from '@/services/rng';
import { useBattleStore } from '@/stores/battleStore';
import type { Intent, PatternStep } from '@/types/content';

const flattenStep = (step: PatternStep): Intent[] =>
  'pick' in step ? step.pick.map(([intent]) => intent) : [step];

const intentSummary = (intent: Intent): string => {
  switch (intent.t) {
    case 'attack':
      return `attack ${String(intent.n)}`;
    case 'shield':
      return `shield ${String(intent.n)}`;
    case 'shieldAll':
      return `shieldAll ${String(intent.n)}`;
    case 'multi':
      return `multi ${String(intent.n)}x${String(intent.k)}`;
    case 'charge':
      return 'charge';
    case 'jamSlot':
      return 'jamSlot';
    case 'lockDie':
      return 'lockDie';
    case 'summon':
      return `summon ${intent.id}`;
  }
};

const encounterOptions = [
  ...SECTOR1_ENEMIES.filter((e) => e.id !== 'mine').map((e) => e.id),
  ...Object.keys(ENCOUNTER_GROUPS),
  'raider,scavDrone',
  'jammerCorvette,leechSkiff',
];

export const DebugPanel = () => {
  const [rollText, setRollText] = useState('');
  const [hpValue, setHpValue] = useState<number | string>('');
  const [gridOpen, setGridOpen] = useState(false);
  const [encounter, setEncounter] = useState('raider');
  const [shipId, setShipId] = useState<ShipId>('wanderer');
  const [seedValue, setSeedValue] = useState<number | string>('');

  const restart = (): void => {
    const enemyIds = encounter
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    if (enemyIds.length === 0) return;
    const seed = Number(seedValue);
    useBattleStore.getState().reset();
    useBattleStore.getState().startBattle(
      { enemyIds, shipId },
      STARTER_DECK,
      createStreams(
        Number.isFinite(seed) && seedValue !== '' ? seed : Date.now() >>> 0,
      ),
    );
  };

  const applyRoll = (): void => {
    const values = rollText
      .split(',')
      .map((v) => Number(v.trim()))
      .filter((v) => Number.isFinite(v));
    if (values.length === 0) {
      useBattleStore.setState({ debugNextRoll: null });
      return;
    }
    useBattleStore.setState((s) => ({
      dice: s.dice.map((d, index) => {
        const forced = values[index];
        if (forced === undefined || d.state !== 'tray') return d;
        return { ...d, value: Math.min(Math.max(1, Math.round(forced)), d.tier) };
      }),
      debugNextRoll: values,
    }));
  };

  const applyHp = (): void => {
    const hp = Number(hpValue);
    if (!Number.isFinite(hp)) return;
    useBattleStore.setState((s) => ({
      enemies: s.enemies.map((enemy, index) =>
        index === 0 ? { ...enemy, hp: Math.max(0, Math.round(hp)) } : enemy,
      ),
    }));
  };

  const forceIntent = (value: string | null): void => {
    if (value === null) return;
    const [indexText, optionText] = value.split(':');
    const stepIndex = Number(indexText);
    const optionIndex = Number(optionText);
    useBattleStore.setState((s) => ({
      enemies: s.enemies.map((enemy, index) => {
        if (index !== 0) return enemy;
        const def = ENEMY_BY_ID.get(enemy.defId);
        const step = def?.pattern[stepIndex];
        if (def === undefined || step === undefined) return enemy;
        const intent = flattenStep(step)[optionIndex];
        if (intent === undefined) return enemy;
        return { ...enemy, intentIndex: stepIndex, nextIntent: intent };
      }),
    }));
  };

  const firstEnemy = useBattleStore((s) => s.enemies[0]);
  const pattern = ENEMY_BY_ID.get(firstEnemy?.defId ?? '')?.pattern ?? [];
  const intentOptions = pattern.flatMap((step, stepIndex) =>
    flattenStep(step).map((intent, optionIndex) => ({
      value: `${String(stepIndex)}:${String(optionIndex)}`,
      label: `${String(stepIndex)}: ${intentSummary(intent)}`,
    })),
  );

  return (
    <Paper
      pos="fixed"
      top={96}
      right={8}
      w={220}
      p="xs"
      radius="md"
      withBorder
      style={{ zIndex: 400 }}
    >
      <Stack gap="xs">
        <Text size="xs" fw={700}>
          debug
        </Text>
        <Select
          size="xs"
          label="encounter"
          data={encounterOptions}
          value={encounter}
          onChange={(v) => {
            if (v !== null) setEncounter(v);
          }}
          searchable
          comboboxProps={{ zIndex: 1000, withinPortal: true }}
        />
        <TextInput
          size="xs"
          label="encounter (free, csv)"
          placeholder="raider,scavDrone"
          value={encounter}
          onChange={(e) => {
            setEncounter(e.currentTarget.value);
          }}
        />
        <SegmentedControl
          size="xs"
          fullWidth
          data={SHIPS.map((s) => s.id)}
          value={shipId}
          onChange={(v) => {
            if (v === 'wanderer' || v === 'ram-proto') setShipId(v);
          }}
        />
        <NumberInput
          size="xs"
          label="seed (blank = random)"
          value={seedValue}
          onChange={setSeedValue}
        />
        <Button size="compact-xs" onClick={restart}>
          restart battle
        </Button>
        <TextInput
          size="xs"
          label="roll (csv, applies now + next)"
          placeholder="6,6,4,3,2"
          value={rollText}
          onChange={(e) => {
            setRollText(e.currentTarget.value);
          }}
        />
        <Button size="compact-xs" variant="default" onClick={applyRoll}>
          apply roll
        </Button>
        <NumberInput
          size="xs"
          label="enemy hp"
          value={hpValue}
          onChange={setHpValue}
          min={0}
        />
        <Button size="compact-xs" variant="default" onClick={applyHp}>
          set hp
        </Button>
        <Select
          size="xs"
          label="force intent"
          data={intentOptions}
          onChange={forceIntent}
          comboboxProps={{ zIndex: 1000, withinPortal: true }}
        />
        <Button
          size="compact-xs"
          variant="default"
          onClick={() => {
            setGridOpen(true);
          }}
        >
          texture grid
        </Button>
      </Stack>
      <Modal
        opened={gridOpen}
        onClose={() => {
          setGridOpen(false);
        }}
        title="die textures"
        size="lg"
      >
        <Box pos="relative" h={480}>
          <PixiCanvas mount={mountTextureGrid} />
        </Box>
      </Modal>
    </Paper>
  );
};
