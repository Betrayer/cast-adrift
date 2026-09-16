export const shapeKeys = <T extends object>(shape: T): (keyof T)[] =>
  Object.keys(shape) as (keyof T)[];

export const pickShape = <T extends object>(
  keys: readonly (keyof T)[],
  source: T,
): T => Object.fromEntries(keys.map((key) => [key, source[key]])) as T;
