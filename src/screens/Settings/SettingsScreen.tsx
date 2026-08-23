import {
  Button,
  Group,
  Paper,
  SegmentedControl,
  Select,
  Slider,
  Stack,
  Switch,
  Text,
} from '@mantine/core';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/app/Screen';
import { AppHeader } from '@/components/AppHeader';
import { tokens } from '@/app/theme';
import { DIE_SKINS } from '@/data/cosmetics';
import { THEMES, type ThemeId } from '@/data/themes';
import { unlockedCosmetics } from '@/data/unlocks';
import { cosmeticRoutes, unlockHintsLine } from '@/game/meta/describeUnlock';
import { unlockContextOf } from '@/game/meta/unlockState';
import { AVAILABLE_LOCALES } from '@/i18n';
import { trackEvent } from '@/services/analytics';
import { playSfx } from '@/services/audio';
import { recentErrors } from '@/services/errors';
import { APP_VERSION } from '@/services/version';
import { useMetaStore } from '@/stores/metaStore';
import { chooseTheme } from '@/services/prefs';
import { useSettingsStore } from '@/stores/settingsStore';
import type {
  BattleSpeed,
  EchoVerbosity,
  FontScale,
  Locale,
  ReducedMotionSetting,
} from '@/types';
import { AccountSection } from './AccountSection';
import { LayoutPicker } from './LayoutPicker';

const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  uk: 'Українська',
  ru: 'Русский',
  de: 'Deutsch',
  es: 'Español',
  fr: 'Français',
  pl: 'Polski',
};

const LOCALE_OPTIONS = AVAILABLE_LOCALES.map((value) => ({
  value,
  label: LOCALE_LABELS[value],
}));

const SkinPicker = () => {
  const { t } = useTranslation(['meta']);
  const active = useMetaStore((s) => s.dieSkin);
  const setDieSkin = useMetaStore((s) => s.setDieSkin);
  const level = useMetaStore((s) => s.level);
  const achievements = useMetaStore((s) => s.achievements);
  const ascension = useMetaStore((s) => s.ascension);
  const unlocksGranted = useMetaStore((s) => s.unlocksGranted);
  const clears = useMetaStore((s) => s.stats.campaignClears);
  const ctx = unlockContextOf({
    level,
    achievements,
    ascension,
    unlocksGranted,
    stats: { campaignClears: clears },
  });
  const open = unlockedCosmetics(ctx);

  return (
    <Stack gap="xs" data-skin-picker>
      <Text size="sm" c={tokens.dim}>
        {t('meta:skin.title')}
      </Text>
      <Text size="xs" c={tokens.faint}>
        {t('meta:skin.hint')}
      </Text>
      {DIE_SKINS.map((def) => {
        const unlocked = def.cosmetic === undefined || open.has(def.cosmetic);
        const selected = active === def.id;
        return (
          <Paper
            key={def.id}
            p="sm"
            radius="md"
            withBorder
            bg={tokens.surface1}
            data-skin={def.id}
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
                  <Text size="xs" c={tokens.amber} data-skin-hint>
                    {unlockHintsLine(cosmeticRoutes(def.cosmetic ?? ''), t)}
                  </Text>
                )}
              </Stack>
              {unlocked ? (
                <Button
                  size="compact-xs"
                  variant={selected ? 'filled' : 'default'}
                  disabled={selected}
                  onClick={() => {
                    setDieSkin(def.id);
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

const ThemePicker = () => {
  const { t } = useTranslation(['settings', 'meta']);
  const active = useSettingsStore((s) => s.theme);
  const owned = useMetaStore((s) => s.themes);
  const shards = useMetaStore((s) => s.shards);
  const spendShards = useMetaStore((s) => s.spendShards);
  const unlockTheme = useMetaStore((s) => s.unlockTheme);
  const level = useMetaStore((s) => s.level);
  const achievements = useMetaStore((s) => s.achievements);
  const ascension = useMetaStore((s) => s.ascension);
  const unlocksGranted = useMetaStore((s) => s.unlocksGranted);
  const clears = useMetaStore((s) => s.stats.campaignClears);
  const cosmetics = unlockedCosmetics(
    unlockContextOf({
      level,
      achievements,
      ascension,
      unlocksGranted,
      stats: { campaignClears: clears },
    }),
  );

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

const Diagnostics = () => {
  const { t } = useTranslation(['settings']);
  const [open, setOpen] = useState(false);
  const reports = recentErrors();

  return (
    <Stack gap="xs">
      <Group justify="space-between">
        <Text size="xs" c={tokens.faint}>
          {t('settings:diagnostics.version', { version: APP_VERSION })}
        </Text>
        <Button
          size="compact-xs"
          variant="default"
          onClick={() => {
            setOpen((value) => !value);
          }}
        >
          {t(open ? 'settings:diagnostics.hide' : 'settings:diagnostics.show', {
            n: reports.length,
          })}
        </Button>
      </Group>
      {open ? (
        <Paper p="xs" radius="md" withBorder bg={tokens.surface1}>
          {reports.length === 0 ? (
            <Text size="xs" c={tokens.dim}>
              {t('settings:diagnostics.clean')}
            </Text>
          ) : (
              <Stack gap={4}>
                {reports.map((report) => (
                  <Text
                    key={`${String(report.at)}-${report.message}`}
                    size="xs"
                    c={tokens.dim}
                    style={{ fontFamily: 'monospace', wordBreak: 'break-word' }}
                  >
                    {`${report.screen} · ${report.message}`}
                  </Text>
                ))}
              </Stack>
          )}
        </Paper>
      ) : null}
    </Stack>
  );
};

export const SettingsScreen = () => {
  const { t } = useTranslation(['common', 'settings']);
  const settings = useSettingsStore();
  const resetTutorial = useMetaStore((s) => s.resetTutorial);

  return (
    <Screen header={<AppHeader />}>
      <Stack gap="lg">
      <AccountSection />

      <Stack gap="xs">
        <Text size="sm" c={tokens.dim}>
          {t('settings:language')}
        </Text>
        <Select
          allowDeselect={false}
          value={settings.locale}
          onChange={(value) => {
            if (value !== null) settings.setLocale(value as Locale);
          }}
          data={LOCALE_OPTIONS}
          data-testid="settings-locale"
          comboboxProps={{ withinPortal: true }}
        />
      </Stack>

      <LayoutPicker />

      <ThemePicker />

      <SkinPicker />

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
          data-testid="settings-sfx"
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

      <Switch
        label={t('settings:skipTally')}
        data-testid="settings-skip-tally"
        checked={settings.skipTally}
        onChange={(event) => {
          settings.setSkipTally(event.currentTarget.checked);
        }}
      />

      <Button
        variant="default"
        data-testid="settings-tutorial-reset"
        onClick={resetTutorial}
      >
        {t('settings:tutorialReset')}
      </Button>

      <Diagnostics />
      </Stack>
    </Screen>
  );
};
