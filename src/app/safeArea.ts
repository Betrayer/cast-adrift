export type SafeInsetName =
  | '--ca-safe-top'
  | '--ca-safe-right'
  | '--ca-safe-bottom'
  | '--ca-safe-left';

export interface SafeBounds {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

const safeInset = (name: SafeInsetName): number => {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name);
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const safeBounds = (edge: number): SafeBounds => ({
  top: safeInset('--ca-safe-top') + edge,
  left: safeInset('--ca-safe-left') + edge,
  right: window.innerWidth - safeInset('--ca-safe-right') - edge,
  bottom: window.innerHeight - safeInset('--ca-safe-bottom') - edge,
});
