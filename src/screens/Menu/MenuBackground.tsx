import { useMemo } from 'react';
import type { Application } from 'pixi.js';
import { mountMenuBg } from '@/pixi/menuBg';
import { PixiCanvas } from '@/pixi/PixiCanvas';

// Split out of MenuScreen on purpose: this file is the only thing on the menu
// that reaches for Pixi, so keeping it behind a lazy boundary keeps the renderer
// out of the initial chunk entirely (DESIGN §17).
export const MenuBackground = ({
  reducedMotion,
}: {
  reducedMotion: boolean;
}) => {
  const mount = useMemo(
    () => (app: Application) => mountMenuBg(app, { reducedMotion }),
    [reducedMotion],
  );
  return <PixiCanvas mount={mount} />;
};
