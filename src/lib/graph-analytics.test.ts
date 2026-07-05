import { describe, it, expect } from "vitest";
import { analyze, buildAdjacency, type Edge } from "./graph-analytics";

describe("graph-analytics", () => {
  it("builds an undirected adjacency list", () => {
    const edges: Edge[] = [
      { source: "a", target: "b" },
      { source: "b", target: "c" },
    ];
    const adj = buildAdjacency(["a", "b", "c"], edges);
    expect(adj.get("a")?.has("b")).toBe(true);
    expect(adj.get("b")?.has("a")).toBe(true);
    expect(adj.get("b")?.has("c")).toBe(true);
    expect(adj.get("c")?.has("b")).toBe(true);
  });

  it("computes basic metrics on a triangle", () => {
    // Triangle: fully connected 3-node graph
    const nodes = ["a", "b", "c"];
    const edges: Edge[] = [
      { source: "a", target: "b" },
      { source: "b", target: "c" },
      { source: "a", target: "c" },
    ];
    const r = analyze(nodes, edges);
    expect(r.nodeCount).toBe(3);
    expect(r.edgeCount).toBe(3);
    // density = 2*E / N*(N-1) = 6/6 = 1
    expect(r.density).toBeCloseTo(1, 5);
    // every node degree = 2
    expect(r.degree.a).toBe(2);
    expect(r.degree.b).toBe(2);
    expect(r.degree.c).toBe(2);
    // no bridge nodes in a triangle
    expect(r.betweenness.a).toBeCloseTo(0, 5);
    expect(r.betweenness.b).toBeCloseTo(0, 5);
    expect(r.betweenness.c).toBeCloseTo(0, 5);
  });

  it("identifies the center of a star graph as top bridge", () => {
    // Star: center 'x' connected to a,b,c,d
    const nodes = ["x", "a", "b", "c", "d"];
    const edges: Edge[] = [
      { source: "x", target: "a" },
      { source: "x", target: "b" },
      { source: "x", target: "c" },
      { source: "x", target: "d" },
    ];
    const r = analyze(nodes, edges);
    expect(r.degree.x).toBe(4);
    expect(r.topDegree[0][0]).toBe("x");
    expect(r.topBetweenness[0][0]).toBe("x");
    expect(r.topCloseness[0][0]).toBe("x");
  });

  it("computes closeness on a path graph", () => {
    // Path: a - b - c
    const r = analyze(
      ["a", "b", "c"],
      [
        { source: "a", target: "b" },
        { source: "b", target: "c" },
      ],
    );
    // middle node has higher closeness than endpoints
    expect(r.closeness.b).toBeGreaterThan(r.closeness.a);
    expect(r.closeness.b).toBeGreaterThan(r.closeness.c);
    // b lies on the shortest path between a and c → betweenness > 0
    expect(r.betweenness.b).toBeGreaterThan(0);
  });

  it("handles a disconnected graph without crashing", () => {
    const r = analyze(
      ["a", "b", "c", "d"],
      [
        { source: "a", target: "b" },
        { source: "c", target: "d" },
      ],
    );
    expect(r.nodeCount).toBe(4);
    expect(r.edgeCount).toBe(2);
    // closeness for isolated components should be finite (0 when unreachable)
    for (const v of Object.values(r.closeness)) {
      expect(Number.isFinite(v)).toBe(true);
    }
  });

  it("infers nodes from edge endpoints when nodes list is incomplete", () => {
    const r = analyze([], [{ source: "a", target: "b" }]);
    expect(r.nodeCount).toBe(2);
    expect(r.degree.a).toBe(1);
    expect(r.degree.b).toBe(1);
  });
});
