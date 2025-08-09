import { AttributionEngine } from "../src";
import type { Node, Edge, Config } from "../src";

const nodes: Node[] = [
  { id: "alice", type: "agent" },
  { id: "bob", type: "agent" },
  { id: "library", type: "artifact" },
  { id: "downloads", type: "outcome" },
];

const edges: Edge[] = [
  { from: "alice", to: "library", type: "creates", weight: 1.0 },
  { from: "bob", to: "library", type: "creates", weight: 0.5 },
  { from: "downloads", to: "library", type: "generates", weight: 500 * 0.1 },
];

const config: Partial<Config> = {
  alpha: 0.5, // blend forward vs. reverse (0..1)
  damping: 0.85, // PageRank damping
  weights: {
    edges: { creates: 1.0, depends: 1.0, generates: 1.0 },
    nodesByType: { agent: 1.0, artifact: 1.0, outcome: 1.0 },
  },
};

const engine = new AttributionEngine(config);
const scores = engine.evaluate(nodes, edges); // agent → hybrid score
const reward = engine.reward(scores, 1000); // normalize to a pool

// Pretty-print results
const sortedScores = Object.entries(scores).sort(([, a], [, b]) => b - a);
console.log("Scores:");
for (const [agent, s] of sortedScores) console.log(`${agent.padEnd(6)} ${s.toFixed(6)}`);

console.log("\nReward (pool=1000):");
for (const [agent, amt] of sortedScores)
  console.log(`${agent.padEnd(6)} ${(reward[agent] ?? 0).toFixed(2)}`);
