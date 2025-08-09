import { AttributionEngine } from "../src/index";
import base from "./dataset";

const { nodes, edges, config } = base;
const POOL = 5000;
const alphas = [0, 0.25, 0.5, 0.75, 1];

function run(alpha: number) {
  const engine = new AttributionEngine({ ...config, alpha });
  const scores = engine.evaluate(nodes, edges);
  return engine.reward(scores, POOL);
}

const results: Record<string, Record<number, number>> = {};
for (const a of alphas) {
  const reward = run(a);
  for (const [agentId, amt] of Object.entries(reward)) {
    results[agentId] ||= {} as any;
    results[agentId]![a] = amt;
  }
}

const agents = Object.keys(results).sort();
const header = ["Agent", ...alphas.map(a => `α=${a}`)].join("\t");
console.log(header);
for (const id of agents) {
  const row = [id, ...alphas.map(a => (results[id]![a] ?? 0).toFixed(2))].join("\t");
  console.log(row);
}


