import {
  Button,
  Select,
  Slider,
  Stack,
  Switch,
  Text,
} from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/app/Screen';
import grids from '@/app/grids.module.css';
import { riseStyle } from '@/app/motion';
import { AppHeader } from '@/components/AppHeader';
import { tokens } from '@/app/theme';
import { AVAILABLE_LOCALES } from '@/i18n';
import { playSfx } from '@/services/audio';
import { flashVignette } from '@/services/vignette';
import { useMetaStore } from '@/stores/metaStore';
import { useSettingsStore } from '@/stores/settingsStore';
import type { Locale } from '@/types';
import { AccountSection } from './AccountSection';
import { ChartLayoutPicker } from './ChartLayoutPicker';
import { Diagnostics } from './Diagnostics';
import { LayoutPicker } from './LayoutPicker';
import { RollStylePicker } from './RollStylePicker';
import { SegmentSetting } from './SegmentSetting';
import { FramePicker } from './FramePicker';
import { SkinPicker } from './SkinPicker';
import { ThemePicker } from './ThemePicker';

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

export const SettingsScreen = () => {
  const { t } = useTranslation(['common', 'settings']);
  const settings = useSettingsStore();
  const resetTutorial = useMetaStore((s) => s.resetTutorial);

  return (
    <Screen width="grid" header={<AppHeader />}>
      <Stack gap="lg">
      <div data-rise data-settings-section="account" style={riseStyle(0)}>
        <AccountSection />
      </div>

      <div className={grids.masonry} data-settings-columns>

      <Stack
        gap="xs"
        data-rise
        data-settings-section="language"
        style={riseStyle(1)}
      >
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

      <div data-rise data-settings-section="layout" style={riseStyle(2)}>
        <LayoutPicker />
      </div>

      <div data-rise data-settings-section="chartLayout" style={riseStyle(2)}>
        <ChartLayoutPicker />
      </div>

      <div data-rise data-settings-section="rollStyle" style={riseStyle(2)}>
        <RollStylePicker />
      </div>

      <div data-rise data-settings-section="theme" style={riseStyle(3)}>
        <ThemePicker />
      </div>

      <div data-rise data-settings-section="skin" style={riseStyle(3)}>
        <SkinPicker />
        <FramePicker />
      </div>

      <SegmentSetting
        section="fontScale"
        label={t('settings:fontScale')}
        value={settings.fontScale}
        onChange={settings.setFontScale}
        data={[
          { value: 's', label: t('settings:fontS') },
          { value: 'm', label: t('settings:fontM') },
          { value: 'l', label: t('settings:fontL') },
        ]}
      />

      <Stack
        gap="xs"
        data-rise
        data-settings-section="sfx"
        style={riseStyle(3)}
      >
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

      <Stack
        gap="xs"
        data-rise
        data-settings-section="music"
        style={riseStyle(3)}
      >
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

      <SegmentSetting
        section="battleSpeed"
        label={t('settings:battleSpeed')}
        value={settings.battleSpeed}
        onChange={settings.setBattleSpeed}
        data={[
          { value: 'normal', label: t('settings:speedNormal') },
          { value: 'fast', label: t('settings:speedFast') },
        ]}
      />

      <SegmentSetting
        section="reducedMotion"
        label={t('settings:reducedMotion')}
        value={settings.reducedMotion}
        onChange={settings.setReducedMotion}
        data={[
          { value: 'auto', label: t('settings:auto') },
          { value: 'on', label: t('settings:on') },
          { value: 'off', label: t('settings:off') },
        ]}
      />

      <SegmentSetting
        section="echoVerbosity"
        label={t('settings:echoVerbosity')}
        value={settings.echoVerbosity}
        onChange={settings.setEchoVerbosity}
        data={[
          { value: 'normal', label: t('settings:echoNormal') },
          { value: 'less', label: t('settings:echoLess') },
          { value: 'off', label: t('settings:off') },
        ]}
      />

      <div data-rise data-settings-section="screenShake" style={riseStyle(3)}>
        <Switch
          label={t('settings:screenShake')}
          checked={settings.screenShake}
          onChange={(event) => {
            settings.setScreenShake(event.currentTarget.checked);
          }}
        />
      </div>

      <SegmentSetting
        section="vignette"
        label={t('settings:vignette')}
        testId="settings-vignette"
        value={settings.vignette}
        onChange={(value) => {
          settings.setVignette(value);
          if (value !== 'off') flashVignette('hullHit', { side: 'left' });
        }}
        data={[
          { value: 'off', label: t('settings:off') },
          { value: 'subtle', label: t('settings:vignetteSubtle') },
          { value: 'full', label: t('settings:vignetteFull') },
        ]}
      >
        <Button
          variant="default"
          size="compact-xs"
          data-testid="settings-vignette-preview"
          disabled={settings.vignette === 'off'}
          onClick={() => {
            flashVignette('shieldHold', { side: 'right' });
            flashVignette('hullHit', { side: 'left' });
          }}
        >
          {t('settings:vignettePreview')}
        </Button>
        <Text size="xs" c={tokens.faint}>
          {t('settings:vignetteHint')}
        </Text>
      </SegmentSetting>

      <div data-rise data-settings-section="skipTally" style={riseStyle(3)}>
        <Switch
          label={t('settings:skipTally')}
          data-testid="settings-skip-tally"
          checked={settings.skipTally}
          onChange={(event) => {
            settings.setSkipTally(event.currentTarget.checked);
          }}
        />
      </div>

      <Button
        variant="default"
        data-press
        data-rise
        data-settings-section="tutorial"
        data-testid="settings-tutorial-reset"
        style={riseStyle(3)}
        onClick={resetTutorial}
      >
        {t('settings:tutorialReset')}
      </Button>

      <div data-rise data-settings-section="diagnostics" style={riseStyle(3)}>
        <Diagnostics />
      </div>
      </div>
      </Stack>
    </Screen>
  );
};
