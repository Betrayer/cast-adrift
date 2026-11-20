import { Button, Group, Stack, Switch, Text } from '@mantine/core';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { riseStyle } from '@/app/motion';
import { tokens } from '@/app/theme';
import { useSettingsStore } from '@/stores/settingsStore';

type VoiceModule = typeof import('@/services/voice');

export const VoiceSetting = () => {
  const { t } = useTranslation(['settings']);
  const voice = useSettingsStore((s) => s.voice);
  const locale = useSettingsStore((s) => s.locale);
  const sfxVol = useSettingsStore((s) => s.sfxVol);
  const setVoice = useSettingsStore((s) => s.setVoice);
  const [service, setService] = useState<VoiceModule | null>(null);
  const [, setVoicesSeen] = useState(0);

  useEffect(() => {
    let live = true;
    void import('@/services/voice').then((module) => {
      if (live) setService(module);
    });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    const synth = window.speechSynthesis as SpeechSynthesis | undefined;
    if (synth === undefined) return;
    const onVoices = (): void => {
      setVoicesSeen((seen) => seen + 1);
    };
    synth.addEventListener('voiceschanged', onVoices);
    return () => {
      synth.removeEventListener('voiceschanged', onVoices);
    };
  }, []);

  const available = service !== null && service.voiceAvailable();
  const spoken = available && service.voiceFor(locale) !== null;
  const reason =
    service === null
      ? null
      : !available
        ? t('settings:voiceUnavailable')
        : !spoken
          ? t('settings:voiceNoLanguage')
          : sfxVol <= 0
            ? t('settings:voiceMuted')
            : null;

  return (
    <Stack gap={6} data-rise data-settings-section="voice" style={riseStyle(3)}>
      <Switch
        label={t('settings:voice')}
        data-testid="settings-voice"
        checked={voice}
        disabled={!spoken}
        onChange={(event) => {
          setVoice(event.currentTarget.checked);
        }}
      />
      <Group gap="xs" align="center" wrap="wrap">
        <Button
          variant="default"
          size="compact-xs"
          data-testid="settings-voice-sample"
          disabled={service === null || reason !== null}
          onClick={() => {
            service?.sampleVoice(t('settings:voiceSample'));
          }}
        >
          {t('settings:voiceTest')}
        </Button>
        {reason === null ? null : (
          <Text size="xs" c={tokens.faint} data-voice-reason>
            {reason}
          </Text>
        )}
      </Group>
    </Stack>
  );
};
