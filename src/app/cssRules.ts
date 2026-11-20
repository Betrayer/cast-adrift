const RULE = /([^{}]+)\{([^{}]*)\}/g;

export interface CssRule {
  selector: string;
  body: string;
}

export const rulesOf = (css: string): CssRule[] =>
  [...css.matchAll(RULE)].map((match) => ({
    selector: (match[1] ?? "").trim().replace(/\s+/g, " "),
    body: match[2] ?? "",
  }));

export const bodyOf = (css: string, selector: string): string =>
  rulesOf(css).find((rule) => rule.selector === selector)?.body ?? "";

const declaration = (property: string, flags: string): RegExp =>
  new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`, flags);

export const valueOf = (body: string, property: string): string | null => {
  const match = declaration(property, "").exec(body);
  return match === null ? null : (match[1] ?? "").trim().replace(/\s+/g, " ");
};

export const valuesOf = (body: string, property: string): string[] =>
  [...body.matchAll(declaration(property, "g"))].map((match) =>
    (match[1] ?? "").trim().replace(/\s+/g, " "),
  );

export const selectorsDeclaring = (css: string, pattern: RegExp): string[] =>
  rulesOf(css)
    .filter((rule) => pattern.test(rule.body))
    .map((rule) => rule.selector);
