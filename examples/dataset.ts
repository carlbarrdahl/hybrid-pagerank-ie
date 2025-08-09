import type { Node, Edge, Config } from "../src/index";

// Shared OSS presentation dataset used by multiple experiments and docs

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

export const nodes: Node[] = [...agents, ...artifacts, ...outcomes];

export const edges: Edge[] = [
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

export const config: Partial<Config> = {
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

export default { nodes, edges, config };


