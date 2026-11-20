export type DeviceTier = 'low' | 'mid' | 'high';

export interface DeviceSignals {
  cores?: number;
  memoryGb?: number;
}

const LOW_CORES = 4;
const LOW_MEMORY_GB = 2;
const HIGH_CORES = 8;
const HIGH_MEMORY_GB = 8;

export const tierFor = ({ cores, memoryGb }: DeviceSignals): DeviceTier => {
  if (cores !== undefined && cores <= LOW_CORES) return 'low';
  if (memoryGb !== undefined && memoryGb <= LOW_MEMORY_GB) return 'low';
  if ((cores ?? 0) >= HIGH_CORES && (memoryGb ?? HIGH_MEMORY_GB) >= HIGH_MEMORY_GB) {
    return 'high';
  }
  return 'mid';
};

interface NavigatorSignals {
  hardwareConcurrency?: number;
  deviceMemory?: number;
}

export const deviceTier = (): DeviceTier => {
  if (typeof navigator === 'undefined') return 'mid';
  const signals = navigator as NavigatorSignals;
  return tierFor({
    cores: signals.hardwareConcurrency,
    memoryGb: signals.deviceMemory,
  });
};

export type BackdropMode = 'live' | 'still';

export const backdropMode = ({
  reduced,
  tier,
}: {
  reduced: boolean;
  tier: DeviceTier;
}): BackdropMode => (reduced || tier === 'low' ? 'still' : 'live');
