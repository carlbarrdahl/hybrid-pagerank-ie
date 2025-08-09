import Graph, { DirectedGraph } from "graphology";
import pagerank from "./pagerank-personaliization";
import type { PageRankOptions } from "./pagerank-personaliization";

type NodeType = "agent" | "artifact" | "outcome";
type EdgeType = string; // 'creates' | 'depends' | 'generates' | 'achieves';

type Node = {
  id: string; // Unique identifier
  type: NodeType;
  timestamp?: number; // Optional creation time
  weight?: number; // Node importance
  context?: string; // Domain classification
  metadata?: { [key: string]: any };
};

type Edge = {
  from: string; // Source node ID
  to: string; // Target node ID
  type: EdgeType; // Edge type (creation, dependency, etc.) - these are generic and up to the graph designer to define
  timestamp?: number; // Optional relationship time
  weight?: number; // Quantitative value (downloads, votes)
  confidence?: number; // Confidence value (0.0-1.0)
  context?: string; // Additional context
  metadata?: { [key: string]: any };
};

type Config = {
  alpha: number; // Forward/reverse balance [0,1]
  damping: number; // PageRank damping factor
  normalization?: {
    // How to normalize raw edge.weight values before applying multipliers
    // none: use raw edge.weight
    // perTypeSum: divide by sum of weights for each edge.type across the whole graph
    // perSourceTypeSum: divide by sum of weights for each (edge.from, edge.type)
    // perTypeMax: divide by max weight per edge.type
    edgeWeight?: "none" | "perTypeSum" | "perSourceTypeSum" | "perTypeMax";
    // Optional transformation applied to raw edge.weight before normalization
    transform?: "none" | "log1p";
    // Small constant to avoid division by zero
    epsilon?: number;
  };
  weights: {
    edges: {
      [edgeType: string]: number; // Multiplier per edge type
    };
    nodesByType: {
      agent: number; // Multiplier for agent nodes
      artifact: number; // Multiplier for artifact nodes
      outcome: number; // Multiplier for outcome nodes
    };
    nodesById?: {
      [nodeId: string]: number; // Specific node multipliers
    };
  };
};

class AttributionEngine {
  private config: Config;
  private nodeMultiplier(n?: Node): number {
    if (!n) return 1;
    const typeMultiplier = this.config.weights.nodesByType[n.type] || 1;
    const idMultiplier = this.config.weights.nodesById?.[n.id] || 1;
    const nodeWeight = n.weight ?? 1;
    return typeMultiplier * idMultiplier * nodeWeight;
  }

  constructor(config: Partial<Config> = {}) {
    const defaultConfig: Config = {
      alpha: 0.5,
      damping: 0.85,
      normalization: {
        edgeWeight: "perTypeSum",
        transform: "none",
        epsilon: 1e-12,
      },
      weights: {
        edges: {},
        nodesByType: {
          agent: 1.0,
          artifact: 1.0,
          outcome: 1.0,
        },
        nodesById: {},
      },
    };

    // Deep merge the provided config with defaults
    this.config = {
      ...defaultConfig,
      ...config,
      weights: {
        ...defaultConfig.weights,
        ...(config.weights || {}),
        edges: {
          ...defaultConfig.weights.edges,
          ...(config.weights?.edges || {}),
        },
        nodesByType: {
          ...defaultConfig.weights.nodesByType,
          ...(config.weights?.nodesByType || {}),
        },
        nodesById: {
          ...defaultConfig.weights.nodesById,
          ...(config.weights?.nodesById || {}),
        },
      },
    };
  }

  evaluate(nodes: Node[], edges: Edge[]): Record<string, number> {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    // Pre-compute normalized edge.weight values according to config
    const normalizedEdgeValues = this.computeNormalizedEdgeValues(edges);

    // Build forward graph (for structural importance)
    const forwardGraph = this.buildGraph(nodes, edges);

    // Build reverse graph (for credit attribution from outcomes)
    const reverseGraph = this.buildReverseGraph(
      nodes,
      edges,
      nodeMap,
      normalizedEdgeValues
    );

    // 1. Compute Forward PageRank (standard)
    const forwardScores = pagerank(forwardGraph, {
      alpha: this.config.damping,
      getEdgeWeight: "weight",
    });

    // 2. Compute Reverse PageRank (personalized from outcomes)
    const personalization = this.getOutcomePersonalization(
      nodes,
      edges,
      nodeMap,
      normalizedEdgeValues
    );
    const reverseOptions: PageRankOptions = {
      alpha: this.config.damping,
      getEdgeWeight: "weight",
      ...(Object.keys(personalization).length > 0 ? { personalization } : {}),
    };
    const reverseScores = pagerank(reverseGraph, reverseOptions);

    // 3. Combine with hybrid formula: H(v) = α·F(v) + (1-α)·R(v)
    const hybridScores: Record<string, number> = {};

    for (const node of nodes) {
      if (node.type === "agent") {
        const forward = forwardScores[node.id] || 0;
        const reverse = reverseScores[node.id] || 0;
        hybridScores[node.id] =
          this.config.alpha * forward + (1 - this.config.alpha) * reverse;
      }
    }

    return hybridScores;
  }

  reward(
    scores: Record<string, number>,
    pool: number = 1
  ): Record<string, number> {
    const totalScore = Object.values(scores).reduce(
      (sum, score) => sum + score,
      0
    );

    if (totalScore === 0) {
      return scores; // Avoid division by zero
    }

    const normalizedScores: Record<string, number> = {};
    for (const [agent, score] of Object.entries(scores)) {
      normalizedScores[agent] = (score / totalScore) * pool;
    }

    return normalizedScores;
  }

  /**
   * Creates a personalization vector where weight is concentrated on outcome nodes,
   * proportional to the value they generate.
   */
  private getOutcomePersonalization(
    nodes: Node[],
    edges: Edge[],
    nodeMap: Map<string, Node>,
    normalizedEdgeValues: number[]
  ): Record<string, number> {
    const personalization: Record<string, number> = {};
    const outcomeNodes = nodes.filter((n) => n.type === "outcome");

    if (outcomeNodes.length === 0) {
      return {};
    }

    for (let i = 0; i < edges.length; i++) {
      const edge = edges[i]!;
      const fromNode = nodeMap.get(edge.from);
      // Find edges that represent value generation from an outcome
      if (fromNode && fromNode.type === "outcome") {
        const normalized = normalizedEdgeValues[i] ?? (edge.weight ?? 1.0);
        const base =
          normalized *
          (edge.confidence ?? 1.0) *
          (this.config.weights.edges[edge.type] || 1.0);
        const seedWeight = base * this.nodeMultiplier(fromNode);
        personalization[edge.from] =
          (personalization[edge.from] || 0) + seedWeight;
      }
    }

    // If no 'generates' edges, use a uniform distribution over outcomes
    if (Object.keys(personalization).length === 0) {
      for (const node of outcomeNodes) {
        personalization[node.id] = this.nodeMultiplier(node);
      }
    }

    return personalization;
  }

  private buildGraph(nodes: Node[], edges: Edge[]): DirectedGraph {
    const graph = new Graph({ multi: true});
    nodes.forEach((node) => graph.addNode(node.id, { ...node }));

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    const normalizedEdgeValues = this.computeNormalizedEdgeValues(edges);

    edges.forEach((edge, i) => {
      const fromNode = nodeMap.get(edge.from);
      const toNode = nodeMap.get(edge.to);
      const normalized = normalizedEdgeValues[i] ?? (edge.weight ?? 1.0);
      const baseWeight =
        normalized *
        (edge.confidence ?? 1.0) *
        (this.config.weights.edges[edge.type] || 1.0);
      const weight =
        baseWeight *
        this.nodeMultiplier(fromNode) *
        this.nodeMultiplier(toNode);
      graph.addEdge(edge.from, edge.to, { type: edge.type, weight });
    });
    return graph;
  }

  private buildReverseGraph(
    nodes: Node[],
    edges: Edge[],
    nodeMap: Map<string, Node>,
    normalizedEdgeValues: number[]
  ): DirectedGraph {
    const graph = new Graph({ multi: true});
    nodes.forEach((node) => graph.addNode(node.id, { ...node }));

    edges.forEach((edge, i) => {
      const fromNode = nodeMap.get(edge.from);
      const toNode = nodeMap.get(edge.to);
      const normalized = normalizedEdgeValues[i] ?? (edge.weight ?? 1.0);
      const baseWeight =
        normalized *
        (edge.confidence ?? 1.0) *
        (this.config.weights.edges[edge.type] || 1.0);
      const weight =
        baseWeight *
        this.nodeMultiplier(fromNode) *
        this.nodeMultiplier(toNode);

      // Reverse edges that are not from an outcome node (i.e., structural edges)
      if (fromNode && fromNode.type !== "outcome") {
        graph.addEdge(edge.to, edge.from, { type: edge.type, weight });
      } else {
        // Keep value-flow edges as is (e.g., `generates`)
        graph.addEdge(edge.from, edge.to, { type: edge.type, weight });
      }
    });

    return graph;
  }

  private computeNormalizedEdgeValues(edges: Edge[]): number[] {
    const mode = this.config.normalization?.edgeWeight || "perTypeSum";
    const transform = this.config.normalization?.transform || "none";
    const epsilon = this.config.normalization?.epsilon ?? 1e-12;

    // Prepare structures
    const values = new Array<number>(edges.length);

    // Pre-transform all raw weights
    const rawVals = edges.map((e) => {
      const w = e.weight ?? 1.0;
      const wt = transform === "log1p" ? Math.log1p(Math.max(0, w)) : w;
      return wt;
    });

    if (mode === "none") return rawVals;

    if (mode === "perTypeSum" || mode === "perTypeMax") {
      const byTypeSum = new Map<string, number>();
      const byTypeMax = new Map<string, number>();
      for (let i = 0; i < edges.length; i++) {
        const t = edges[i]!.type;
        const v = rawVals[i]!;
        byTypeSum.set(t, (byTypeSum.get(t) || 0) + v);
        byTypeMax.set(t, Math.max(byTypeMax.get(t) || 0, v));
      }
      for (let i = 0; i < edges.length; i++) {
        const t = edges[i]!.type;
        const denom =
          mode === "perTypeSum"
            ? (byTypeSum.get(t) || 0) + epsilon
            : (byTypeMax.get(t) || 0) + epsilon;
        values[i] = rawVals[i]! / denom;
      }
      return values;
    }

    if (mode === "perSourceTypeSum") {
      const bySourceTypeSum = new Map<string, number>();
      const keyOf = (e: Edge) => `${e.from}__${e.type}`;
      for (let i = 0; i < edges.length; i++) {
        const k = keyOf(edges[i]!);
        bySourceTypeSum.set(k, (bySourceTypeSum.get(k) || 0) + rawVals[i]!);
      }
      for (let i = 0; i < edges.length; i++) {
        const k = keyOf(edges[i]!);
        const denom = (bySourceTypeSum.get(k) || 0) + epsilon;
        values[i] = rawVals[i]! / denom;
      }
      return values;
    }

    // Fallback
    return rawVals;
  }
}

// Export for library usage
export { AttributionEngine, type Node, type Edge, type Config };
