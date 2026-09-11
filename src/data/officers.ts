import type { PerkMods } from "@/data/perks/types";
import type { Action } from "@/game/effects/types";
import type { LocKey } from "@/types/content";

export const CABIN_CAP = 2;

export type OfficerId =
  | "scrapper"
  | "mechanic"
  | "defector"
  | "welder"
  | "breaker"
  | "chorister";

export type OfficerActive =
  | { id: "patch"; hull: number; charge: number }
  | { id: "restart"; rerolls: number }
  | { id: "designate"; mark: number }
  | { id: "brace"; shield: number }
  | { id: "crank"; charge: number }
  | { id: "hymn" };

export type OfficerActiveId = OfficerActive["id"];

interface OfficerCopy {
  name: LocKey;
  role: LocKey;
  desc: LocKey;
  origin: LocKey;
  short: LocKey;
}

export interface OfficerDef extends OfficerCopy {
  id: OfficerId;
  event: string;
  option: string;
  active: OfficerActive;
  passive: Partial<PerkMods>;
}

const copy = (id: OfficerId): OfficerCopy => ({
  name: `content:officers.${id}.name`,
  role: `content:officers.${id}.role`,
  desc: `content:officers.${id}.desc`,
  origin: `content:officers.${id}.origin`,
  short: `content:officers.${id}.short`,
});

export const OFFICERS: readonly OfficerDef[] = [
  {
    id: "scrapper",
    ...copy("scrapper"),
    event: "driftingPod",
    option: "open",
    active: { id: "patch", hull: 1, charge: 1 },
    passive: { scrapMultPct: 5 },
  },
  {
    id: "mechanic",
    ...copy("mechanic"),
    event: "stowaway",
    option: "keep",
    active: { id: "restart", rerolls: 1 },
    passive: { battleEndHeal: 1 },
  },
  {
    id: "defector",
    ...copy("defector"),
    event: "acolyteDefector",
    option: "shelter",
    active: { id: "designate", mark: 4 },
    passive: { markBonusDelta: 1 },
  },
  {
    id: "welder",
    ...copy("welder"),
    event: "crewPetition",
    option: "takeThem",
    active: { id: "brace", shield: 1 },
    passive: { evasionDelta: 3 },
  },
  {
    id: "breaker",
    ...copy("breaker"),
    event: "driftSalvageCrew",
    option: "rescue",
    active: { id: "crank", charge: 4 },
    passive: { scrapPerKill: 1 },
  },
  {
    id: "chorister",
    ...copy("chorister"),
    event: "hymnSchool",
    option: "takeThem",
    active: { id: "hymn" },
    passive: { rerollSizeDelta: 1 },
  },
];

export const OFFICER_IDS: readonly OfficerId[] = OFFICERS.map((def) => def.id);

export const OFFICER_BY_ID: ReadonlyMap<string, OfficerDef> = new Map(
  OFFICERS.map((def) => [def.id, def]),
);

export const officerDef = (id: string): OfficerDef | undefined =>
  OFFICER_BY_ID.get(id);

export const officerActions = (active: OfficerActive): readonly Action[] => {
  switch (active.id) {
    case "patch":
      return [
        { a: "heal", n: active.hull },
        { a: "charge", n: -active.charge },
      ];
    case "restart":
      return [];
    case "designate":
      return [{ a: "addStatus", s: "mark", n: active.mark, target: "target" }];
    case "brace":
      return [{ a: "shield", n: active.shield }];
    case "crank":
      return [{ a: "charge", n: active.charge }];
    case "hymn":
      return [{ a: "addStatus", s: "jam", n: 1, target: "target" }];
  }
};

export const officerChargeCost = (active: OfficerActive): number =>
  active.id === "patch" ? active.charge : 0;

export const officerLabelVars = (
  active: OfficerActive,
): Readonly<Record<string, number>> => {
  switch (active.id) {
    case "patch":
      return { n: active.hull, c: active.charge };
    case "restart":
      return { n: active.rerolls, c: 0 };
    case "designate":
      return { n: active.mark, c: 0 };
    case "brace":
      return { n: active.shield, c: 0 };
    case "crank":
      return { n: active.charge, c: 0 };
    case "hymn":
      return { n: 0, c: 0 };
  }
};

export const officerActiveDead = (
  active: OfficerActive,
  targetMark: number | undefined,
): boolean => active.id === "designate" && (targetMark ?? 0) >= active.mark;

export const officerToken = (id: string): string => `officer:${id}`;
