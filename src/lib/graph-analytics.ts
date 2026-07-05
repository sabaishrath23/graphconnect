export type Edge = { source: string; target: string; weight?: number };

export interface Analytics {
  nodeCount: number;
  edgeCount: number;
  density: number;
  degree: Record<string, number>;
  closeness: Record<string, number>;
  betweenness: Record<string, number>;
  topDegree: Array<[string, number]>;
  topBetweenness: Array<[string, number]>;
  topCloseness: Array<[string, number]>;
}

export function buildAdjacency(nodes: string[], edges: Edge[]) {
  const adj = new Map<string, Set<string>>();
  nodes.forEach((n) => adj.set(n, new Set()));
  for (const e of edges) {
    if (!adj.has(e.source)) adj.set(e.source, new Set());
    if (!adj.has(e.target)) adj.set(e.target, new Set());
    adj.get(e.source)!.add(e.target);
    adj.get(e.target)!.add(e.source);
  }
  return adj;
}

function bfsShortest(adj: Map<string, Set<string>>, src: string) {
  const dist = new Map<string, number>();
  const prev = new Map<string, string[]>();
  const sigma = new Map<string, number>();
  for (const n of adj.keys()) {
    dist.set(n, -1);
    prev.set(n, []);
    sigma.set(n, 0);
  }
  dist.set(src, 0);
  sigma.set(src, 1);
  const queue: string[] = [src];
  const order: string[] = [];
  while (queue.length) {
    const v = queue.shift()!;
    order.push(v);
    for (const w of adj.get(v) ?? []) {
      if (dist.get(w) === -1) {
        dist.set(w, dist.get(v)! + 1);
        queue.push(w);
      }
      if (dist.get(w) === dist.get(v)! + 1) {
        sigma.set(w, sigma.get(w)! + sigma.get(v)!);
        prev.get(w)!.push(v);
      }
    }
  }
  return { dist, prev, sigma, order };
}

export function analyze(nodes: string[], edges: Edge[]): Analytics {
  const uniqueNodes = Array.from(new Set([...nodes, ...edges.flatMap((e) => [e.source, e.target])]));
  const adj = buildAdjacency(uniqueNodes, edges);
  const n = uniqueNodes.length;

  const degree: Record<string, number> = {};
  for (const v of uniqueNodes) degree[v] = adj.get(v)?.size ?? 0;

  const closeness: Record<string, number> = {};
  const betweenness: Record<string, number> = {};
  for (const v of uniqueNodes) betweenness[v] = 0;

  for (const s of uniqueNodes) {
    const { dist, prev, sigma, order } = bfsShortest(adj, s);
    // closeness
    let sumD = 0;
    let reachable = 0;
    for (const [w, d] of dist) {
      if (w !== s && d > 0) {
        sumD += d;
        reachable++;
      }
    }
    closeness[s] = sumD > 0 ? reachable / sumD : 0;

    // betweenness accumulation (Brandes)
    const delta = new Map<string, number>();
    for (const v of uniqueNodes) delta.set(v, 0);
    for (let i = order.length - 1; i >= 0; i--) {
      const w = order[i];
      for (const v of prev.get(w) ?? []) {
        delta.set(v, delta.get(v)! + (sigma.get(v)! / sigma.get(w)!) * (1 + delta.get(w)!));
      }
      if (w !== s) betweenness[w] += delta.get(w)!;
    }
  }
  // undirected: divide by 2
  for (const v of uniqueNodes) betweenness[v] = betweenness[v] / 2;

  const density = n > 1 ? (2 * edges.length) / (n * (n - 1)) : 0;

  const top = (rec: Record<string, number>) =>
    Object.entries(rec).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return {
    nodeCount: n,
    edgeCount: edges.length,
    density,
    degree,
    closeness,
    betweenness,
    topDegree: top(degree),
    topBetweenness: top(betweenness),
    topCloseness: top(closeness),
  };
}
