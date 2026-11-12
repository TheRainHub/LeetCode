import { describe, expect, it } from "vitest";
import { DEFAULT_LAYOUT, layoutDag, transitiveReduction } from "./layout";

const n = (id: string, order = 0) => ({ id, order });
const W = DEFAULT_LAYOUT.nodeWidth;

describe("transitiveReduction", () => {
  it("drops edges implied by a longer path", () => {
    const edges = [
      { from: "complexity", to: "arrays" },
      { from: "arrays", to: "hashmap" },
      { from: "complexity", to: "hashmap" },
    ];
    expect(transitiveReduction(["complexity", "arrays", "hashmap"], edges)).toEqual(edges.slice(0, 2));
  });
});

describe("layoutDag", () => {
  const edges = [
    { from: "complexity", to: "arrays" },
    { from: "arrays", to: "hashmap" },
    { from: "complexity", to: "hashmap" },
    { from: "arrays", to: "two-pointers" },
    { from: "two-pointers", to: "sliding-window" },
    { from: "hashmap", to: "sliding-window" },
    { from: "complexity", to: "recursion" },
    { from: "recursion", to: "dp" },
    { from: "sliding-window", to: "dp" },
  ];
  const ids = ["complexity", "arrays", "recursion", "hashmap", "two-pointers", "sliding-window", "dp"];
  const r = layoutDag(
    ids.map((id, i) => n(id, i)),
    edges,
  );

  it("layers by longest path and keeps only direct dependencies", () => {
    for (const e of r.edges) expect(r.nodes.get(e.from)!.layer).toBeLessThan(r.nodes.get(e.to)!.layer);
    expect(r.nodes.get("hashmap")!.layer).toBe(2);
    expect(r.nodes.get("dp")!.layer).toBe(4);
    expect(r.edges.find((e) => e.from === "complexity" && e.to === "hashmap")).toBeUndefined();
  });

  it("routes long edges through waypoints on the layers in between", () => {
    const long = r.edges.find((e) => e.from === "recursion" && e.to === "dp")!;
    expect(long.via).toHaveLength(r.nodes.get("dp")!.layer - r.nodes.get("recursion")!.layer - 1);
    // Waypoints never sit inside a card on their layer.
    for (const w of long.via) {
      for (const node of r.nodes.values()) {
        if (node.y !== w.y1) continue;
        expect(w.x <= node.x || w.x >= node.x + W).toBe(true);
      }
    }
  });

  it("never overlaps cards within a layer and fits the reported width", () => {
    const byLayer = new Map<number, number[]>();
    for (const p of r.nodes.values()) byLayer.set(p.layer, [...(byLayer.get(p.layer) ?? []), p.x]);
    for (const xs of byLayer.values()) {
      xs.sort((a, b) => a - b);
      for (let i = 1; i < xs.length; i++)
        expect(xs[i]! - xs[i - 1]!).toBeGreaterThanOrEqual(W + DEFAULT_LAYOUT.gapX - 1);
    }
    for (const p of r.nodes.values()) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x + W).toBeLessThanOrEqual(r.width + 1);
    }
  });

  it("tolerates cycles and unknown nodes", () => {
    const c = layoutDag(
      [n("a"), n("b")],
      [
        { from: "a", to: "b" },
        { from: "b", to: "a" },
        { from: "a", to: "missing" },
      ],
    );
    expect(c.nodes.size).toBe(2);
    expect(c.edges).toHaveLength(1);
  });
});
