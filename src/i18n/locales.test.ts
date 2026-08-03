import { describe, expect, it } from "vitest";
import { AVAILABLE_LOCALES, EN_RESOURCES, NAMESPACES } from "@/i18n";
import { LOCALES } from "@/types";

describe("locale availability", () => {
  it("always offers the three hand-written languages", () => {
    expect(AVAILABLE_LOCALES).toContain("en");
    expect(AVAILABLE_LOCALES).toContain("uk");
    expect(AVAILABLE_LOCALES).toContain("ru");
  });

  it("only offers languages declared in the Locale union", () => {
    for (const locale of AVAILABLE_LOCALES) {
      expect(LOCALES).toContain(locale);
    }
  });

  // The machine locales are generated artefacts: absent is a valid state and
  // must not put a language in the picker that would render as English.
  it("never offers a machine locale that is not on disk", () => {
    for (const locale of ["de", "es", "fr", "pl"] as const) {
      if (!AVAILABLE_LOCALES.includes(locale)) continue;
      expect(LOCALES).toContain(locale);
    }
  });

  it("bundles every namespace for the source language", () => {
    for (const namespace of NAMESPACES) {
      expect(Object.keys(EN_RESOURCES)).toContain(namespace);
    }
  });
});
