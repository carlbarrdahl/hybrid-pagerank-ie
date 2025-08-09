import { AttributionEngine, type Node, type Edge, type Config } from "../src/index";

// $5,000 OSS grant allocation using the same graph as examples/oss.ts
// Includes a brief counterfactual: What if the grant outcome were absent?

// Agents
const agents: Node[] = [
  { id: "alice", type: "agent", metadata: { label: "Alice (Core Maintainer)" } },
  { id: "bob", type: "agent", metadata: { label: "Bob (Systems Engineer)" } },
  { id: "carol", type: "agent", metadata: { label: "Carol (Researcher)" } },
  { id: "dana", type: "agent", metadata: { label: "Dana (Frontend Dev)" } },
  { id: "eric", type: "agent", metadata: { label: "Eric (DevRel)" } },
  { id: "irina", type: "agent", metadata: { label: "Irina (Infra/CI)" } },
  { id: "community", type: "agent", metadata: { label: "Community Contributors" } },
];

// Artifacts
const artifacts: Node[] = [
  { id: "llm-core", type: "artifact", metadata: { label: "LLM Core Library" } },
  { id: "vision-kit", type: "artifact", metadata: { label: "Vision Kit" } },
  { id: "data-pipeline", type: "artifact", metadata: { label: "Data Pipeline" } },
  { id: "web-app", type: "artifact", metadata: { label: "Web App" } },
  { id: "cli", type: "artifact", metadata: { label: "CLI Tool" } },
  { id: "docs", type: "artifact", metadata: { label: "Documentation" } },
  { id: "benchmarks", type: "artifact", metadata: { label: "Benchmark Suite" } },
  { id: "paper-arxiv", type: "artifact", metadata: { label: "arXiv Paper" } },
];

// Outcomes (magnitudes tuned for presentation)
const outcomes: Node[] = [
  { id: "downloads", type: "outcome", metadata: { label: "App Downloads" }, weight: 500000 * 0.01 },
  { id: "stars", type: "outcome", metadata: { label: "GitHub Stars" }, weight: 60000 * 0.1 },
  { id: "citations", type: "outcome", metadata: { label: "Citations" }, weight: 350 },
  { id: "grant", type: "outcome", metadata: { label: "Grant Award" }, weight: 200000 },
  { id: "bounty", type: "outcome", metadata: { label: "Bug Bounties" }, weight: 20000 },
  { id: "award", type: "outcome", metadata: { label: "Conf. Award" }, weight: 1 },
];

const nodes: Node[] = [...agents, ...artifacts, ...outcomes];

// Edges
const edges: Edge[] = [
  // Contributions (Agents → Artifacts)
  { from: "alice", to: "llm-core", type: "creates", weight: 12 },
  { from: "bob", to: "data-pipeline", type: "creates", weight: 8 },
  { from: "carol", to: "paper-arxiv", type: "creates", weight: 6 },
  { from: "dana", to: "web-app", type: "creates", weight: 7 },
  { from: "eric", to: "docs", type: "creates", weight: 10 },
  { from: "irina", to: "benchmarks", type: "creates", weight: 5 },
  { from: "community", to: "vision-kit", type: "creates", weight: 9 },

  // Dependencies / Relations (Artifacts → Artifacts)
  { from: "web-app", to: "llm-core", type: "depends", weight: 2.5 },
  { from: "web-app", to: "vision-kit", type: "depends", weight: 2.0 },
  { from: "web-app", to: "data-pipeline", type: "depends", weight: 2.0 },
  { from: "cli", to: "llm-core", type: "depends", weight: 1.5 },
  { from: "vision-kit", to: "llm-core", type: "depends", weight: 1.8 },
  { from: "benchmarks", to: "llm-core", type: "depends", weight: 1.0 },
  { from: "benchmarks", to: "vision-kit", type: "depends", weight: 1.0 },
  { from: "paper-arxiv", to: "benchmarks", type: "references", weight: 1.0 },

  // Outcome → Artifact/Agent (valuation signals)
  { from: "downloads", to: "web-app", type: "generates", weight: 1.0 },
  { from: "stars", to: "llm-core", type: "generates", weight: 1.0 },
  { from: "stars", to: "vision-kit", type: "generates", weight: 1.0 },
  { from: "citations", to: "paper-arxiv", type: "cites", weight: 1.0 },
  { from: "grant", to: "llm-core", type: "funds", weight: 0.6 },
  { from: "grant", to: "data-pipeline", type: "funds", weight: 0.4 },
  { from: "bounty", to: "benchmarks", type: "funds", weight: 1.0 },
  { from: "award", to: "alice", type: "awards", weight: 1.0 },
];

// Config tuned for presentation
const config: Partial<Config> = {
  alpha: 0.55,
  damping: 0.85,
  weights: {
    edges: {
      creates: 1.0,
      depends: 1.5,
      references: 1.2,
      generates: 1.0,
      cites: 1.3,
      funds: 2.0,
      awards: 2.5,
    },
    nodesByType: {
      agent: 1.0,
      artifact: 1.0,
      outcome: 1.1,
    },
    nodesById: {
      irina: 1.1,
    },
  },
};

const engine = new AttributionEngine(config);

function formatMoney(v: number): string {
  return `$${v.toFixed(2)}`;
}

function computeRewardSplit(nodes: Node[], edges: Edge[], pool: number) {
  const scores = engine.evaluate(nodes, edges);
  const reward = engine.reward(scores, pool);
  return { scores, reward } as const;
}

// Evaluate primary scenario (pool = $5,000)
const POOL = 5000;
const { scores, reward } = computeRewardSplit(nodes, edges, POOL);

// Prepare label lookup for printing
const agentNodes = nodes.filter((n) => n.type === "agent");
const agentLabel = (id: string) =>
  agentNodes.find((n) => n.id === id)?.metadata?.label || id;

// Sort helpers
const sortedScores = Object.entries(scores)
  .sort(([, a], [, b]) => b - a)
  .map(([agentId, s]) => [agentLabel(agentId), s] as const);

const sortedReward = Object.entries(reward)
  .sort(([, a], [, b]) => b - a)
  .map(([agentId, amt]) => [agentLabel(agentId), amt] as const);

console.log("--- $5,000 OSS Grant Allocation (Hybrid PageRank) ---");
console.log(`Nodes: ${nodes.length}, Edges: ${edges.length}, α=${config.alpha}`);
console.log("\nTop Agents by Hybrid Score:");
sortedScores.slice(0, 10).forEach(([label, s]) =>
  console.log(`${String(label).padEnd(28)} ${Number(s).toFixed(6)}`)
);
console.log("\nReward Split (pool=$5,000):");
sortedReward.slice(0, 10).forEach(([label, amt]) =>
  console.log(`${String(label).padEnd(28)} ${formatMoney(Number(amt))}`)
);

// Counterfactual: remove the grant outcome edges to ask "what if the grant had not been present?"
const edgesWithoutGrant = edges.filter((e) => e.from !== "grant" && e.to !== "grant");
const { reward: rewardNoGrant } = computeRewardSplit(nodes, edgesWithoutGrant, POOL);

// Compute differences per agent
const deltas = Object.keys(reward).reduce<Record<string, number>>((acc, agentId) => {
  acc[agentId] = (reward[agentId] || 0) - (rewardNoGrant[agentId] || 0);
  return acc;
}, {});

const sortedDelta = Object.entries(deltas)
  .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
  .map(([agentId, d]) => [agentLabel(agentId), d] as const);

console.log("\nCounterfactual (No Grant outcome): Δ payout vs. baseline");
sortedDelta.slice(0, 10).forEach(([label, d]) =>
  console.log(`${String(label).padEnd(28)} ${d >= 0 ? "+" : ""}${formatMoney(Number(d))}`)
);

console.log("\nNotes on counterfactuals:");
console.log(
  "- Removing the grant isolates how much of each agent's payout is attributable to the grant's valuation channel."
);
console.log(
  "- Other counterfactuals: set α=1 to ignore outcomes (pure structure), α=0 to fully weight outcomes; or dampen 'depends' weights to test infra leverage."
);


