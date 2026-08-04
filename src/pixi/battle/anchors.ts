export interface AnchorRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

let tray: AnchorRect | null = null;

export const publishTrayAnchor = (rect: AnchorRect | null): void => {
  tray = rect;
};

export const trayAnchorRect = (): AnchorRect | null => tray;
