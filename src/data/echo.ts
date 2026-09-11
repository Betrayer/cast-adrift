import type {
  Intent,
  LocKey,
  PatternStep,
  StepCond,
} from "@/types/content";

export type EchoBranch = "tactician" | "navigator" | "keeper";

export const ECHO_BRANCHES: readonly EchoBranch[] = [
  "tactician",
  "navigator",
  "keeper",
];

export type EchoNodeId =
  | "secondLook"
  | "readout"
  | "calculus"
  | "echolocation"
  | "pathGhost"
  | "softLanding"
  | "reserve"
  | "shieldEcho"
  | "veto";

interface EchoCopy {
  name: LocKey;
  desc: LocKey;
  short: LocKey;
}

interface EchoNodeBase extends EchoCopy {
  branch: EchoBranch;
  threshold: number;
}

export type EchoNodeDef =
  | (EchoNodeBase & { id: "secondLook"; dice: number })
  | (EchoNodeBase & { id: "readout" })
  | (EchoNodeBase & { id: "calculus"; weapons: number })
  | (EchoNodeBase & { id: "echolocation"; rows: number })
  | (EchoNodeBase & { id: "pathGhost"; rows: number })
  | (EchoNodeBase & { id: "softLanding" })
  | (EchoNodeBase & { id: "reserve"; charge: number })
  | (EchoNodeBase & { id: "shieldEcho"; charge: number })
  | (EchoNodeBase & { id: "veto"; hull: number });

const copy = (id: EchoNodeId): EchoCopy => ({
  name: `content:echo.${id}.name`,
  desc: `content:echo.${id}.desc`,
  short: `content:echo.${id}.short`,
});

export const ECHO_NODES: readonly EchoNodeDef[] = [
  {
    id: "secondLook",
    ...copy("secondLook"),
    branch: "tactician",
    threshold: 2,
    dice: 2,
  },
  {
    id: "readout",
    ...copy("readout"),
    branch: "tactician",
    threshold: 8,
  },
  {
    id: "calculus",
    ...copy("calculus"),
    branch: "tactician",
    threshold: 14,
    weapons: 2,
  },
  {
    id: "echolocation",
    ...copy("echolocation"),
    branch: "navigator",
    threshold: 4,
    rows: 1,
  },
  {
    id: "pathGhost",
    ...copy("pathGhost"),
    branch: "navigator",
    threshold: 10,
    rows: 1,
  },
  {
    id: "softLanding",
    ...copy("softLanding"),
    branch: "navigator",
    threshold: 15,
  },
  {
    id: "reserve",
    ...copy("reserve"),
    branch: "keeper",
    threshold: 6,
    charge: 2,
  },
  {
    id: "shieldEcho",
    ...copy("shieldEcho"),
    branch: "keeper",
    threshold: 12,
    charge: 1,
  },
  {
    id: "veto",
    ...copy("veto"),
    branch: "keeper",
    threshold: 16,
    hull: 1,
  },
];

export const ECHO_NODE_IDS: readonly EchoNodeId[] = ECHO_NODES.map(
  (def) => def.id,
);

export const ECHO_BY_ID: ReadonlyMap<string, EchoNodeDef> = new Map(
  ECHO_NODES.map((def) => [def.id, def]),
);

export const isEchoNodeId = (value: unknown): value is EchoNodeId =>
  typeof value === "string" && ECHO_BY_ID.has(value);

export const echoNodeDef = (
  id: string | null | undefined,
): EchoNodeDef | undefined =>
  id === null || id === undefined ? undefined : ECHO_BY_ID.get(id);

export const echoBranchName = (branch: EchoBranch): LocKey =>
  `content:echo.branch.${branch}`;

export const echoNodesOfBranch = (
  branch: EchoBranch,
): readonly EchoNodeDef[] => ECHO_NODES.filter((def) => def.branch === branch);

export const echoUnlocked = (def: EchoNodeDef, fragments: number): boolean =>
  fragments >= def.threshold;

export const echoUnlockedIds = (
  fragments: number,
): readonly EchoNodeId[] =>
  ECHO_NODES.filter((def) => echoUnlocked(def, fragments)).map((def) => def.id);

export const echoNodesCrossed = (
  before: number,
  after: number,
): readonly EchoNodeDef[] =>
  ECHO_NODES.filter(
    (def) => def.threshold > before && def.threshold <= after,
  );

export const echoEquipped = (
  id: string | null | undefined,
  fragments: number,
): EchoNodeId | null => {
  const def = echoNodeDef(id);
  if (def === undefined) return null;
  return echoUnlocked(def, fragments) ? def.id : null;
};

export const echoToken = (id: EchoNodeId): string => `echo:${id}`;

export const ECHO_BATTLE_ACTIVES: readonly EchoNodeId[] = [
  "secondLook",
  "calculus",
];

export const echoIsBattleActive = (
  id: string | null | undefined,
): id is EchoNodeId =>
  isEchoNodeId(id) && ECHO_BATTLE_ACTIVES.includes(id);

const nodeOf = <K extends EchoNodeId>(
  id: string | null | undefined,
  wanted: K,
): Extract<EchoNodeDef, { id: K }> | undefined => {
  const def = echoNodeDef(id);
  return def !== undefined && def.id === wanted
    ? (def as Extract<EchoNodeDef, { id: K }>)
    : undefined;
};

export const echoSecondLookDice = (id: string | null | undefined): number =>
  nodeOf(id, "secondLook")?.dice ?? 0;

export const echoCalculusWeapons = (id: string | null | undefined): number =>
  nodeOf(id, "calculus")?.weapons ?? 0;

export const echoRevealRows = (id: string | null | undefined): number =>
  nodeOf(id, "echolocation")?.rows ?? 0;

export const echoPreviewRows = (id: string | null | undefined): number =>
  nodeOf(id, "pathGhost")?.rows ?? 0;

export const echoSoftLands = (id: string | null | undefined): boolean =>
  nodeOf(id, "softLanding") !== undefined;

export const echoStartCharge = (id: string | null | undefined): number =>
  nodeOf(id, "reserve")?.charge ?? 0;

export const echoShieldCharge = (id: string | null | undefined): number =>
  nodeOf(id, "shieldEcho")?.charge ?? 0;

export const echoVetoHull = (id: string | null | undefined): number =>
  nodeOf(id, "veto")?.hull ?? 0;

export const echoReadsIntents = (id: string | null | undefined): boolean =>
  nodeOf(id, "readout") !== undefined;

export const echoLabelVars = (
  def: EchoNodeDef,
): Readonly<Record<string, number>> => {
  switch (def.id) {
    case "secondLook":
      return { n: def.dice };
    case "readout":
      return {};
    case "calculus":
      return { n: def.weapons };
    case "echolocation":
      return { n: def.rows };
    case "pathGhost":
      return { n: def.rows };
    case "softLanding":
      return {};
    case "reserve":
      return { n: def.charge };
    case "shieldEcho":
      return { n: def.charge };
    case "veto":
      return { n: def.hull };
  }
};

export interface EchoStepReadout {
  cond: LocKey;
  values: Readonly<Record<string, number>>;
  then: Intent;
  else: Intent;
}

export const echoConditionKey = (cond: StepCond): LocKey =>
  `content:echo.cond.${cond.c}`;

export const echoConditionValues = (
  cond: StepCond,
): Readonly<Record<string, number>> => {
  switch (cond.c) {
    case "selfShielded":
      return {};
    case "playerShielded":
      return {};
    case "selfHpPctLt":
    case "playerChargeAtLeast":
    case "playerHullPctLt":
    case "alliesAtLeast":
    case "turnGte":
      return { n: cond.n };
  }
};

export const echoStepReadout = (
  step: PatternStep,
): EchoStepReadout | null => {
  if (!("when" in step)) return null;
  return {
    cond: echoConditionKey(step.when),
    values: echoConditionValues(step.when),
    then: step.then,
    else: step.else,
  };
};
