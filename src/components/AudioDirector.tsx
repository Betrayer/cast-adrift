import { useEffect, useRef } from 'react';
import { bossLayerGain, type MusicId } from '@/data/audio';
import { initAudio, playMusic, playSfx } from '@/services/audio';
import { useAppStore } from '@/stores/appStore';
import { useBattleStore } from '@/stores/battleStore';
import type { ScreenId } from '@/types';

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

  useEffect(() => {
    initAudio();
  }, []);

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
