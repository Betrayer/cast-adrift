let depth = 0;

export const openTapLayer = (): (() => void) => {
  depth += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    depth = Math.max(0, depth - 1);
  };
};

export const tapLayerOpen = (): boolean => depth > 0;

export const resetTapLayers = (): void => {
  depth = 0;
};
