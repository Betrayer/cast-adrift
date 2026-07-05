import {
  Box,
  Button,
  Modal,
  NumberInput,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { useState } from 'react';
import { ENEMY_BY_ID } from '@/data/enemies/sector1';
import { mountTextureGrid } from '@/pixi/battle/textureGrid';
import { PixiCanvas } from '@/pixi/PixiCanvas';
import { useBattleStore } from '@/stores/battleStore';

export const DebugPanel = () => {
  const [rollText, setRollText] = useState('');
  const [hpValue, setHpValue] = useState<number | string>('');
  const [gridOpen, setGridOpen] = useState(false);

  const applyRoll = (): void => {
    const values = rollText
      .split(',')
      .map((v) => Number(v.trim()))
      .filter((v) => Number.isFinite(v));
    useBattleStore.setState({ debugNextRoll: values.length > 0 ? values : null });
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
    useBattleStore.setState((s) => ({
      enemies: s.enemies.map((enemy, index) =>
        index === 0 ? { ...enemy, intentIndex: Number(value) } : enemy,
      ),
    }));
  };

  const firstEnemy = useBattleStore.getState().enemies[0];
  const pattern = ENEMY_BY_ID.get(firstEnemy?.defId ?? '')?.pattern ?? [];
  const intentOptions = pattern.map((intent, index) => ({
    value: String(index),
    label: `${String(index)}: ${intent.t} ${String(intent.n)}`,
  }));

  return (
    <Paper
      pos="fixed"
      top={96}
      right={8}
      w={210}
      p="xs"
      radius="md"
      withBorder
      style={{ zIndex: 400 }}
    >
      <Stack gap="xs">
        <Text size="xs" fw={700}>
          debug
        </Text>
        <TextInput
          size="xs"
          label="next roll (csv)"
          placeholder="6,6,4,3,2"
          value={rollText}
          onChange={(e) => {
            setRollText(e.currentTarget.value);
          }}
        />
        <Button size="compact-xs" variant="default" onClick={applyRoll}>
          set next roll
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
