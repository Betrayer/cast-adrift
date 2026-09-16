import { useEffect } from 'react';
import { EchoCore } from '@/components/EchoCore';
import { playSfx } from '@/services/audio';
import { haptic } from '@/services/tma';
import { useAppStore } from '@/stores/appStore';

export const EchoCoreHost = () => {
  const opened = useAppStore((s) => s.echoCore);
  const setEchoCore = useAppStore((s) => s.setEchoCore);

  useEffect(() => {
    if (!opened) return;
    playSfx('eventOpen', { rate: 1.12, gain: 0.6 });
    haptic('reveal');
  }, [opened]);

  if (!opened) return null;
  return (
    <EchoCore
      onClose={() => {
        setEchoCore(false);
      }}
    />
  );
};
