/**
 * Graphology Pagerank (with Personalization)
 * ===========================================
 *
 * Modified TypeScript implementation of the pagerank algorithm for graphology
 * to support a personalization vector, enabling biased random jumps.
 *
 * [Reference]:
 * Page, Lawrence; Brin, Sergey; Motwani, Rajeev and Winograd, Terry,
 * The PageRank citation ranking: Bringing order to the Web. 1999
 *
 * [Personalization Reference]:
 * Jeh, Glen, and Jennifer Widom. "Scaling personalized web search."
 * Proceedings of the 12th international conference on World Wide Web. 2003.
 */
import type Graph from 'graphology-types';
const isGraph = require('graphology-utils/is-graph');
const resolveDefaults = require('graphology-utils/defaults');
const WeightedNeighborhoodIndex =
  require('graphology-indices/neighborhood').WeightedNeighborhoodIndex;

/**
 * PageRank options interface
 */
interface PageRankOptions {
  personalization?: Record<string, number>;
  nodePagerankAttribute?: string;
  getEdgeWeight?: string;
  alpha?: number;
  maxIterations?: number;
  tolerance?: number;
}

/**
 * PageRank result type
 */
type PageRankResult = Record<string, number>;

/**
 * PageRank function interface
 */
interface PageRankFunction {
  (graph: Graph, options?: PageRankOptions): PageRankResult;
  assign: (graph: Graph, options?: PageRankOptions) => void;
}

/**
 * Defaults.
 */
const DEFAULTS: Required<Omit<PageRankOptions, 'personalization'>> = {
  nodePagerankAttribute: 'pagerank',
  getEdgeWeight: 'weight',
  alpha: 0.85,
  maxIterations: 100,
  tolerance: 1e-6
};

/**
 * Abstract function applying the pagerank algorithm to the given graph.
 *
 * @param  assign          - Should we assign the result to nodes.
 * @param  graph           - Target graph.
 * @param  options         - Options:
 * @param  options.personalization - A dictionary of nodes to their personalization value.
 * @param  options.nodePagerankAttribute - Name of the pagerank attribute to assign.
 * @param  options.getEdgeWeight - Name of the weight attribute.
 * @param  options.alpha         - Damping parameter.
 * @param  options.maxIterations - Maximum number of iterations to perform.
 * @param  options.tolerance     - Error tolerance when checking for convergence.
 * @return PageRankResult or undefined if assign is true
 */
function abstractPagerank(
  assign: boolean, 
  graph: Graph, 
  options?: PageRankOptions
): PageRankResult | undefined {
  if (!isGraph(graph))
    throw new Error(
      'graphology-metrics/centrality/pagerank: the given graph is not a valid graphology instance.'
    );

  const resolvedOptions = resolveDefaults(options, DEFAULTS) as Required<PageRankOptions>;

  const alpha = resolvedOptions.alpha;
  const maxIterations = resolvedOptions.maxIterations;
  const tolerance = resolvedOptions.tolerance;

  const pagerankAttribute = resolvedOptions.nodePagerankAttribute;

  const N = graph.order;
  let i: number, j: number, l: number, d: number;

  // If the graph is empty, there's nothing to do.
  if (N === 0) {
    if (assign) return;
    return {};
  }
  
  // -- START OF MODIFICATION --
  // Create the probability vector `p`
  const p = new Float64Array(N);
  const personalization = options?.personalization;

  if (personalization) {

    // A personalization vector was provided
    let personalizationSum = 0;
    const nodeKeys = graph.nodes();

    // Calculate sum for normalization
    nodeKeys.forEach((nodeKey: string) => {
      personalizationSum += personalization[nodeKey] || 0;
    });

    if (personalizationSum === 0) {
      throw new Error(
        'graphology-metrics/centrality/pagerank: The personalization vector sum cannot be 0.'
      );
    }
    
    // Create the normalized probability vector
    let k = 0;
    graph.forEachNode((nodeKey: string) => {
        p[k++] = (personalization[nodeKey] || 0) / personalizationSum;
    });

  } else {
    // Default to a uniform distribution
    const uniformP = 1 / N;
    for (i = 0; i < N; i++) {
      p[i] = uniformP;
    }
  }
  // -- END OF MODIFICATION --

  const index = new WeightedNeighborhoodIndex(graph, resolvedOptions.getEdgeWeight);
  let x = new Float64Array(graph.order);

  // Initialize ranks to the probability distribution
  for (i = 0; i < N; i++) {
    x[i] = p[i]!;
  }

  // Normalizing edge weights & indexing dangling nodes
  const normalizedEdgeWeights = new Float64Array(index.weights.length);
  const danglingNodes: number[] = [];

  for (i = 0; i < N; i++) {
    l = index.starts[i + 1];
    d = index.outDegrees[i];

    if (d === 0) danglingNodes.push(i);

    for (j = index.starts[i]; j < l; j++) {
      normalizedEdgeWeights[j] = index.weights[j] / d;
    }
  }

  // Power iterations
  let iteration = 0;
  let error = 0;
  let dangleSum: number, neighbor: number, xLast: Float64Array;
  let converged = false;

  while (iteration < maxIterations) {
    xLast = x;
    x = new Float64Array(graph.order);

    // Summing dangling nodes' ranks
    dangleSum = 0;
    for (i = 0, l = danglingNodes.length; i < l; i++)
      dangleSum += xLast[danglingNodes[i]!]!;

    dangleSum *= alpha;

    for (i = 0; i < N; i++) {
      l = index.starts[i + 1];

      // Flowing rank from neighbors
      for (j = index.starts[i]; j < l; j++) {
        neighbor = index.neighborhood[j];
        x[neighbor]! += alpha * xLast[i]! * normalizedEdgeWeights[j]!;
      }
      
      // -- START OF MODIFICATION --
      // Distributing dangling rank and random jump probability
      // This now uses the node-specific probability from vector `p`
      x[i]! += dangleSum * p[i]! + (1 - alpha) * p[i]!;
      // -- END OF MODIFICATION --
    }

    // Checking convergence
    error = 0;
    for (i = 0; i < N; i++) {
      error += Math.abs(x[i]! - xLast[i]!);
    }

    if (error < N * tolerance) {
      converged = true;
      break;
    }

    iteration++;
  }

  if (!converged)
    throw Error('graphology-metrics/centrality/pagerank: failed to converge.');

  if (assign) {
    index.assign(pagerankAttribute, x);
    return;
  }

  return index.collect(x);
}

/**
 * Exporting.
 */
const pagerank: PageRankFunction = abstractPagerank.bind(null, false) as PageRankFunction;
pagerank.assign = abstractPagerank.bind(null, true);

export default pagerank;
export type { PageRankOptions, PageRankResult, PageRankFunction };