import { useEffect } from 'react';
import { BuildSheet } from '@/screens/Build/BuildSheet';
import { playSfx } from '@/services/audio';
import { haptic } from '@/services/tma';
import { useAppStore } from '@/stores/appStore';

export const BuildSheetHost = () => {
  const opened = useAppStore((s) => s.buildSheet);
  const setBuildSheet = useAppStore((s) => s.setBuildSheet);

  useEffect(() => {
    if (!opened) return;
    playSfx('eventOpen', { rate: 1.24, gain: 0.6 });
    haptic('reveal');
  }, [opened]);

  if (!opened) return null;
  return (
    <BuildSheet
      onClose={() => {
        setBuildSheet(false);
      }}
    />
  );
};
