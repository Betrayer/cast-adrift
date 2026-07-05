import {
  Button,
  SegmentedControl,
  Slider,
  Stack,
  Switch,
  Text,
  Title,
} from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { tokens } from '@/app/theme';
import { useAppStore } from '@/stores/appStore';
import { useSettingsStore } from '@/stores/settingsStore';
import type { EchoVerbosity, Locale, ReducedMotionSetting } from '@/types';

const LOCALE_OPTIONS: { value: Locale; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'uk', label: 'Українська' },
  { value: 'ru', label: 'Русский' },
];

export const SettingsScreen = () => {
  const { t } = useTranslation(['common', 'settings']);
  const go = useAppStore((s) => s.go);
  const settings = useSettingsStore();

  return (
    <Stack
      maw={440}
      mx="auto"
      mih="100dvh"
      justify="center"
      gap="lg"
      p="lg"
      bg={tokens.bg}
    >
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
