import { describe, expect, it } from "vitest";
import { ALL_ENEMIES } from "@/data/enemies";
import { intentsOfStep } from "@/types/content";
import deContent from "@/i18n/de/content.json";
import enContent from "@/i18n/en/content.json";
import esContent from "@/i18n/es/content.json";
import frContent from "@/i18n/fr/content.json";
import plContent from "@/i18n/pl/content.json";
import ruContent from "@/i18n/ru/content.json";
import ukContent from "@/i18n/uk/content.json";
import deMeta from "@/i18n/de/meta.json";
import enMeta from "@/i18n/en/meta.json";
import esMeta from "@/i18n/es/meta.json";
import frMeta from "@/i18n/fr/meta.json";
import plMeta from "@/i18n/pl/meta.json";
import ruMeta from "@/i18n/ru/meta.json";
import ukMeta from "@/i18n/uk/meta.json";

type CopyTree = { readonly [key: string]: string | CopyTree };

const COPY_LOCALES = ["en", "ru", "uk", "de", "es", "fr", "pl"] as const;

type CopyLocale = (typeof COPY_LOCALES)[number];

const TRANSLATED = COPY_LOCALES.filter((locale) => locale !== "en");

const CONTENT: Record<CopyLocale, CopyTree> = {
  en: enContent as unknown as CopyTree,
  ru: ruContent as unknown as CopyTree,
  uk: ukContent as unknown as CopyTree,
  de: deContent as unknown as CopyTree,
  es: esContent as unknown as CopyTree,
  fr: frContent as unknown as CopyTree,
  pl: plContent as unknown as CopyTree,
};

const META: Record<CopyLocale, CopyTree> = {
  en: enMeta as unknown as CopyTree,
  ru: ruMeta as unknown as CopyTree,
  uk: ukMeta as unknown as CopyTree,
  de: deMeta as unknown as CopyTree,
  es: esMeta as unknown as CopyTree,
  fr: frMeta as unknown as CopyTree,
  pl: plMeta as unknown as CopyTree,
};

const stringAt = (tree: CopyTree, path: string): string => {
  let node: string | CopyTree | undefined = tree;
  for (const step of path.split(".")) {
    node = node === undefined || typeof node === "string" ? undefined : node[step];
  }
  return typeof node === "string" ? node : "";
};

const branchAt = (tree: CopyTree, key: string): CopyTree => {
  const node = tree[key];
  return node === undefined || typeof node === "string" ? {} : node;
};

const numbersIn = (text: string): string[] => [...(text.match(/\d+/gu) ?? [])].sort();

const WORDLIKE = /[\p{L}\p{N}]/u;

const placeholderNames = (text: string): string[] =>
  [...text.matchAll(/\{\{(\w+)\}\}/gu)].map((match) => match[1] ?? "");

const placeholderGlue = (text: string, name: string): boolean[] => {
  const token = `{{${name}}}`;
  const at = text.indexOf(token);
  if (at < 0) return [];
  const before = at === 0 ? undefined : text[at - 1];
  const after = text[at + token.length];
  return [
    before !== undefined && WORDLIKE.test(before),
    after !== undefined && WORDLIKE.test(after),
  ];
};

const MECHANIC_PATHS = [
  "perksDesc.afterburner",
  "perksDesc.tug",
  "perksDesc.mirrorLattice",
  "perksDesc.standingWave",
  "perksDesc.rhizome",
  "modules.ballastModule.desc",
  "modules.bulkheadRing.desc",
  "modules.hardpointClamp.desc",
  "signature.auctionCorvette",
  "signature.foldTyrant",
] as const;

const FIRST_OF_TURN: Record<CopyLocale, string> = {
  en: "first",
  ru: "перв",
  uk: "перш",
  de: "erste",
  es: "primera",
  fr: "première",
  pl: "pierwsza",
};

const ONCE_A_TURN_PATHS = ["perksDesc.tug", "perksDesc.mirrorLattice"] as const;

const HULL_GATE: Record<CopyLocale, string> = {
  en: "below",
  ru: "ниже",
  uk: "нижче",
  de: "unter",
  es: "debajo",
  fr: "sous",
  pl: "poniżej",
};

const BARGAIN_DOSSIERS = [
  "tollBarge",
  "bailiff",
  "usurer",
  "auctionCorvette",
] as const;

const HULL_GATED_DOSSIERS = [
  "foldTyrant",
  "silencer",
  "hushWarden",
  "quarantineWarden",
  "riftMaw",
  "riftBranch",
  "beaconTrap",
  "cantorColossus",
  "auctionCorvette",
] as const;

describe("mechanic copy quotes the same figures in every language", () => {
  for (const path of MECHANIC_PATHS) {
    it(`keeps the numbers of ${path}`, () => {
      const source = stringAt(CONTENT.en, path);
      expect(source, `en ${path}`).not.toBe("");
      for (const locale of TRANSLATED) {
        const line = stringAt(CONTENT[locale], path);
        expect(line, `${locale} ${path}`).not.toBe("");
        expect(numbersIn(line), `${locale} ${path}: ${line}`).toEqual(numbersIn(source));
      }
    });
  }
});

describe("once-a-turn evasion perks say they fire once", () => {
  for (const path of ONCE_A_TURN_PATHS) {
    it(`calls out the turn's first evasion in ${path}`, () => {
      for (const locale of COPY_LOCALES) {
        const line = stringAt(CONTENT[locale], path).toLowerCase();
        expect(line, `${locale} ${path}`).not.toBe("");
        expect(
          line.includes(FIRST_OF_TURN[locale]),
          `${locale} ${path} must name the turn's first evasion: ${line}`,
        ).toBe(true);
      }
    });
  }
});

describe("dossier lines quote the figures their def carries", () => {
  it("quotes the on-hit theft of every def that steals", () => {
    for (const def of ALL_ENEMIES) {
      if (def.stealOnHit === undefined) continue;
      const line = stringAt(CONTENT.en, `signature.${def.id}`);
      expect(numbersIn(line), `signature.${def.id}: ${line}`).toContain(
        String(def.stealOnHit),
      );
    }
  });

  it("quotes the raised theft a part aura carries", () => {
    for (const def of ALL_ENEMIES) {
      const raised = (def.subsystems ?? []).some((part) => part.aura === "stealOnHit6");
      if (!raised) continue;
      const line = stringAt(CONTENT.en, `signature.${def.id}`);
      expect(numbersIn(line), `signature.${def.id}: ${line}`).toContain("6");
    }
  });

  for (const id of BARGAIN_DOSSIERS) {
    it(`quotes every bid ${id} makes`, () => {
      const def = ALL_ENEMIES.find((candidate) => candidate.id === id);
      expect(def, id).toBeDefined();
      const bids = [
        ...new Set(
          [...(def?.pattern ?? []), ...(def?.phases ?? []).flatMap((phase) => phase.pattern)]
            .flatMap(intentsOfStep)
            .filter((intent) => intent.t === "bargain")
            .map((intent) => String(intent.n)),
        ),
      ];
      expect(bids.length, `${id} bargains`).toBeGreaterThan(0);
      const line = stringAt(CONTENT.en, `signature.${id}`);
      for (const bid of bids) {
        expect(numbersIn(line), `signature.${id}: ${line}`).toContain(bid);
      }
    });
  }
});

describe("dossier lines name the gate a late escalation hides behind", () => {
  for (const id of HULL_GATED_DOSSIERS) {
    it(`gates ${id} on hull, not on a part`, () => {
      const def = ALL_ENEMIES.find((candidate) => candidate.id === id);
      expect(def, id).toBeDefined();
      const phases = def?.phases ?? [];
      const opening = new Set(
        (phases[0]?.pattern ?? []).flatMap(intentsOfStep).map((intent) => intent.t),
      );
      const introduced = phases
        .slice(1)
        .flatMap((phase) => [
          ...phase.pattern.flatMap(intentsOfStep),
          ...(phase.onEnter ?? []),
          ...(phase.everyTurn ?? []),
        ])
        .filter((intent) => !opening.has(intent.t));
      expect(introduced.length, `${id} escalates in a later phase`).toBeGreaterThan(0);
      for (const locale of COPY_LOCALES) {
        const line = stringAt(CONTENT[locale], `signature.${id}`).toLowerCase();
        expect(line, `${locale} signature.${id}`).not.toBe("");
        expect(
          line.includes(HULL_GATE[locale]),
          `${locale} signature.${id} gates ${introduced
            .map((intent) => intent.t)
            .join("/")} on hull but never says so: ${line}`,
        ).toBe(true);
      }
    });
  }
});

describe("the drift summary block", () => {
  it("spaces every placeholder the way en spaces it", () => {
    const source = branchAt(META.en, "drift");
    for (const [key, value] of Object.entries(source)) {
      if (typeof value !== "string") continue;
      for (const name of placeholderNames(value)) {
        for (const locale of TRANSLATED) {
          const line = branchAt(META[locale], "drift")[key];
          if (typeof line !== "string") continue;
          if (!line.includes(`{{${name}}}`)) continue;
          expect(
            placeholderGlue(line, name),
            `${locale} drift.${key}: ${line}`,
          ).toEqual(placeholderGlue(value, name));
        }
      }
    }
  });

  it("quotes the same multipliers as en", () => {
    const source = branchAt(META.en, "drift");
    for (const [key, value] of Object.entries(source)) {
      if (typeof value !== "string") continue;
      for (const locale of TRANSLATED) {
        const line = branchAt(META[locale], "drift")[key];
        if (typeof line !== "string") continue;
        expect(numbersIn(line), `${locale} drift.${key}: ${line}`).toEqual(
          numbersIn(value),
        );
      }
    }
  });

  it("leaves no English shortfall wording behind", () => {
    for (const locale of TRANSLATED) {
      const line = branchAt(META[locale], "drift")["best"];
      expect(typeof line === "string" ? line : "", `${locale} drift.best`).not.toMatch(
        /\bshort\b/iu,
      );
    }
  });
});
