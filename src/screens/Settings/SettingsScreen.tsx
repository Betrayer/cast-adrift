import {
  Button,
  Group,
  Paper,
  SegmentedControl,
  Slider,
  Stack,
  Switch,
  Text,
  Title,
} from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { tokens } from '@/app/theme';
import { THEMES, type ThemeId } from '@/data/themes';
import { playSfx } from '@/services/audio';
import { useAppStore } from '@/stores/appStore';
import { useMetaStore } from '@/stores/metaStore';
import { useSettingsStore } from '@/stores/settingsStore';
import type {
  BattleSpeed,
  EchoVerbosity,
  FontScale,
  Locale,
  ReducedMotionSetting,
} from '@/types';

const LOCALE_OPTIONS: { value: Locale; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'uk', label: 'Українська' },
  { value: 'ru', label: 'Русский' },
];

const ThemePicker = () => {
  const { t } = useTranslation(['settings']);
  const active = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const owned = useMetaStore((s) => s.themes);
  const shards = useMetaStore((s) => s.shards);
  const spendShards = useMetaStore((s) => s.spendShards);
  const unlockTheme = useMetaStore((s) => s.unlockTheme);

  return (
    <Stack gap="xs">
      <Text size="sm" c={tokens.dim}>
        {t('settings:theme.label')}
      </Text>
      {THEMES.map((def) => {
        const unlocked = def.price === 0 || owned.includes(def.id);
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
                    setTheme(def.id as ThemeId);
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
                    unlockTheme(def.id);
                    setTheme(def.id);
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

export const SettingsScreen = () => {
  const { t } = useTranslation(['common', 'settings']);
  const go = useAppStore((s) => s.go);
  const settings = useSettingsStore();
  const resetTutorial = useMetaStore((s) => s.resetTutorial);

  return (
    <Stack maw={440} mx="auto" mih="100dvh" gap="lg" p="lg" bg={tokens.bg}>
      <Title order={2} c={tokens.text}>
        {t('settings:title')}
      </Title>

      <Stack gap="xs">
        <Text size="sm" c={tokens.dim}>
          {t('settings:language')}
        </Text>
        <SegmentedControl
          fullWidth
          value={settings.locale}
          onChange={(value) => {
            settings.setLocale(value as Locale);
          }}
          data={LOCALE_OPTIONS}
        />
      </Stack>

      <ThemePicker />

      <Stack gap="xs">
        <Text size="sm" c={tokens.dim}>
          {t('settings:fontScale')}
        </Text>
        <SegmentedControl
          fullWidth
          value={settings.fontScale}
          onChange={(value) => {
            settings.setFontScale(value as FontScale);
          }}
          data={[
            { value: 's', label: t('settings:fontS') },
            { value: 'm', label: t('settings:fontM') },
            { value: 'l', label: t('settings:fontL') },
          ]}
        />
      </Stack>

      <Stack gap="xs">
        <Text size="sm" c={tokens.dim}>
          {t('settings:sfxVolume')}
        </Text>
        <Slider
          min={0}
          max={1}
          step={0.05}
          value={settings.sfxVol}
          onChange={settings.setSfxVol}
          onChangeEnd={() => {
            playSfx('place');
          }}
          label={(value) => `${String(Math.round(value * 100))}%`}
        />
      </Stack>

      <Stack gap="xs">
        <Text size="sm" c={tokens.dim}>
          {t('settings:musicVolume')}
        </Text>
        <Slider
          min={0}
          max={1}
          step={0.05}
          value={settings.musicVol}
          onChange={settings.setMusicVol}
          label={(value) => `${String(Math.round(value * 100))}%`}
        />
      </Stack>

      <Stack gap="xs">
        <Text size="sm" c={tokens.dim}>
          {t('settings:battleSpeed')}
        </Text>
        <SegmentedControl
          fullWidth
          value={settings.battleSpeed}
          onChange={(value) => {
            settings.setBattleSpeed(value as BattleSpeed);
          }}
          data={[
            { value: 'normal', label: t('settings:speedNormal') },
            { value: 'fast', label: t('settings:speedFast') },
          ]}
        />
      </Stack>

      <Stack gap="xs">
        <Text size="sm" c={tokens.dim}>
          {t('settings:reducedMotion')}
        </Text>
        <SegmentedControl
          fullWidth
          value={settings.reducedMotion}
          onChange={(value) => {
            settings.setReducedMotion(value as ReducedMotionSetting);
          }}
          data={[
            { value: 'auto', label: t('settings:auto') },
            { value: 'on', label: t('settings:on') },
            { value: 'off', label: t('settings:off') },
          ]}
        />
      </Stack>

      <Stack gap="xs">
        <Text size="sm" c={tokens.dim}>
          {t('settings:echoVerbosity')}
        </Text>
        <SegmentedControl
          fullWidth
          value={settings.echoVerbosity}
          onChange={(value) => {
            settings.setEchoVerbosity(value as EchoVerbosity);
          }}
          data={[
            { value: 'normal', label: t('settings:echoNormal') },
            { value: 'less', label: t('settings:echoLess') },
            { value: 'off', label: t('settings:off') },
          ]}
        />
      </Stack>

      <Switch
        label={t('settings:screenShake')}
        checked={settings.screenShake}
        onChange={(event) => {
          settings.setScreenShake(event.currentTarget.checked);
        }}
      />

      <Button variant="default" onClick={resetTutorial}>
        {t('settings:tutorialReset')}
      </Button>

      <Button
        variant="default"
        onClick={() => {
          go('menu');
        }}
      >
        {t('common:back')}
      </Button>
    </Stack>
  );
};
