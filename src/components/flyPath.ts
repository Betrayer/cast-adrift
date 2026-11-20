export const FLY_MIN_SCALE = 0.08;

export interface FlyBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface FlyPath {
  frame: FlyBox;
  dx: number;
  dy: number;
  scale: number;
}

export const flyPath = (
  from: FlyBox,
  size: { width: number; height: number },
  to: FlyBox,
): FlyPath => {
  const fromX = from.left + from.width / 2;
  const fromY = from.top + from.height / 2;
  const area = Math.max(1, size.width * size.height);
  const scale = Math.min(
    1,
    Math.max(FLY_MIN_SCALE, Math.sqrt((to.width * to.height) / area)),
  );
  return {
    frame: {
      left: fromX - size.width / 2,
      top: fromY - size.height / 2,
      width: size.width,
      height: size.height,
    },
    dx: to.left + to.width / 2 - fromX,
    dy: to.top + to.height / 2 - fromY,
    scale,
  };
};

export const landingTransform = (path: FlyPath): string =>
  `translate3d(${String(path.dx)}px, ${String(path.dy)}px, 0) scale(${String(path.scale)})`;
