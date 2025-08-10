### Hybrid PageRank Impact Evaluator

A TypeScript implementation of a hybrid attribution algorithm that blends forward PageRank (structural influence) with reverse personalized PageRank (credit propagation from outcomes) on Agent–Artifact–Outcome graphs.

- **Bidirectional attribution**: forward structure + reverse outcome credit
- **Configurable**: per-edge and per-node weights, α balance, normalization
- **Auditable**: explicit paths of influence; see `paper.md` for details

### Install

Requires Bun (or Node).

```bash
bun install
```

### Quick start (TypeScript)

```ts
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
  { from: "downloads", to: "library", type: "generates", weight: 10.0 },
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
const scores = engine.evaluate(nodes, edges);
const reward = engine.reward(scores, 1000);
```

Example output (values may vary with configuration):

```text
Scores:
alice  0.169954
bob    0.123145

Reward (pool=1000):
alice  579.85
bob    420.15

```

```mermaid
flowchart LR
  %% Subgraph: Agents and Contributions
  subgraph Agents["Contributions"]
    Alice["Alice<br/>(agent)"]
    Bob["Bob<br/>(agent)"]
  end

  %% Subgraph: Outcomes and Value
  subgraph Outcomes["Value & Impact"]
    Downloads["Downloads<br/>(10.0)"]
  end

  %% Artifact
  Library["Library"]

  %% Forward flows (solid lines)
  Alice -- "creates (1.0)" --> Library
  Bob -- "creates (0.5)" --> Library
  Downloads -- "generates (10.0)" --> Library

  %% Reverse credit flows (dotted)
  Library -.->|"$579.85 credits"| Alice
  Library -.->|"$420.15 credits"| Bob

  %% Styling
  classDef agent fill:#e1f5fe,stroke:#01579b
  classDef artifact fill:#f3e5f5,stroke:#4a148c
  classDef outcome fill:#f1f8e9,stroke:#33691e
  classDef subgraph_style fill:#fff,stroke:#999,stroke-width:2px

  class Alice,Bob agent
  class Library artifact
  class Downloads outcome
```

### Run the included example

An OSS-flavored dataset with α-sensitivity is provided in `examples/oss.ts`.

```bash
bun run examples/oss.ts
```

This prints sorted agent scores, a reward split, and a small α sweep.

#### $5,000 grant allocation + counterfactuals

A focused script allocates a $5,000 pool and reports a counterfactual where the grant outcome is removed to show attribution via that channel.

```bash
bun run examples/grant.ts
```

It prints the payout table and a Δ column vs. the “no grant” counterfactual, indicating how much of each agent’s payout is due to the grant edges.

- Read the full explainer and see charts in [docs/grant.md](docs/grant.md).

#### α sweep (structure vs. outcomes)

Explore how the hybrid balance α shifts attribution between forward structure and reverse outcome credit. The script computes payouts at multiple α values.

```bash
bun run examples/alpha-sweep.ts
```

- Read the short explainer in [docs/alpha-sweep.md](docs/alpha-sweep.md).

#### Sample output

See the full dataset chart and output in `docs/oss.md`.

Numbers will vary with config, weights, and α.

### Full OSS graph with payouts

```mermaid
flowchart LR
  %% Subgraph: Agents
  subgraph Agents["Agents"]
    alice["Alice (Core Maintainer)"]
    bob["Bob (Systems Engineer)"]
    carol["Carol (Researcher)"]
    dana["Dana (Frontend Dev)"]
    eric["Eric (DevRel)"]
    irina["Irina (Infra/CI)"]
    community["Community Contributors"]
  end

  %% Subgraph: Outcomes and Value
  subgraph Outcomes["Outcomes & Value"]
    downloads["App Downloads (5e5×0.01)"]
    stars["GitHub Stars (6e4×0.1)"]
    citations["Citations (350)"]
    grant["Grant Award (200,000)"]
    bounty["Bug Bounties (20,000)"]
    award["Conf. Award (1)"]
  end

  %% Subgraph: Artifacts
  subgraph Artifacts["Artifacts"]
    llm_core["LLM Core Library"]
    vision_kit["Vision Kit"]
    data_pipeline["Data Pipeline"]
    web_app["Web App"]
    cli["CLI Tool"]
    docs["Documentation"]
    benchmarks["Benchmark Suite"]
    paper_arxiv["arXiv Paper"]
  end

  %% Contributions (Agents → Artifacts)
  alice -- "creates (12)" --> llm_core
  bob -- "creates (8)" --> data_pipeline
  carol -- "creates (6)" --> paper_arxiv
  dana -- "creates (7)" --> web_app
  eric -- "creates (10)" --> docs
  irina -- "creates (5)" --> benchmarks
  community -- "creates (9)" --> vision_kit

  %% Dependencies / Relations (Artifacts → Artifacts)
  web_app -- "depends (2.5)" --> llm_core
  web_app -- "depends (2.0)" --> vision_kit
  web_app -- "depends (2.0)" --> data_pipeline
  cli -- "depends (1.5)" --> llm_core
  vision_kit -- "depends (1.8)" --> llm_core
  benchmarks -- "depends (1.0)" --> llm_core
  benchmarks -- "depends (1.0)" --> vision_kit
  paper_arxiv -- "references (1.0)" --> benchmarks

  %% Outcomes → Artifact/Agent (valuation signals)
  downloads -- "generates (1.0)" --> web_app
  stars -- "generates (1.0)" --> llm_core
  stars -- "generates (1.0)" --> vision_kit
  citations -- "cites (1.0)" --> paper_arxiv
  grant -- "funds (0.6)" --> llm_core
  grant -- "funds (0.4)" --> data_pipeline
  bounty -- "funds (1.0)" --> benchmarks
  award -- "awards (1.0)" --> alice

  %% Reverse credit/payout edges (dotted) — labeled with reward split amounts
  web_app -.->|"$2963.21"| dana
  llm_core -.->|"$1876.53"| alice
  paper_arxiv -.->|"$1461.41"| carol
  data_pipeline -.->|"$1429.89"| bob
  vision_kit -.->|"$857.40"| community
  benchmarks -.->|"$742.70"| irina
  docs -.->|"$668.88"| eric

  %% Styling
  classDef agent fill:#e1f5fe,stroke:#01579b
  classDef artifact fill:#f3e5f5,stroke:#4a148c
  classDef outcome fill:#f1f8e9,stroke:#33691e
  classDef subgraph_style fill:#fff,stroke:#999,stroke-width:2px

  class alice,bob,carol,dana,eric,irina,community agent
  class llm_core,vision_kit,data_pipeline,web_app,cli,docs,benchmarks,paper_arxiv artifact
  class downloads,stars,citations,grant,bounty,award outcome
```

### Algorithm overview

- Build a forward directed graph from `nodes` and `edges` with configurable multipliers.
- Build a reverse graph that keeps edges originating from outcome nodes as-is, while reversing other edges to propagate credit upstream.
- Run PageRank on both graphs; seed reverse pass with a personalization vector over outcome nodes derived from outcome→\* edges (uniform if none).
- Combine for each agent id: $H(v) = \alpha\,F(v) + (1-\alpha)\,R(v)$.

See `paper.md` for background, rationale, and design choices.

### Visual overview

Simplified node types and flows:

```mermaid
graph LR
  A["Agent"] -->|creates| X["Artifact"]
  X -->|depends| Y["Artifact"]
  O["Outcome"] -->|generates/funds| Y
```

```mermaid
graph LR
    subgraph "Forward Attribution<br/>(Structural Importance)"
        AF1["Agent A"]
        AF2["Agent B"]
        ARF["Artifact"]
        OF["Outcome"]

        AF1 -->|creates| ARF
        AF2 -->|contributes| ARF
        ARF -->|generates| OF
    end

    subgraph "Reverse Attribution<br/>(Credit Propagation)"
        OR["Outcome"]
        ARR["Artifact"]
        AR1["Agent A"]
        AR2["Agent B"]

        OR -->|credits| ARR
        ARR -->|credits| AR1
        ARR -->|credits| AR2
    end

    subgraph "Hybrid Result"
        H["H(v) = α×F(v) + (1-α)×R(v)"]
    end

    OF -.->|"Forward Flow"| H
    OR -.->|"Reverse Flow"| H

    style AF1 fill:#ffd54f
    style AF2 fill:#ffd54f
    style ARF fill:#f8bbd9
    style OF fill:#a5d6a7
    style AR1 fill:#ffd54f
    style AR2 fill:#ffd54f
    style ARR fill:#f8bbd9
    style OR fill:#a5d6a7
    style H fill:#e1f5fe
```

See the OSS example chart and payouts in `docs/oss.md`.

### Configuration reference (`Config`)

- **alpha**: number in [0, 1] balancing forward vs. reverse.
- **damping**: PageRank damping factor.
- **normalization.edgeWeight**: `"none" | "perTypeSum" | "perSourceTypeSum" | "perTypeMax"` with optional `transform: "none" | "log1p"` and `epsilon`.
- **weights.edges**: record of multipliers by edge type (e.g., `creates`, `depends`, `funds`, `generates`, `awards`).
- **weights.nodesByType**: `{ agent, artifact, outcome }` multipliers.
- **weights.nodesById**: optional per-node overrides.

Only `agent` nodes receive hybrid scores; use `reward(scores, pool)` to normalize to a reward budget.

### Project layout

- `src/`: library code
  - `index.ts`: `AttributionEngine`, `Node`, `Edge`, `Config`
  - `pagerank-personaliization.ts`: PageRank with personalization support
- `examples/`: runnable example(s)
  - `oss.ts`: open‑source ecosystem example with α sensitivity
- `paper.md`: conceptual background and design notes

### Scripts

The repository uses Bun. You can run files directly, e.g. `bun run examples/oss.ts`.

### References

For a deeper dive, including model, configuration, and use cases, read `paper.md`.
