import { Button, Group, Paper, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { tokens } from '@/app/theme';
import { useUnlockContext } from '@/app/useUnlockContext';
import { BRIDGE_FRAMES } from '@/data/bridgeFrames';
import { unlockedCosmetics } from '@/data/unlocks';
import { cosmeticRoutes, unlockHintsLine } from '@/game/meta/describeUnlock';
import { playSfx } from '@/services/audio';
import { chooseBridgeFrame, useBridgeFrame } from '@/services/prefs';

export const FramePicker = () => {
  const { t } = useTranslation(['meta']);
  const active = useBridgeFrame();
  const ctx = useUnlockContext();
  const open = unlockedCosmetics(ctx);

  return (
    <Stack gap="xs" data-frame-picker>
      <Text size="sm" c={tokens.dim}>
        {t('meta:frame.title')}
      </Text>
      <Text size="xs" c={tokens.faint}>
        {t('meta:frame.hint')}
      </Text>
      {BRIDGE_FRAMES.map((def) => {
        const unlocked = def.cosmetic === undefined || open.has(def.cosmetic);
        const selected = active === def.id;
        return (
          <Paper
            key={def.id}
            p="sm"
            radius="md"
            withBorder
            bg={tokens.surface1}
            data-frame={def.id}
            style={{
              borderColor: selected ? tokens.accent : tokens.line,
              opacity: unlocked ? 1 : 0.7,
            }}
          >
            <Group justify="space-between" wrap="nowrap">
              <Stack gap={0}>
                <Text size="sm" fw={600} c={tokens.text}>
                  {t(def.name)}
                </Text>
                <Text size="xs" c={tokens.faint}>
                  {t(def.desc)}
                </Text>
                {unlocked ? null : (
                  <Text size="xs" c={tokens.amber} data-frame-hint>
                    {unlockHintsLine(cosmeticRoutes(def.cosmetic ?? ''), t)}
                  </Text>
                )}
              </Stack>
              {unlocked ? (
                <Button
                  size="compact-xs"
                  variant={selected ? 'filled' : 'default'}
                  disabled={selected}
                  data-testid={`frame-use-${def.id}`}
                  onClick={() => {
                    chooseBridgeFrame(def.id);
                    playSfx('buy');
                  }}
                >
                  {t(selected ? 'meta:skin.active' : 'meta:skin.use')}
                </Button>
              ) : null}
            </Group>
          </Paper>
        );
      })}
    </Stack>
  );
};
