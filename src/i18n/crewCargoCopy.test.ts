import { describe, expect, it } from "vitest";
import deContent from "@/i18n/de/content.json";
import enContent from "@/i18n/en/content.json";
import esContent from "@/i18n/es/content.json";
import frContent from "@/i18n/fr/content.json";
import plContent from "@/i18n/pl/content.json";
import ruContent from "@/i18n/ru/content.json";
import ukContent from "@/i18n/uk/content.json";
import deRun from "@/i18n/de/run.json";
import enRun from "@/i18n/en/run.json";
import esRun from "@/i18n/es/run.json";
import frRun from "@/i18n/fr/run.json";
import plRun from "@/i18n/pl/run.json";
import ruRun from "@/i18n/ru/run.json";
import ukRun from "@/i18n/uk/run.json";

const CONTENT = {
  en: enContent,
  ru: ruContent,
  uk: ukContent,
  de: deContent,
  es: esContent,
  fr: frContent,
  pl: plContent,
};

const RUN = {
  en: enRun,
  ru: ruRun,
  uk: ukRun,
  de: deRun,
  es: esRun,
  fr: frRun,
  pl: plRun,
};

const LOCALES = Object.keys(CONTENT) as (keyof typeof CONTENT)[];

const LETTER = String.raw`\p{L}`;

const hasWord = (text: string, word: string): boolean =>
  new RegExp(`(^|[^${LETTER}])${word}([^${LETTER}]|$)`, "iu").test(text);

const PROSE_TWO: Record<keyof typeof CONTENT, readonly string[]> = {
  en: ["two"],
  ru: ["два", "две", "пару"],
  uk: ["два", "дві", "пару"],
  de: ["zwei"],
  es: ["dos"],
  fr: ["deux"],
  pl: ["dwa", "dwie"],
};

const OUTCOME_TWO: Record<keyof typeof CONTENT, string> = {
  en: "two",
  ru: "двое",
  uk: "двоє",
  de: "zwei",
  es: "dos",
  fr: "deux",
  pl: "dwie",
};

const DESC_TWO: Record<keyof typeof CONTENT, string> = {
  en: "two",
  ru: "двоих",
  uk: "двох",
  de: "beiden",
  es: "dos",
  fr: "deux",
  pl: "dwóch",
};

const FEMININE_SCRAPPER: Partial<
  Record<keyof typeof CONTENT, readonly string[]>
> = {
  de: ["Sammlerin"],
  es: ["Chatarrera", "Rescatada"],
  fr: ["Ferrailleuse", "Sauvée", "Sortie", "Elle soude", "elle trie"],
  pl: ["Zbieraczka", "Uratowana", "Wyszła"],
};

describe("the pod scrapper", () => {
  it("keeps the sex the rescue outcome gave him in every locale", () => {
    for (const locale of LOCALES) {
      const officer = CONTENT[locale].officers.scrapper;
      const written = [
        officer.name,
        officer.desc,
        officer.origin,
        officer.short,
      ].join(" · ");
      for (const marker of FEMININE_SCRAPPER[locale] ?? []) {
        expect(written, `${locale}: the officer card reads "${marker}"`).not.toContain(
          marker,
        );
      }
    }
  });
});

describe("the welder", () => {
  it("echoes the petition outcome's count of two welders", () => {
    for (const locale of LOCALES) {
      const desc = CONTENT[locale].officers.welder.desc;
      const outcome = CONTENT[locale].events.crewPetition.out.takeThem;
      expect(
        hasWord(outcome, OUTCOME_TWO[locale]),
        `${locale}: the outcome no longer counts two welders`,
      ).toBe(true);
      expect(
        hasWord(desc, DESC_TWO[locale]),
        `${locale}: the officer card contradicts the outcome's count`,
      ).toBe(true);
    }
  });
});

describe("the lead-ballast pickup", () => {
  it("names no row count the delivery picker will not produce", () => {
    for (const locale of LOCALES) {
      const haul = CONTENT[locale].events.rimNoticeboard.out.haul;
      for (const word of PROSE_TWO[locale]) {
        expect(
          hasWord(haul, word),
          `${locale}: the pickup promises a "${word}" row drop`,
        ).toBe(false);
      }
    }
  });
});

const TURN_WORDS: Record<keyof typeof CONTENT, readonly string[]> = {
  en: ["turn"],
  ru: ["ход", "ходу", "ходов"],
  uk: ["хід", "ходу", "ходів"],
  de: ["Runde", "Runden"],
  es: ["turno", "turnos"],
  fr: ["tour", "tours"],
  pl: ["tura", "turze", "turę", "tury"],
};

const ONCE_PER_RUN_NODES = ["softLanding", "veto"] as const;

describe("the once-per-run Echo nodes", () => {
  it("abbreviate the run with a word this corpus does not spend on a battle turn", () => {
    for (const locale of LOCALES) {
      for (const node of ONCE_PER_RUN_NODES) {
        const short = CONTENT[locale].echo[node].short;
        for (const word of TURN_WORDS[locale]) {
          expect(
            hasWord(short, word),
            `${locale}: ${node} reads "${short}", and "${word}" is this corpus's battle turn`,
          ).toBe(false);
        }
      }
    }
  });
});

describe("the polish corpus", () => {
  it("never writes ć before a vowel", () => {
    const written = JSON.stringify(plContent) + JSON.stringify(plRun);
    expect(written).not.toMatch(/ć[aeiouyąęó]/);
  });
});

describe("the vent confirm", () => {
  it("carries a line for a drawback that cannot end, in every locale", () => {
    for (const locale of LOCALES) {
      const bridge = RUN[locale].bridge;
      const cargo = RUN[locale].cargo;
      expect(bridge.dropBodyAxis.length, locale).toBeGreaterThan(0);
      expect(cargo.droppedAxis.length, locale).toBeGreaterThan(0);
      expect(bridge.dropBodyAxis, locale).not.toBe(bridge.dropBody);
      expect(cargo.droppedAxis, locale).not.toBe(cargo.dropped);
      expect(bridge.dropBodyAxis, locale).toContain("{{name}}");
      expect(bridge.dropBodyAxis, locale).toContain("{{n}}");
    }
  });
});
