export const cx = (...parts: (string | false | null | undefined)[]): string =>
  parts
    .filter((part): part is string => typeof part === 'string' && part !== '')
    .join(' ');
