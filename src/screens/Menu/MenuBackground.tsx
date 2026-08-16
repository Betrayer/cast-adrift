import { useMemo } from 'react';
import type { Application } from 'pixi.js';
import { mountMenuBg } from '@/pixi/menuBg';
import { PixiCanvas } from '@/pixi/PixiCanvas';

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
