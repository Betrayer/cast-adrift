import { useEffect, useRef } from 'react';
import { bossLayerGain, type MusicId } from '@/data/audio';
import { initAudio, playMusic, playSfx } from '@/services/audio';
import { useAppStore } from '@/stores/appStore';
import { useBattleStore } from '@/stores/battleStore';
import { useSettingsStore } from '@/stores/settingsStore';
import type { ScreenId } from '@/types';

const primeSpeech =
  import.meta.env.VITE_VOICE === '1'
    ? (): void => {
        const synth = window.speechSynthesis as SpeechSynthesis | undefined;
        if (synth === undefined || typeof SpeechSynthesisUtterance === 'undefined') return;
        synth.speak(new SpeechSynthesisUtterance(''));
      }
    : null;

const GESTURE_EVENTS = ['touchend', 'click', 'keydown'] as const;

const bedFor = (screen: ScreenId): MusicId => {
  if (screen === 'battle') return 'battle';
  return screen === 'map' ? 'map' : 'menu';
};

export const AudioDirector = () => {
  const screen = useAppStore((s) => s.screen);
  const bossFight = useBattleStore((s) => s.introEnemyId !== null);
  const bossPhase = useBattleStore((s) =>
    s.enemies.reduce((most, enemy) => Math.max(most, enemy.phase), 1),
  );
  const previousScreen = useRef<ScreenId | null>(null);
  const voiceOn = useSettingsStore((s) => s.voice);

  useEffect(() => {
    initAudio();
  }, []);

  useEffect(() => {
    if (primeSpeech === null || !voiceOn) return;
    const prime = primeSpeech;
    const unlock = (): void => {
      prime();
      for (const type of GESTURE_EVENTS) window.removeEventListener(type, unlock, true);
    };
    for (const type of GESTURE_EVENTS) window.addEventListener(type, unlock, true);
    return () => {
      for (const type of GESTURE_EVENTS) window.removeEventListener(type, unlock, true);
    };
  }, [voiceOn]);

  useEffect(() => {
    const layer = screen === 'battle' && bossFight ? 'battleBoss' : null;
    playMusic(bedFor(screen), {
      layer,
      layerGain: bossLayerGain(bossPhase),
    });
  }, [screen, bossFight, bossPhase]);

  useEffect(() => {
    if (previousScreen.current !== null && previousScreen.current !== screen) {
      playSfx('navTick');
    }
    previousScreen.current = screen;
  }, [screen]);

  return null;
};
