import type { BackdropMode } from '@/app/deviceTier';
import type { ChartLayoutId } from '@/types';

export interface ChartBackdropStats {
  layout: ChartLayoutId | null;
  mode: BackdropMode | null;
  frames: number;
  particles: number;
}

const stats: ChartBackdropStats = {
  layout: null,
  mode: null,
  frames: 0,
  particles: 0,
};

export const noteBackdrop = (
  layout: ChartLayoutId,
  mode: BackdropMode,
  particles: number,
): void => {
  stats.layout = layout;
  stats.mode = mode;
  stats.particles = particles;
};

export const countBackdropFrame = (): void => {
  stats.frames += 1;
};

export const clearBackdrop = (): void => {
  stats.layout = null;
  stats.mode = null;
  stats.particles = 0;
};

export const readChartBackdrop = (): ChartBackdropStats => ({ ...stats });
