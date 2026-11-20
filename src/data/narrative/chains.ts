import type { LocKey } from "@/types/content";
import type { FlagQuery, FlagValue, SpeakerId } from "@/types/events";

export interface ChainStep {
  id: string;
  events: readonly string[];
  sector: readonly number[];
  requires?: FlagQuery;
  done: readonly string[];
  hint: LocKey;
}

export interface ChainDef {
  id: string;
  speaker: SpeakerId;
  name: LocKey;
  payoff: LocKey;
  betrayal: readonly string[];
  betrayalLine: LocKey;
  steps: readonly ChainStep[];
}

export const CHAIN_WEIGHT_BOOST = 3;

export const CHAINS: readonly ChainDef[] = [
  {
    id: "mara",
    speaker: "mara",
    name: "content:chain.mara.name",
    payoff: "content:chain.mara.payoff",
    betrayal: ["maraGrudge"],
    betrayalLine: "content:chain.mara.betrayal",
    steps: [
      {
        id: "meet",
        events: ["maraStall"],
        sector: [1],
        done: ["maraFriend", "maraGrudge"],
        hint: "content:chain.mara.step.meet",
      },
      {
        id: "debt",
        events: ["maraLedger", "maraCollector"],
        sector: [2, 3, 4, 5],
        requires: { any: ["maraFriend", "maraGrudge"] },
        done: ["maraDebt"],
        hint: "content:chain.mara.step.debt",
      },
      {
        id: "favour",
        events: ["maraSupplyRun"],
        sector: [3, 4],
        requires: { any: ["maraDebt", "maraFriend"] },
        done: ["favorHeld", "favorRefused"],
        hint: "content:chain.mara.step.favour",
      },
      {
        id: "payoff",
        events: ["maraVault", "maraUsurer"],
        sector: [5],
        requires: { any: ["favorHeld", "favorRefused", "maraDebt"] },
        done: ["maraVaultOpened", "maraUsurerSettled"],
        hint: "content:chain.mara.step.payoff",
      },
    ],
  },
  {
    id: "yusuf",
    speaker: "yusuf",
    name: "content:chain.yusuf.name",
    payoff: "content:chain.yusuf.payoff",
    betrayal: ["yusufGrudge", "fleetTruthLost"],
    betrayalLine: "content:chain.yusuf.betrayal",
    steps: [
      {
        id: "blackbox",
        events: ["fleetBlackbox"],
        sector: [2],
        done: ["fleetTruthShared", "fleetTruthKept", "fleetTruthLost"],
        hint: "content:chain.yusuf.step.blackbox",
      },
      {
        id: "convoy",
        events: ["yusufConvoyDefense"],
        sector: [3],
        requires: {
          any: ["fleetTruthShared", "fleetTruthKept", "fleetTruthLost", "yusufFriend"],
        },
        done: ["fleetAnswered", "yusufGrudge"],
        hint: "content:chain.yusuf.step.convoy",
      },
      {
        id: "lane",
        events: ["yusufRefugeeLane"],
        sector: [4, 5],
        requires: { any: ["fleetAnswered", "fleetTruthShared", "fleetTruthKept"] },
        done: ["fleetLaneOpen", "fleetLaneClosed"],
        hint: "content:chain.yusuf.step.lane",
      },
    ],
  },
  {
    id: "choir",
    speaker: "choirPreacher",
    name: "content:chain.choir.name",
    payoff: "content:chain.choir.payoff",
    betrayal: ["choirEnemy", "pactBroken", "choirBetrayed"],
    betrayalLine: "content:chain.choir.betrayal",
    steps: [
      {
        id: "invite",
        events: ["choirInvitation"],
        sector: [3],
        done: ["pactStep1", "refusedChoir"],
        hint: "content:chain.choir.step.invite",
      },
      {
        id: "seal",
        events: ["pactSeal", "pactSealSkipped"],
        sector: [4],
        requires: { any: ["pactStep1", "refusedChoir"] },
        done: ["pactSealed", "choirEnemy", "heardChoir"],
        hint: "content:chain.choir.step.seal",
      },
      {
        id: "deep",
        events: ["choirDeepPact"],
        sector: [4, 5],
        requires: { any: ["pactSealed"] },
        done: ["bargainReady", "pactBroken"],
        hint: "content:chain.choir.step.deep",
      },
      {
        id: "finale",
        events: ["preacherFinale"],
        sector: [5],
        requires: {
          any: ["pactSealed", "choirEnemy", "refusedChoir", "choirBetrayed"],
        },
        done: ["preacherAnswered"],
        hint: "content:chain.choir.step.finale",
      },
    ],
  },
  {
    id: "keeper",
    speaker: "beaconKeeper",
    name: "content:chain.keeper.name",
    payoff: "content:chain.keeper.payoff",
    betrayal: ["keeperSlighted"],
    betrayalLine: "content:chain.keeper.betrayal",
    steps: [
      {
        id: "intro",
        events: ["beaconKeeperIntro"],
        sector: [1],
        done: ["beacon1"],
        hint: "content:chain.keeper.step.intro",
      },
      {
        id: "thread",
        events: ["keeperThread"],
        sector: [2, 3, 4],
        requires: { any: ["beacon1", "beacon2", "beacon3"] },
        done: ["keeperRepaid", "keeperSlighted"],
        hint: "content:chain.keeper.step.thread",
      },
      {
        id: "core",
        events: ["coreThreshold"],
        sector: [5],
        requires: { any: ["beacon1", "beacon2", "beacon3", "beacon4"] },
        done: ["coreAnswered", "coreSilenced", "coreListened"],
        hint: "content:chain.keeper.step.core",
      },
    ],
  },
  {
    id: "huntress",
    speaker: "bountyHuntress",
    name: "content:chain.huntress.name",
    payoff: "content:chain.huntress.payoff",
    betrayal: ["hunterBetrayed"],
    betrayalLine: "content:chain.huntress.betrayal",
    steps: [
      {
        id: "mark",
        events: ["bountyAmbush"],
        sector: [1],
        requires: { all: ["hunterMark"] },
        done: ["hunterEngaged"],
        hint: "content:chain.huntress.step.mark",
      },
      {
        id: "trail",
        events: ["hunterTrail"],
        sector: [2, 3, 4],
        requires: { all: ["hunterEngaged"] },
        done: ["hunterPaid", "hunterBeaten"],
        hint: "content:chain.huntress.step.trail",
      },
      {
        id: "respect",
        events: ["hunterRespect", "huntressReposted"],
        sector: [3, 4],
        requires: { any: ["hunterBeaten", "hunterPaid"] },
        done: ["hunterAllied", "hunterWarned", "hunterBetrayed"],
        hint: "content:chain.huntress.step.respect",
      },
      {
        id: "favour",
        events: ["huntressFavor"],
        sector: [4, 5],
        requires: { any: ["hunterAllied", "hunterWarned"] },
        done: ["hunterSquared"],
        hint: "content:chain.huntress.step.favour",
      },
    ],
  },
  {
    id: "vela",
    speaker: "coreCutter",
    name: "content:chain.vela.name",
    payoff: "content:chain.vela.payoff",
    betrayal: ["velaRobbed", "velaSold"],
    betrayalLine: "content:chain.vela.betrayal",
    steps: [
      {
        id: "lathe",
        events: ["velaLathe"],
        sector: [1, 2],
        done: ["velaTowed", "velaBilled", "velaRobbed"],
        hint: "content:chain.vela.step.lathe",
      },
      {
        id: "commission",
        events: ["velaCommission"],
        sector: [2, 3],
        requires: { any: ["velaTowed", "velaBilled"] },
        done: ["velaCommissioned", "velaQuickCut"],
        hint: "content:chain.vela.step.commission",
      },
      {
        id: "choir",
        events: ["velaSanctuary"],
        sector: [3, 4],
        requires: { any: ["velaCommissioned", "velaQuickCut"] },
        done: ["velaSheltered", "velaSold"],
        hint: "content:chain.vela.step.choir",
      },
      {
        id: "masterwork",
        events: ["velaMasterwork", "velaReckoning"],
        sector: [4, 5],
        requires: { any: ["velaSheltered", "velaSold"] },
        done: ["velaCut", "velaReckoned"],
        hint: "content:chain.vela.step.masterwork",
      },
    ],
  },
  {
    id: "warden",
    speaker: "warden",
    name: "content:chain.warden.name",
    payoff: "content:chain.warden.payoff",
    betrayal: ["rosterWiped", "papersForged"],
    betrayalLine: "content:chain.warden.betrayal",
    steps: [
      {
        id: "cache",
        events: ["wardenCache", "alertedPatrol", "wardenPicket"],
        sector: [1],
        done: ["cacheCracked", "cacheLeft", "patrolCleared"],
        hint: "content:chain.warden.step.cache",
      },
      {
        id: "patrol",
        events: ["wardenPatrolBoat"],
        sector: [2],
        requires: { any: ["cacheCracked", "cacheLeft", "patrolCleared"] },
        done: ["wardenAnswered", "wardenReleased"],
        hint: "content:chain.warden.step.patrol",
      },
      {
        id: "relay",
        events: ["wardenRelay"],
        sector: [3],
        requires: { any: ["wardenAnswered", "wardenReleased"] },
        done: ["postAccepted", "rosterWiped"],
        hint: "content:chain.warden.step.relay",
      },
      {
        id: "orders",
        events: ["postingOrders", "wardenTribunal"],
        sector: [4],
        requires: { any: ["postAccepted", "rosterWiped"] },
        done: [
          "transitPapers",
          "papersForged",
          "checkpointOpened",
          "tribunalSeated",
          "tribunalDissolved",
        ],
        hint: "content:chain.warden.step.orders",
      },
      {
        id: "checkpoint",
        events: ["lastCheckpoint"],
        sector: [5],
        requires: {
          any: [
            "transitPapers",
            "papersForged",
            "checkpointOpened",
            "tribunalSeated",
            "tribunalDissolved",
          ],
        },
        done: ["lastPostCleared", "lastPostRelieved", "lastPostRun"],
        hint: "content:chain.warden.step.checkpoint",
      },
    ],
  },
  {
    id: "ines",
    speaker: "ines",
    name: "content:chain.ines.name",
    payoff: "content:chain.ines.payoff",
    betrayal: ["inesBaited", "inesStripped"],
    betrayalLine: "content:chain.ines.betrayal",
    steps: [
      {
        id: "hail",
        events: ["inesHail"],
        sector: [2, 3],
        done: ["inesTruth", "inesLied", "inesHailSold"],
        hint: "content:chain.ines.step.hail",
      },
      {
        id: "marker",
        events: ["inesMarker"],
        sector: [3, 4],
        requires: { any: ["inesTruth", "inesLied", "inesHailSold"] },
        done: ["inesMarked", "inesBaited"],
        hint: "content:chain.ines.step.marker",
      },
      {
        id: "tow",
        events: ["inesTow"],
        sector: [4, 5],
        requires: { any: ["inesMarked", "inesBaited"] },
        done: ["inesPulled", "inesFell", "inesStripped"],
        hint: "content:chain.ines.step.tow",
      },
      {
        id: "landing",
        events: ["inesLanding", "inesReckoning"],
        sector: [5, 6],
        requires: { any: ["inesPulled", "inesFell", "inesStripped"] },
        done: ["inesLanded", "inesReckoned"],
        hint: "content:chain.ines.step.landing",
      },
    ],
  },
];

export const CHAIN_BY_ID: ReadonlyMap<string, ChainDef> = new Map(
  CHAINS.map((c) => [c.id, c]),
);

export const CHAIN_EVENT_IDS: ReadonlySet<string> = new Set(
  CHAINS.flatMap((c) => c.steps.flatMap((s) => s.events)),
);

export type ChainState = "active" | "done" | "betrayed" | "dormant";

export interface ChainView {
  id: string;
  name: LocKey;
  speaker: SpeakerId;
  state: ChainState;
  step: number;
  total: number;
  hint: LocKey;
  availableHere: boolean;
}

const has = (flags: Record<string, FlagValue>, key: string): boolean =>
  flags[key] !== undefined;

const queryMet = (
  flags: Record<string, FlagValue>,
  query: FlagQuery | undefined,
): boolean => {
  if (query === undefined) return true;
  if (query.all !== undefined && !query.all.every((k) => has(flags, k))) return false;
  if (query.any !== undefined && !query.any.some((k) => has(flags, k))) return false;
  if (query.not !== undefined && query.not.some((k) => has(flags, k))) return false;
  return true;
};

export const stepDone = (
  step: ChainStep,
  flags: Record<string, FlagValue>,
): boolean => step.done.some((k) => has(flags, k));

export const nextStep = (
  chain: ChainDef,
  flags: Record<string, FlagValue>,
): ChainStep | null => chain.steps.find((s) => !stepDone(s, flags)) ?? null;

export const stepLive = (
  step: ChainStep,
  flags: Record<string, FlagValue>,
  sector: number,
): boolean =>
  !stepDone(step, flags) &&
  step.sector.includes(sector) &&
  queryMet(flags, step.requires);

export const chainView = (
  chain: ChainDef,
  flags: Record<string, FlagValue>,
  sector: number,
): ChainView => {
  const resolved = chain.steps.filter((s) => stepDone(s, flags)).length;
  const next = nextStep(chain, flags);
  const betrayed = chain.betrayal.some((k) => has(flags, k));
  const state: ChainState =
    next === null
      ? "done"
      : betrayed
        ? "betrayed"
        : resolved === 0
          ? "dormant"
          : "active";
  return {
    id: chain.id,
    name: chain.name,
    speaker: chain.speaker,
    state,
    step: resolved,
    total: chain.steps.length,
    hint: next === null ? chain.payoff : betrayed ? chain.betrayalLine : next.hint,
    availableHere: next !== null && stepLive(next, flags, sector),
  };
};

export const chainViews = (
  flags: Record<string, FlagValue>,
  sector: number,
): ChainView[] => CHAINS.map((c) => chainView(c, flags, sector));

export const liveChainEvents = (
  flags: Record<string, FlagValue>,
  sector: number,
): ReadonlySet<string> => {
  const out = new Set<string>();
  for (const chain of CHAINS) {
    const next = nextStep(chain, flags);
    if (next === null) continue;
    if (!stepLive(next, flags, sector)) continue;
    for (const id of next.events) out.add(id);
  }
  return out;
};
