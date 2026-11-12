/**
 * Layered ("Sugiyama-style") layout for small prerequisite graphs.
 * 1. Transitive reduction: an edge implied by a longer path is dropped, so the tree
 *    shows direct dependencies only (callers keep the full prerequisite lists).
 * 2. Layer = longest path from a root, so every edge points downwards.
 * 3. Edges spanning several layers get invisible waypoints on the layers in between;
 *    they take part in ordering and spacing, so long edges run between cards.
 * 4. Barycenter sweeps reorder each layer to reduce crossings.
 * 5. Nodes are centred under their parents without overlapping.
 * Pure and deterministic; cycles are tolerated by ignoring back edges.
 */

export interface LayoutNode {
  id: string;
  /** Initial ordering key (e.g. module order × 100 + lesson order). */
  order: number;
}
export interface LayoutEdge {
  from: string;
  to: string;
}
export interface PositionedNode {
  id: string;
  x: number;
  y: number;
  layer: number;
}
export interface RoutedEdge extends LayoutEdge {
  /** Waypoints (x = centre line, y = top and bottom of each intermediate layer band). */
  via: { x: number; y1: number; y2: number }[];
}
export interface LayoutOptions {
  nodeWidth: number;
  nodeHeight: number;
  gapX: number;
  gapY: number;
}
export interface LayoutResult {
  nodes: Map<string, PositionedNode>;
  edges: RoutedEdge[];
  width: number;
  height: number;
}

export const DEFAULT_LAYOUT: LayoutOptions = { nodeWidth: 184, nodeHeight: 60, gapX: 20, gapY: 64 };
const WAYPOINT_WIDTH = 10;
const WAYPOINT_GAP = 10;

/** Removes edges u→v that are implied by a longer path u→…→v. */
export function transitiveReduction(ids: string[], edges: LayoutEdge[]): LayoutEdge[] {
  const succ = new Map<string, string[]>(ids.map((id) => [id, []]));
  for (const e of edges) succ.get(e.from)?.push(e.to);
  const reachableAvoidingDirect = (from: string, to: string) => {
    const stack = (succ.get(from) ?? []).filter((n) => n !== to);
    const seen = new Set(stack);
    while (stack.length) {
      const n = stack.pop()!;
      if (n === to) return true;
      for (const m of succ.get(n) ?? []) {
        if (!seen.has(m)) {
          seen.add(m);
          stack.push(m);
        }
      }
    }
    return false;
  };
  return edges.filter((e) => !reachableAvoidingDirect(e.from, e.to));
}

export function layoutDag(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  opts: LayoutOptions = DEFAULT_LAYOUT,
): LayoutResult {
  const ids = new Set(nodes.map((n) => n.id));
  const order = new Map(nodes.map((n) => [n.id, n.order]));
  const sorted = [...nodes].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  const unique = new Map<string, LayoutEdge>();
  for (const e of edges)
    if (ids.has(e.from) && ids.has(e.to) && e.from !== e.to) unique.set(`${e.from}->${e.to}`, e);

  // Layering (longest path), dropping back edges that would close a cycle.
  const preds = new Map<string, string[]>(nodes.map((n) => [n.id, []]));
  for (const e of unique.values()) preds.get(e.to)!.push(e.from);
  const layer = new Map<string, number>();
  const visiting = new Set<string>();
  const acyclic: LayoutEdge[] = [];
  const layerOf = (id: string): number => {
    const known = layer.get(id);
    if (known !== undefined) return known;
    visiting.add(id);
    let l = 0;
    for (const p of preds.get(id)!) {
      if (visiting.has(p)) continue;
      l = Math.max(l, layerOf(p) + 1);
      acyclic.push({ from: p, to: id });
    }
    visiting.delete(id);
    layer.set(id, l);
    return l;
  };
  for (const n of sorted) layerOf(n.id);
  const kept = transitiveReduction(
    sorted.map((n) => n.id),
    acyclic,
  );

  // Waypoints for edges spanning several layers.
  const depth = Math.max(0, ...layer.values());
  const layers: string[][] = Array.from({ length: depth + 1 }, () => []);
  for (const n of sorted) layers[layer.get(n.id)!]!.push(n.id);
  const isWaypoint = new Set<string>();
  const chains = new Map<string, string[]>();
  const up = new Map<string, string[]>();
  const down = new Map<string, string[]>();
  const link = (a: string, b: string) => {
    (down.get(a) ?? down.set(a, []).get(a)!).push(b);
    (up.get(b) ?? up.set(b, []).get(b)!).push(a);
  };
  for (const id of ids) {
    up.set(id, []);
    down.set(id, []);
  }
  for (const e of kept) {
    const from = layer.get(e.from)!;
    const to = layer.get(e.to)!;
    const chain = [e.from];
    for (let l = from + 1; l < to; l++) {
      const w = `~${e.from}->${e.to}@${l}`;
      isWaypoint.add(w);
      up.set(w, []);
      down.set(w, []);
      order.set(w, order.get(e.from)!);
      layers[l]!.push(w);
      chain.push(w);
    }
    chain.push(e.to);
    for (let i = 1; i < chain.length; i++) link(chain[i - 1]!, chain[i]!);
    chains.set(`${e.from}->${e.to}`, chain);
  }

  // Barycenter sweeps.
  const position = () => {
    const pos = new Map<string, number>();
    for (const l of layers) l.forEach((id, i) => pos.set(id, i));
    return pos;
  };
  const sortBy = (l: string[], neighbours: Map<string, string[]>, pos: Map<string, number>) => {
    const key = new Map(
      l.map((id, i) => {
        const ns = neighbours.get(id)!.map((n) => pos.get(n)!);
        return [id, ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : i];
      }),
    );
    l.sort((a, b) => key.get(a)! - key.get(b)! || order.get(a)! - order.get(b)! || a.localeCompare(b));
  };
  for (let round = 0; round < 6; round++) {
    for (let i = 1; i < layers.length; i++) sortBy(layers[i]!, up, position());
    for (let i = layers.length - 2; i >= 0; i--) sortBy(layers[i]!, down, position());
  }

  // Coordinates as centres; waypoints are narrow.
  const width = (id: string) => (isWaypoint.has(id) ? WAYPOINT_WIDTH : opts.nodeWidth);
  const gap = (a: string, b: string) => (isWaypoint.has(a) || isWaypoint.has(b) ? WAYPOINT_GAP : opts.gapX);
  const centre = new Map<string, number>();
  layers.forEach((l, li) => {
    const desired = l.map((id, i) => {
      const ps = up.get(id)!;
      if (li === 0 || ps.length === 0) return i === 0 ? 0 : NaN;
      return ps.reduce((s, p) => s + centre.get(p)!, 0) / ps.length;
    });
    const placed: number[] = [];
    l.forEach((id, i) => {
      if (i === 0) {
        placed.push(Number.isNaN(desired[0]!) ? 0 : desired[0]!);
        return;
      }
      const min = placed[i - 1]! + (width(l[i - 1]!) + width(id)) / 2 + gap(l[i - 1]!, id);
      placed.push(Number.isNaN(desired[i]!) ? min : Math.max(desired[i]!, min));
    });
    const anchored = desired.map((d, i) => (Number.isNaN(d) ? placed[i]! : d));
    const shift =
      li === 0
        ? 0
        : anchored.reduce((a, b) => a + b, 0) / anchored.length -
          placed.reduce((a, b) => a + b, 0) / placed.length;
    l.forEach((id, i) => centre.set(id, placed[i]! + shift));
  });

  let minX = Infinity;
  let maxX = -Infinity;
  for (const [id, c] of centre) {
    minX = Math.min(minX, c - width(id) / 2);
    maxX = Math.max(maxX, c + width(id) / 2);
  }
  const band = opts.nodeHeight + opts.gapY;
  const positioned = new Map<string, PositionedNode>();
  for (const id of ids) {
    const l = layer.get(id)!;
    positioned.set(id, {
      id,
      x: Math.round(centre.get(id)! - opts.nodeWidth / 2 - minX),
      y: l * band,
      layer: l,
    });
  }
  const routed: RoutedEdge[] = kept.map((e) => ({
    ...e,
    via: chains
      .get(`${e.from}->${e.to}`)!
      .slice(1, -1)
      .map((w) => {
        const l = layers.findIndex((ls) => ls.includes(w));
        return { x: Math.round(centre.get(w)! - minX), y1: l * band, y2: l * band + opts.nodeHeight };
      }),
  }));
  return {
    nodes: positioned,
    edges: routed,
    width: Math.round(maxX - minX),
    height: (depth + 1) * band - opts.gapY,
  };
}
