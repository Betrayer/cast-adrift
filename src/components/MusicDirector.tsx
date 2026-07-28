import { useEffect } from 'react';
import { initAudio, playMusic } from '@/services/audio';
import { useAppStore } from '@/stores/appStore';
import { useBattleStore } from '@/stores/battleStore';

export const MusicDirector = () => {
  const screen = useAppStore((s) => s.screen);
  const bossFight = useBattleStore((s) => s.introEnemyId !== null);

  useEffect(() => {
    initAudio();
  }, []);

  useEffect(() => {
    if (screen === 'battle') {
      playMusic('battle', { layer: bossFight ? 'battleBoss' : null });
      return;
    }
    playMusic('menu');
  }, [screen, bossFight]);

  return null;
};
