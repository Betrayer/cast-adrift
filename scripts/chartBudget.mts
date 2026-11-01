import process from "node:process";
import { CHART_NODES, CHART_NODE_BY_ID, chartSpine } from "@/data/chart";
import type { ChartNodeDef } from "@/data/chart";
import { chartCostOf, chartNodeCost } from "@/game/chart/cost";
import { pointsTotal } from "@/game/chart/engine";
import { MAX_LEVEL } from "@/game/xp";
import type { School } from "@/types/content";

const SCHOOLS: readonly School[] = [
  "red",
  "blue",
  "green",
  "yellow",
  "black",
  "grey",
  "prismatic",
];

const POOL = pointsTotal(MAX_LEVEL);
const CONTRACT_SLACK = 6;

const inConstellation = (name: string): ChartNodeDef[] =>
  CHART_NODES.filter((n) => n.constellation === name);

const idsOf = (nodes: readonly ChartNodeDef[]): string[] =>
  nodes.map((n) => n.id);

const cheapestReaching = (school: School, target: number): string[] => {
  const nodes = inConstellation(school)
    .filter((n) => n.kind !== "keystone" && n.kind !== "nexus")
    .sort((a, b) => a.depth - b.depth || chartNodeCost(a.id) - chartNodeCost(b.id));
  const picked: string[] = [];
  let spent = 0;
  for (const node of nodes) {
    if (spent >= target) break;
    picked.push(node.id);
    spent += chartNodeCost(node.id);
  }
  return picked;
};

const kindCensus = (): Map<string, number> => {
  const out = new Map<string, number>();
  for (const node of CHART_NODES) {
    out.set(node.kind, (out.get(node.kind) ?? 0) + 1);
  }
  return out;
};

const line = (label: string, value: string): void => {
  console.log(`  ${label.padEnd(34)} ${value}`);
};

const failures: string[] = [];

console.log("chart-budget: graph");
line("nodes", String(CHART_NODES.length));
for (const [kind, count] of [...kindCensus()].sort()) {
  line(`  ${kind}`, String(count));
}
line("entries", String(CHART_NODES.filter((n) => n.entry === true).length));

console.log("chart-budget: branches");
const branchTotals = new Map<School, number>();
for (const school of SCHOOLS) {
  const nodes = inConstellation(school);
  const total = chartCostOf(idsOf(nodes));
  branchTotals.set(school, total);
  const spine = chartCostOf(chartSpine(school));
  line(
    school,
    `${String(nodes.length)} nodes · whole ${String(total)} · spine+keystone ${String(spine)}`,
  );
}

const hub = chartCostOf(idsOf(inConstellation("hub")));
const nexus = chartCostOf(idsOf(inConstellation("nexus")));
line("hub", String(hub));
line("nexus", String(nexus));
line(
  "whole tree",
  String(chartCostOf(CHART_NODES.map((n) => n.id))),
);

console.log("chart-budget: what a level-50 pool buys");
line("pool at L50", String(POOL));

const wholeBranch = branchTotals.get("red") ?? 0;
const secondShallow = chartCostOf(cheapestReaching("blue", 28));
const hubCore = chartCostOf(["hub-i0", "hub-i1", "hub-i2", "hub-i11"]);
const scenarioA = wholeBranch + secondShallow + hubCore;
line(
  "A whole branch + shallow second",
  `${String(scenarioA)} (${String(wholeBranch)} + ${String(secondShallow)} + ${String(hubCore)})`,
);

const keystoneRun = (school: School): number => {
  const node = CHART_NODE_BY_ID.get(`${school}-key1`);
  const need = node?.requires?.pointsIn[school] ?? 0;
  return chartCostOf(cheapestReaching(school, need)) + chartNodeCost(`${school}-key1`);
};

const scenarioB = keystoneRun("red") + keystoneRun("blue");
line(
  "B two keystones, minimal twigs",
  `${String(scenarioB)} (${String(keystoneRun("red"))} + ${String(keystoneRun("blue"))})`,
);

const prismNeed =
  CHART_NODE_BY_ID.get("prismatic-key1")?.requires?.pointsIn.prismatic ?? 0;
const prismBase = chartCostOf(cheapestReaching("prismatic", prismNeed));
const prismPair =
  prismBase +
  chartNodeCost("prismatic-key1") +
  chartNodeCost("prismatic-key2");
const scenarioC = prismPair + keystoneRun("red");
line(
  "C Chartwright — prism pair + one",
  `${String(scenarioC)} (${String(prismPair)} + ${String(keystoneRun("red"))})`,
);

if (Math.abs(scenarioA - POOL) > CONTRACT_SLACK) {
  failures.push(
    `scenario A costs ${String(scenarioA)} against a pool of ${String(POOL)} — outside ±${String(CONTRACT_SLACK)}, so the pool no longer buys one branch and a shallow second`,
  );
}

for (const [name, value] of [
  ["B", scenarioB],
  ["C", scenarioC],
] as const) {
  if (value > POOL) {
    failures.push(
      `scenario ${name} needs ${String(value)} against a pool of ${String(POOL)} — it does not fit`,
    );
  }
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`chart-budget: ${failure}`);
  process.exit(1);
}

console.log("chart-budget: ok");
