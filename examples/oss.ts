import { AttributionEngine, type Node, type Edge, type Config } from '../src/index';

// Presentation dataset: Open-source AI toolkit ecosystem
// Aligns with paper §5.1 (Open source software)
/*
Motivation
---------
This example instantiates the graph schema and weighting choices described in the paper
§3.1–§3.3 and the OSS use case in §5.1. Inline notes explain why nodes, edges, and
configuration values were chosen, so readers can trace how α blends forward structure
with reverse outcome credit and how weights express value judgments that communities
can govern.
*/

// Agents
const agents: Node[] = [
  { id: 'alice', type: 'agent', metadata: { label: 'Alice (Core Maintainer)' } },
  { id: 'bob', type: 'agent', metadata: { label: 'Bob (Systems Engineer)' } },
  { id: 'carol', type: 'agent', metadata: { label: 'Carol (Researcher)' } },
  { id: 'dana', type: 'agent', metadata: { label: 'Dana (Frontend Dev)' } },
  { id: 'eric', type: 'agent', metadata: { label: 'Eric (DevRel)' } },
  { id: 'irina', type: 'agent', metadata: { label: 'Irina (Infra/CI)' } },
  { id: 'community', type: 'agent', metadata: { label: 'Community Contributors' } },
];

// Artifacts
const artifacts: Node[] = [
  { id: 'llm-core', type: 'artifact', metadata: { label: 'LLM Core Library' } },
  { id: 'vision-kit', type: 'artifact', metadata: { label: 'Vision Kit' } },
  { id: 'data-pipeline', type: 'artifact', metadata: { label: 'Data Pipeline' } },
  { id: 'web-app', type: 'artifact', metadata: { label: 'Web App' } },
  { id: 'cli', type: 'artifact', metadata: { label: 'CLI Tool' } },
  { id: 'docs', type: 'artifact', metadata: { label: 'Documentation' } },
  { id: 'benchmarks', type: 'artifact', metadata: { label: 'Benchmark Suite' } },
  { id: 'paper-arxiv', type: 'artifact', metadata: { label: 'arXiv Paper' } },
];

// Outcomes (paper §3.1 schema; §3.2 configurable weighting)
// Rationale for magnitudes:
// - downloads: large but noisy demand signal → strong downscale (×0.01)
// - stars: social signal → downscale (×0.1)
// - citations: research value → moderate absolute weight
// - grant/bounty: realized monetary value → large absolute weights
// - award: direct agent-level attribution → unit weight; amplified via edge type later
const outcomes: Node[] = [
  { id: 'downloads', type: 'outcome', metadata: { label: 'App Downloads' }, weight: 500000* 0.01 },
  { id: 'stars', type: 'outcome', metadata: { label: 'GitHub Stars' }, weight: 60000 * 0.1 },
  { id: 'citations', type: 'outcome', metadata: { label: 'Citations' }, weight: 350 },
  { id: 'grant', type: 'outcome', metadata: { label: 'Grant Award' }, weight: 200000 },
  { id: 'bounty', type: 'outcome', metadata: { label: 'Bug Bounties' }, weight: 20000 },
  { id: 'award', type: 'outcome', metadata: { label: 'Conf. Award' }, weight: 1 },
];

const nodes: Node[] = [...agents, ...artifacts, ...outcomes];

// Edges
const edges: Edge[] = [
  // Contributions (Agents → Artifacts). Effort/ownership weights (paper §3.1).
  { from: 'alice', to: 'llm-core', type: 'creates', weight: 12 },
  { from: 'bob', to: 'data-pipeline', type: 'creates', weight: 8 },
  { from: 'carol', to: 'paper-arxiv', type: 'creates', weight: 6 },
  { from: 'dana', to: 'web-app', type: 'creates', weight: 7 },
  { from: 'eric', to: 'docs', type: 'creates', weight: 10 },
  { from: 'irina', to: 'benchmarks', type: 'creates', weight: 5 },
  { from: 'community', to: 'vision-kit', type: 'creates', weight: 9 },

  // Dependencies (Artifacts → Artifacts). Emphasize infrastructure leverage (paper §5.1);
  // weights indicate coupling strength; reverse pass will propagate credit upstream (paper §3.3).
  { from: 'web-app', to: 'llm-core', type: 'depends', weight: 2.5 },
  { from: 'web-app', to: 'vision-kit', type: 'depends', weight: 2.0 },
  { from: 'web-app', to: 'data-pipeline', type: 'depends', weight: 2.0 },
  { from: 'cli', to: 'llm-core', type: 'depends', weight: 1.5 },
  { from: 'vision-kit', to: 'llm-core', type: 'depends', weight: 1.8 },
  { from: 'benchmarks', to: 'llm-core', type: 'depends', weight: 1.0 },
  { from: 'benchmarks', to: 'vision-kit', type: 'depends', weight: 1.0 },
  { from: 'paper-arxiv', to: 'benchmarks', type: 'references', weight: 1.0 },

  // Outcome → Artifact/Agent edges (value signals). These are seeds for reverse personalized
  // PageRank (paper §3.3). Edge types distinguish valuation channels.
  { from: 'downloads', to: 'web-app', type: 'generates', weight: 1.0 },
  { from: 'stars', to: 'llm-core', type: 'generates', weight: 1.0 },
  { from: 'stars', to: 'vision-kit', type: 'generates', weight: 1.0 },
  { from: 'citations', to: 'paper-arxiv', type: 'cites', weight: 1.0 },
  { from: 'grant', to: 'llm-core', type: 'funds', weight: 0.6 }, // grant split reflects higher share to core lib
  { from: 'grant', to: 'data-pipeline', type: 'funds', weight: 0.4 },
  { from: 'bounty', to: 'benchmarks', type: 'funds', weight: 1.0 },
  { from: 'award', to: 'alice', type: 'awards', weight: 1.0 },
];

// Config tuned for presentation (emphasize dependencies and funding; modest outcome boost)
// Paper linkages: §3.2 (weighting) and §3.3 (hybrid α).
const config: Partial<Config> = {
  alpha: 0.55, // Slightly favor forward structure while keeping strong outcome sensitivity (§3.3)
  damping: 0.85, // Standard PageRank damping (§3.2)
  weights: {
    edges: {
      creates: 1.0,     // baseline effort/ownership signal
      depends: 1.5,     // elevate infrastructure leverage (§5.1, §6.1)
      references: 1.2,  // softer than academic cites
      generates: 1.0,   // neutral demand signal
      cites: 1.3,       // academic credit stronger than generic reference (§3.2)
      funds: 2.0,       // realized monetary value is high confidence (§3.2)
      awards: 2.5,      // direct agent credit; strongest single-edge signal (§3.3)
    },
    nodesByType: {
      agent: 1.0,
      artifact: 1.0,
      outcome: 1.1, // modestly boost realized value (§3.2)
    },
    nodesById: {
      // Example governance override: surface infrastructure/CI work visibility (§6.1 Advantages)
      irina: 1.1,
    },
  },
};

const engine = new AttributionEngine(config);
const scores = engine.evaluate(nodes, edges);
const reward = engine.reward(scores, 10000); // Reward implements GIE r: normalize to a pool (§4)

// Agent scores (sorted)
const agentNodes = nodes.filter(n => n.type === 'agent');
const agentLabel = (id: string) => agentNodes.find(n => n.id === id)?.metadata?.label || id;
const sortedScores = Object.entries(scores)
  .sort(([, a], [, b]) => b - a)
  .map(([agentId, s]) => [agentLabel(agentId), s]);

// Reward split
const sortedReward = Object.entries(reward)
  .sort(([, a], [, b]) => b - a)
  .map(([agentId, amt]) => [agentLabel(agentId), amt]);

// Sensitivity across α shows trade-off between structure and value (paper §3.3)
const alphas = [0.0, 0.25, 0.5, 0.75, 1.0];
const sensitivity: Record<string, Record<string, number>> = {};
for (const a of alphas) {
  const eng = new AttributionEngine({ ...config, alpha: a });
  const s = eng.evaluate(nodes, edges);
  for (const [agentId, val] of Object.entries(s)) {
    if (!sensitivity[agentId]) sensitivity[agentId] = {};
    sensitivity[agentId][`alpha_${a}`] = val;
  }
}

// Prepare sensitivity rows for console only
const sensitivityRows: (string | number)[][] = [];
for (const agentId of Object.keys(sensitivity)) {
  const label = agentLabel(agentId);
  const row = [label, ...alphas.map(a => sensitivity[agentId]?.[`alpha_${a}`] ?? 0)];
  sensitivityRows.push(row);
}

console.log('--- Presentation Dataset: Open-Source AI Toolkit ---');
console.log(`Nodes: ${nodes.length}, Edges: ${edges.length}`);
console.log('\nTop Agents by Hybrid Score:');
sortedScores.slice(0, 10).forEach(([label, s]) => console.log(`${String(label).padEnd(28)} ${Number(s).toFixed(6)}`));
console.log('\nReward Split (pool=10,000):');
sortedReward.slice(0, 10).forEach(([label, amt]) => console.log(`${String(label).padEnd(28)} ${Number(amt).toFixed(2)}`));
console.log('\nAlpha Sensitivity:');
const header = 'Agent'.padEnd(28) + alphas.map(a => `α=${a}`.padEnd(10)).join('');
console.log(header);
console.log('-'.repeat(header.length));
Object.keys(sensitivity)
  .sort((a, b) => (sensitivity[b]?.['alpha_0.5'] ?? 0) - (sensitivity[a]?.['alpha_0.5'] ?? 0))
  .forEach((agentId) => {
    const label = String(agentLabel(agentId)).padEnd(28);
    const vals = alphas
      .map((a) => (sensitivity[agentId]?.[`alpha_${a}`] ?? 0))
      .map((v) => Number(v).toFixed(6).padEnd(10));
    console.log(label + vals.join(''));
  });




