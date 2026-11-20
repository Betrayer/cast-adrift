import { Button, Group, Paper, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { tokens } from '@/app/theme';
import { useUnlockContext } from '@/app/useUnlockContext';
import { THEMES, type ThemeId } from '@/data/themes';
import { unlockedCosmetics } from '@/data/unlocks';
import { cosmeticRoutes, unlockHintsLine } from '@/game/meta/describeUnlock';
import { trackEvent } from '@/services/analytics';
import { playSfx } from '@/services/audio';
import { chooseTheme } from '@/services/prefs';
import { useMetaStore } from '@/stores/metaStore';
import { useSettingsStore } from '@/stores/settingsStore';

export const ThemePicker = () => {
  const { t } = useTranslation(['settings', 'meta']);
  const active = useSettingsStore((s) => s.theme);
  const owned = useMetaStore((s) => s.themes);
  const shards = useMetaStore((s) => s.shards);
  const spendShards = useMetaStore((s) => s.spendShards);
  const unlockTheme = useMetaStore((s) => s.unlockTheme);
  const unlockCtx = useUnlockContext();
  const cosmetics = unlockedCosmetics(unlockCtx);

  return (
    <Stack gap="xs">
      <Text size="sm" c={tokens.dim}>
        {t('settings:theme.label')}
      </Text>
      {THEMES.map((def) => {
        const gated = def.unlock !== undefined;
        if (gated && !cosmetics.has(def.unlock ?? '')) {
          return (
            <Paper
              key={def.id}
              p="sm"
              radius="md"
              withBorder
              bg={tokens.surface1}
              data-theme-locked={def.id}
              style={{ opacity: 0.7 }}
            >
              <Stack gap={0}>
                <Text size="sm" fw={600} c={tokens.text}>
                  {t(def.name)}
                </Text>
                <Text size="xs" c={tokens.amber}>
                  {unlockHintsLine(cosmeticRoutes(def.unlock ?? ''), t)}
                </Text>
              </Stack>
            </Paper>
          );
        }
        const unlocked = gated || def.price === 0 || owned.includes(def.id);
        const selected = active === def.id;
        const affordable = shards >= def.price;
        return (
          <Paper
            key={def.id}
            p="sm"
            radius="md"
            withBorder
            bg={tokens.surface1}
            style={{
              borderColor: selected ? def.palette.accent : tokens.line,
              opacity: unlocked ? 1 : 0.75,
            }}
          >
            <Group justify="space-between" wrap="nowrap">
              <Group gap={8} wrap="nowrap">
                <span
                  aria-hidden
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 9,
                    background: def.palette.bg,
                    border: `2px solid ${def.palette.accent}`,
                    boxShadow: `inset 0 0 0 6px ${def.palette.surface2}`,
                    flex: '0 0 auto',
                  }}
                />
                <Stack gap={0}>
                  <Text size="sm" fw={600} c={tokens.text}>
                    {t(def.name)}
                  </Text>
                  <Text size="xs" c={tokens.faint}>
                    {unlocked
                      ? t('settings:theme.owned')
                      : t('settings:theme.price', { n: def.price })}
                  </Text>
                </Stack>
              </Group>
              {unlocked ? (
                <Button
                  size="compact-xs"
                  variant={selected ? 'filled' : 'default'}
                  disabled={selected}
                  onClick={() => {
                    chooseTheme(def.id as ThemeId);
                  }}
                >
                  {t(selected ? 'settings:theme.active' : 'settings:theme.use')}
                </Button>
              ) : (
                <Button
                  size="compact-xs"
                  disabled={!affordable}
                  onClick={() => {
                    if (!spendShards(def.price)) return;
                    trackEvent({ name: 'meta_purchase', params: { kind: 'theme' } });
                    unlockTheme(def.id);
                    chooseTheme(def.id as ThemeId);
                    playSfx('buy');
                  }}
                >
                  {t('settings:theme.unlock')}
                </Button>
              )}
            </Group>
          </Paper>
        );
      })}
    </Stack>
  );
};
