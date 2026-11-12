import { describe, expect, it } from "vitest";
import {
  type BoardComponent,
  type BoardEdge,
  type BoardNode,
  type EdgeTraffic,
  newComponent,
  parseBoard,
  type Traffic,
} from "./board";
import type { ComponentKind } from "./catalog";
import { checkBlocks, checkBoard } from "./checks";
import { describeBoard } from "./describe";
import { analyzeResilience, type Failures, simulate } from "./simulate";
import { TEMPLATE_KEYS, templateBoard } from "./templates";

const c = (id: string, kind: ComponentKind, over: Partial<BoardComponent> = {}): BoardComponent => ({
  ...newComponent(kind, id, { x: 0, y: 0 }, id),
  ...over,
});
const e = (source: string, target: string, traffic: EdgeTraffic = "all"): BoardEdge => ({
  id: `${source}>${target}`,
  source,
  target,
  traffic,
});
const T = (rps = 1000, readRatio = 0.9): Traffic => ({ rps, readRatio });
const run = (nodes: BoardNode[], edges: BoardEdge[], traffic = T(), failures: Failures = {}) =>
  simulate({ nodes, edges, traffic, failures });

/** client → load balancer → service (2 × 1000/s) → SQL primary (5000/s). */
const threeTier = () => ({
  nodes: [c("client", "client"), c("lb", "loadBalancer"), c("api", "service"), c("db", "sql")],
  edges: [e("client", "lb"), e("lb", "api"), e("api", "db")],
});

describe("simulate", () => {
  it("propagates demand, utilisation, latency and the throughput limit", () => {
    const { nodes, edges } = threeTier();
    const r = run(nodes, edges);
    expect(r.nodes.api!.demand).toBeCloseTo(1000);
    expect(r.nodes.api!.utilization).toBeCloseTo(0.5);
    expect(r.nodes.db!.utilization).toBeCloseTo(0.2);
    expect(r.nodes.api!.status).toBe("ok");
    expect(r.success.overall).toBeCloseTo(1);
    // 1/(1−0.01) + 20/(1−0.5) + 5/(1−0.2)
    expect(r.latency.reads).toBeCloseTo(1 / 0.99 + 40 + 6.25, 5);
    expect(r.limit).toEqual({ rps: expect.closeTo(2000, 5) as number, bottleneck: "api" });
    expect(r.edges["lb>api"]).toMatchObject({ reads: 900, async: false });
  });

  it("drops the excess when a component is overloaded and caps the latency multiplier", () => {
    const { nodes, edges } = threeTier();
    const r = run(nodes, edges, T(4000));
    expect(r.nodes.api!.status).toBe("overloaded");
    expect(r.nodes.api!.served).toBeCloseTo(0.5);
    expect(r.success.overall).toBeCloseTo(0.5);
    expect(r.nodes.api!.latencyMs).toBeCloseTo(20 / 0.05);
  });

  it("models cache-aside: hits shrink database reads, a dead cache sends every read to the database", () => {
    const nodes = [c("client", "client"), c("api", "service"), c("cache", "cache"), c("db", "sql")];
    const edges = [e("client", "api"), e("api", "cache"), e("api", "db")];
    const ok = run(nodes, edges);
    expect(ok.nodes.db!.reads).toBeCloseTo(180);
    expect(ok.nodes.db!.writes).toBeCloseTo(100);
    expect(ok.nodes.cache!.reads).toBeCloseTo(900);
    const dead = run(nodes, edges, T(), { cache: "down" });
    expect(dead.nodes.db!.reads).toBeCloseTo(900);
    expect(dead.success.reads).toBeCloseTo(1);
  });

  it("sends SQL writes to the primary and spreads reads over replicas and shards", () => {
    const one = run([c("client", "client"), c("db", "sql", { replicas: 3 })], [e("client", "db")]);
    expect(one.nodes.db!.utilization).toBeCloseTo((100 + 900 / 3) / 5000);
    const sharded = run(
      [c("client", "client"), c("db", "sql", { replicas: 3, shards: 2 })],
      [e("client", "db")],
    );
    expect(sharded.nodes.db!.utilization).toBeCloseTo((50 + 900 / 6) / 5000);
  });

  it("lets a load balancer route around a dead target, while a direct dependency fails", () => {
    const nodes = [c("client", "client"), c("lb", "loadBalancer"), c("a", "service"), c("b", "service")];
    const edges = [e("client", "lb"), e("lb", "a"), e("lb", "b")];
    const r = run(nodes, edges, T(), { a: "down" });
    expect(r.nodes.b!.demand).toBeCloseTo(1000);
    expect(r.success.overall).toBeCloseTo(1);
    const direct = run([c("client", "client"), c("a", "service")], [e("client", "a")], T(), { a: "down" });
    expect(direct.success.overall).toBe(0);
    expect(direct.latency.reads).toBeNull();
  });

  it("fails only the requests that need a dead dependency", () => {
    const nodes = [c("client", "client"), c("api", "service"), c("db", "nosql"), c("q", "queue")];
    const edges = [e("client", "api"), e("api", "db"), e("api", "q", "writes")];
    const r = run(nodes, edges, T(), { q: "down" });
    expect(r.success.reads).toBeCloseTo(1);
    expect(r.success.writes).toBe(0);
    expect(r.success.overall).toBeCloseTo(0.9);
  });

  it("keeps async work out of the request path but reports queue backlog", () => {
    const nodes = [c("client", "client"), c("api", "service"), c("q", "queue"), c("w", "worker")];
    const edges = [e("client", "api"), e("api", "q", "writes"), e("q", "w")];
    const r = run(nodes, edges, T(1000, 0.5));
    expect(r.edges["q>w"]!.async).toBe(true);
    expect(r.nodes.w!.utilization).toBeCloseTo(500 / 400);
    expect(r.success.writes).toBeCloseTo(1);
    expect(r.backlogs).toEqual([
      { queueId: "q", consumerId: "w", inflow: 500, growth: expect.closeTo(100, 5) as number },
    ]);
    const noConsumer = run(nodes, edges.slice(0, 2), T(1000, 0.5));
    expect(noConsumer.backlogs).toEqual([{ queueId: "q", consumerId: null, inflow: 500, growth: 500 }]);
  });

  it("serves CDN hits at the edge and treats arrows out of a store as change data capture", () => {
    const nodes = [
      c("client", "client"),
      c("cdn", "cdn"),
      c("api", "service"),
      c("db", "sql"),
      c("idx", "search"),
    ];
    const edges = [e("client", "cdn"), e("cdn", "api"), e("api", "db"), e("db", "idx")];
    const r = run(nodes, edges);
    expect(r.nodes.api!.reads).toBeCloseTo(90);
    expect(r.nodes.api!.writes).toBeCloseTo(100);
    expect(r.nodes.idx!.reads).toBe(0);
    expect(r.nodes.idx!.writes).toBeCloseTo(100);
    expect(r.edges["db>idx"]!.async).toBe(true);
    const idxDown = run(nodes, edges, T(), { idx: "down" });
    expect(idxDown.success.overall).toBeCloseTo(1);
  });

  it("splits client traffic by what each arrow carries", () => {
    const nodes = [c("client", "client"), c("cdn", "cdn"), c("lb", "loadBalancer"), c("api", "service")];
    const edges = [e("client", "cdn", "reads"), e("client", "lb"), e("cdn", "lb"), e("lb", "api")];
    const r = run(nodes, edges);
    expect(r.edges["client>cdn"]).toMatchObject({ reads: 450, writes: 0 });
    expect(r.edges["client>lb"]!.reads).toBeCloseTo(450);
    expect(r.edges["client>lb"]!.writes).toBeCloseTo(100);
  });

  it("breaks loops instead of recursing forever", () => {
    const nodes = [c("client", "client"), c("a", "service"), c("b", "service")];
    const edges = [e("client", "a"), e("a", "b"), e("b", "a")];
    const r = run(nodes, edges);
    expect(r.ignoredEdges).toEqual(["b>a"]);
    expect(r.edges["b>a"]!.ignored).toBe(true);
    expect(r.nodes.b!.demand).toBeCloseTo(1000);
  });

  it("loses capacity when one instance fails", () => {
    const { nodes, edges } = threeTier();
    expect(run(nodes, edges, T(1500)).nodes.api!.status).toBe("hot");
    const r = run(nodes, edges, T(1500), { api: "instance" });
    expect(r.nodes.api!.instances).toBe(1);
    expect(r.nodes.api!.status).toBe("overloaded");
  });

  it("returns no success figures without clients", () => {
    const r = run([c("api", "service")], []);
    expect(r.success.overall).toBeNull();
    expect(r.limit).toBeNull();
  });
});

describe("analyzeResilience", () => {
  it("flags single points of failure and missing headroom, skipping managed services", () => {
    const nodes = [...threeTier().nodes, c("cdn", "cdn")];
    const edges = [e("client", "cdn"), e("cdn", "lb"), ...threeTier().edges.slice(1)];
    const traffic = T(15000);
    const rows = analyzeResilience({ nodes, edges, traffic });
    const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
    expect(byId.cdn).toBeUndefined();
    // Only CDN hits (90 % of the 90 % reads) are still served without the database.
    expect(byId.db).toMatchObject({ scenario: "down", verdict: "spof" });
    expect(byId.db!.success).toBeCloseTo(0.81);
    // CDN absorbs 90 % of reads: the service sees 1350 + 1500 = 2850/s on 2 × 1000 → already overloaded.
    expect(byId.lb).toMatchObject({ scenario: "instance", verdict: "ok" });
    expect(rows[0]!.verdict).toBe("spof");
  });

  it("reports backlog-only impact for a single worker", () => {
    const nodes = [
      c("client", "client"),
      c("api", "service"),
      c("q", "queue"),
      c("w", "worker", { replicas: 1 }),
    ];
    const edges = [e("client", "api"), e("api", "q", "writes"), e("q", "w")];
    const rows = analyzeResilience({ nodes, edges, traffic: T() });
    expect(rows.find((r) => r.id === "w")).toMatchObject({ verdict: "backlog", drop: 0 });
  });

  it("reports when losing one instance overloads a component", () => {
    const { nodes, edges } = threeTier();
    const rows = analyzeResilience({ nodes, edges, traffic: T(1500) });
    expect(rows.find((r) => r.id === "api")).toMatchObject({ verdict: "noHeadroom", overloads: ["api"] });
  });
});

describe("checkBoard", () => {
  const codes = (nodes: BoardNode[], edges: BoardEdge[], traffic = T()) =>
    checkBoard(nodes, edges, traffic).map((x) => x.code);

  it("is silent on an empty board and on a sound three-tier design", () => {
    expect(codes([], [])).toEqual([]);
    const { nodes, edges } = threeTier();
    expect(codes(nodes, edges)).toEqual([]);
  });

  it("catches common mistakes", () => {
    expect(codes([c("api", "service")], [])).toContain("noClient");
    expect(codes([c("client", "client"), c("db", "sql")], [e("client", "db")])).toContain("clientToData");
    expect(codes([c("client", "client"), c("api", "service")], [e("client", "api")])).toContain(
      "multiInstanceNoLb",
    );
    const loop = codes(
      [c("client", "client"), c("a", "service", { replicas: 1 }), c("b", "service")],
      [e("client", "a"), e("a", "b"), e("b", "a")],
    );
    expect(loop).toContain("loop");
    expect(codes([c("client", "client"), c("x", "service")], [])).toEqual(
      expect.arrayContaining(["clientNoEdges", "unreachable"]),
    );
    const q = codes(
      [c("client", "client"), c("api", "service", { replicas: 1 }), c("q", "queue"), c("cache", "cache")],
      [e("client", "api"), e("api", "q"), e("api", "cache")],
    );
    expect(q).toEqual(expect.arrayContaining(["queueNoConsumer", "cacheNoStore"]));
    expect(codes([c("client", "client"), c("cdn", "cdn")], [e("client", "cdn", "reads")])).toEqual(
      expect.arrayContaining(["noWritePath", "cdnNoOrigin"]),
    );
    expect(
      codes(
        [c("client", "client"), c("api", "service", { replicas: 1 }), c("pay", "external")],
        [e("client", "api"), e("api", "pay")],
      ),
    ).toContain("syncExternal");
  });

  it("orders errors before warnings before notes", () => {
    const levels = checkBoard(
      [c("api", "service"), c("q", "queue"), c("db", "sql", { replicas: 2 })],
      [e("api", "q")],
      T(),
    ).map((x) => x.level);
    expect(levels).toEqual(
      [...levels].sort(
        (a, b) => ["error", "warning", "info"].indexOf(a) - ["error", "warning", "info"].indexOf(b),
      ),
    );
  });

  it("matches expected building blocks with alternatives", () => {
    const blocks = checkBlocks([c("db", "nosql")], [["sql", "nosql"], ["cache"]]);
    expect(blocks.map((b) => b.met)).toEqual([true, false]);
  });
});

describe("board schema, templates and description", () => {
  it("accepts every template and runs it without errors at the default traffic", () => {
    for (const key of TEMPLATE_KEYS) {
      const board = templateBoard(key, (k) => k);
      expect(parseBoard(JSON.parse(JSON.stringify(board)))).not.toBeNull();
      expect(checkBoard(board.nodes, board.edges, board.traffic).filter((x) => x.level === "error")).toEqual(
        [],
      );
      expect(simulate(board).success.overall).toBeCloseTo(1);
    }
  });

  it("rejects invalid boards", () => {
    const board = templateBoard("threeTier", (k) => k);
    expect(parseBoard({ ...board, edges: [...board.edges, e("t1", "nope")] })).toBeNull();
    expect(
      parseBoard({
        ...board,
        nodes: [...board.nodes, { id: "n", kind: "note", x: 0, y: 0, text: "hi" }],
        edges: [...board.edges, e("t1", "n")],
      }),
    ).toBeNull();
    expect(parseBoard({ ...board, edges: [...board.edges, board.edges[0]!] })).toBeNull();
    expect(parseBoard({ ...board, nodes: [{ ...board.nodes[0]!, label: "x".repeat(61) }] })).toBeNull();
    expect(parseBoard({ ...board, nodes: [{ ...board.nodes[0]!, kind: "mainframe" }] })).toBeNull();
    expect(parseBoard({ ...board, traffic: { rps: -1, readRatio: 0.5 } })).toBeNull();
  });

  it("describes the diagram in plain text for the reviewer", () => {
    const board = templateBoard("readHeavy", (k) => k);
    board.nodes.push({ id: "n1", kind: "note", x: 0, y: 0, text: "  Hot keys   pinned " });
    const text = describeBoard(board);
    expect(text).toContain("- sql (SQL database, primary + 2 read replica(s))");
    expect(text).toContain("- cdn (CDN, hit rate 90%)");
    expect(text).toContain("- service → cache");
    expect(text).toContain("- Hot keys pinned");
    expect(describeBoard({ ...board, nodes: [] })).toBe("");
  });
});
