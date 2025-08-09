### α Extremes and Sweep

This experiment explores how the hybrid balance α shifts attribution between forward structural importance and reverse outcome credit. We compute payouts at α ∈ {0.0, 0.25, 0.5, 0.75, 1.0} on the OSS presentation graph with a $5,000 pool.

Baseline graph: `examples/grant.ts` (α=0.55). Numbers will vary with configuration and weights.

Run (copy into a temporary script or adapt `examples/alpha-sweep.ts`; the dataset lives in `examples/dataset.ts`):

```ts
import { AttributionEngine, type Node, type Edge } from "../src";
import base from "../examples/dataset"; // or inline nodes/edges/config from examples/grant.ts

const { nodes, edges, config } = base; // ensure config.weights are present
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

// Print compact table
const agents = Object.keys(results).sort();
const header = ["Agent", ...alphas.map(a => `α=${a}`)].join("\t");
console.log(header);
for (const id of agents) {
  const row = [id, ...alphas.map(a => (results[id]![a] ?? 0).toFixed(2))].join("\t");
  console.log(row);
}
```

#### Sample output

| Agent | α=0 | α=0.25 | α=0.5 | α=0.75 | α=1 |
|---|---:|---:|---:|---:|---:|
| alice | 672.83 | 789.94 | 912.93 | 1042.23 | 1178.35 |
| bob | 801.18 | 763.13 | 723.18 | 681.17 | 636.94 |
| carol | 834.36 | 788.63 | 740.60 | 690.10 | 636.94 |
| community | 198.47 | 300.05 | 406.72 | 518.87 | 636.94 |
| dana | 2415.44 | 2003.42 | 1570.75 | 1115.85 | 636.94 |
| eric | 0.00 | 147.56 | 302.51 | 465.43 | 636.94 |
| irina | 77.72 | 207.27 | 343.32 | 486.36 | 636.94 |

### Why this matters

- α=1 emphasizes forward structure; α=0 emphasizes outcome proximity. The sweep bounds governance choices between “reward foundational influence” and “reward realized value.”
- Flat rows imply robustness to α; steep rows indicate sensitivity and a need for explicit policy.

### Discussion

- **Use**: Establish default α via governance, then revisit periodically. Publish sweep plots to build shared intuition.
- **Risk**: Extreme α can hide contributions (α=1 ignores outcomes; α=0 ignores structure). Prefer mid‑range with sensitivity reporting.
- **Practice**: Pair with channel ablations to identify whether sensitivity comes from particular value signals.

### Example narrative

- A DAO wants to set α for a new public‑goods round. Infra teams argue for higher α (structure), app teams for lower α (outcomes). The sweep shows how payouts move across α, identifying a range that balances both camps.

### Why it’s important

- Makes a key governance knob legible. Instead of arguing in the abstract, communities can see the quantitative trade‑offs and converge on a defensible α with periodic re‑evaluation.

Interpretation:

- α=1 emphasizes structure (forward PageRank), favoring central creators and heavily depended-on artifacts.
- α=0 emphasizes outcomes (reverse personalized PageRank), favoring proximity to value signals (grants, downloads, awards).
- The sweep bounds each agent’s plausible payout under different governance choices about structure vs. outcomes.


