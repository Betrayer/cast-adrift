import { CHART_NODES } from "../src/data/chart";
import { branchDepth, chartNodeCost } from "../src/game/chart/cost";
import { pathTo, pointsSpent } from "../src/game/chart/engine";
for (const id of ["hub-i0","hub-i1","hub-i3","hub-i6","hub-o0","hub-o6","hub-o12","red-gate","red-s1","red-min1","red-not1","red-min2","red-not2","red-min3","red-not3","red-min4","red-not4","red-s19","red-key1","prismatic-gate","prismatic-not1","prismatic-key1"]) {
  console.log(id.padEnd(16), "d", String(branchDepth(id)).padStart(2), "cost", chartNodeCost(id));
}
console.log("hub depth hist:", (() => {
  const h = new Map<number, number>();
  for (const n of CHART_NODES.filter((x) => x.constellation === "hub")) h.set(branchDepth(n.id), (h.get(branchDepth(n.id)) ?? 0) + 1);
  return [...h].sort((a,b)=>a[0]-b[0]).map(([k,v])=>`d${String(k)}:${String(v)}`).join(" ");
})());
const line = ["red-gate","red-min1","red-not1","red-min2","red-not2","red-min3","red-not3","red-min4","red-not4","red-s19","red-s22","red-s23","red-key1"];
console.log("v14 keystone line cost:", pointsSpent(line));
console.log("3 shallow:", pointsSpent(["red-gate","red-s1","red-s3"]));
console.log("owned 4:", pointsSpent(["red-gate","red-min1","red-not1","red-min2"]));
console.log("owned 3:", pointsSpent(["red-gate","red-min1","red-not1"]));
for (const t of ["red-gate","red-s1","red-not4","red-key1","hub-o12","prismatic-key1","prismatic-key2"]) {
  const p = pathTo(t, []);
  console.log("path", t.padEnd(16), p?.cost, p?.ids.length);
}
const a = pathTo("prismatic-key1", [])?.ids ?? [];
const b = pathTo("prismatic-key2", a)?.ids ?? [];
const pair = [...a, ...b];
const c = pathTo("red-key1", pair)?.ids ?? [];
console.log("pair:", pointsSpent(pair), "three keystones:", pointsSpent([...pair, ...c]));
console.log("key path ids:", (pathTo("red-key1", [])?.ids ?? []).join(">"));
