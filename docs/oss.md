### Open-Source Dataset

You’re allocating a $10,000 pool across contributors to an AI toolkit. You want a split that respects structural leverage (dependencies) and realized value (downloads, grants, awards).

What you’ll do
- Run the evaluator on the OSS presentation graph
- Inspect the payout split and why it looks that way
- Note what to tweak next (α, edge weights)

Run it
```bash
bun run examples/oss.ts
```

Source: `examples/oss.ts`. This diagram shows all nodes and edges in the OSS presentation dataset and the payout amounts (pool = 10,000) as dotted lines from artifacts to their creators.

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

Numbers will vary with config, weights, and α.

### What this chart shows

- **Node types**
  - **Agents**: people/teams who create artifacts.
  - **Artifacts**: outputs (libraries, apps, docs, papers).
  - **Outcomes**: value signals (downloads, stars, citations, grants, bounties, awards).

- **Forward edges (solid)**
  - **creates**: Agent → Artifact with effort weights.
  - **depends/references**: Artifact → Artifact showing structural leverage.
  - **generates/funds/cites/awards**: Outcome → Artifact/Agent injecting value.

- **Reverse edges (dotted payouts)**
  - Artifact -.-> Agent labeled with payout dollars from a 10,000 pool (hybrid PageRank result).

- **How value moves**
  - Outcomes feed value into specific artifacts/agents.
  - Dependencies pull credit upstream toward foundational artifacts.
  - Hybrid score combines forward structure with reverse value (α=0.55 here), then normalizes to the pool.

- **Why these payouts (intuition)**
  - Web App gets large Downloads and depends on multiple artifacts → strong credit to Dana.
  - LLM Core is heavily depended on, receives Stars and Grant, plus Alice’s Award → strong credit to Alice.
  - Data Pipeline, Vision Kit, Benchmarks, Docs inherit credit via dependencies and valuation edges → payouts to Bob, Community, Irina, Eric.

#### Sample output

```text
--- Presentation Dataset: Open-Source AI Toolkit ---
Nodes: 21, Edges: 23

Top Agents by Hybrid Score:
Dana (Frontend Dev)          0.052067
Alice (Core Maintainer)      0.032973
Carol (Researcher)           0.025679
Bob (Systems Engineer)       0.025125
Community Contributors       0.015065
Irina (Infra/CI)             0.013050
Eric (DevRel)                0.011753

Reward Split (pool=10,000):
Dana (Frontend Dev)          2963.21
Alice (Core Maintainer)      1876.53
Carol (Researcher)           1461.41
Bob (Systems Engineer)       1429.89
Community Contributors       857.40
Irina (Infra/CI)             742.70
Eric (DevRel)                668.88

Alpha Sensitivity:
Agent                       α=0       α=0.25    α=0.5     α=0.75    α=1
------------------------------------------------------------------------------
Dana (Frontend Dev)         0.089587  0.072532  0.055478  0.038423  0.021369
Alice (Core Maintainer)     0.024955  0.028599  0.032244  0.035888  0.039533
Carol (Researcher)          0.030946  0.028552  0.026157  0.023763  0.021369
Bob (Systems Engineer)      0.029715  0.027629  0.025542  0.023455  0.021369
Community Contributors      0.007361  0.010863  0.014365  0.017867  0.021369
Irina (Infra/CI)            0.002882  0.007504  0.012126  0.016747  0.021369
Eric (DevRel)               0.000000  0.005342  0.010684  0.016027  0.021369
```


