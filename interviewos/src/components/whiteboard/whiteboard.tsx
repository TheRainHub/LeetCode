"use client";

import "@xyflow/react/dist/style.css";
import {
  Background,
  BackgroundVariant,
  type Connection,
  ConnectionMode,
  Controls,
  type FinalConnectionState,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import { Eraser, Maximize, Redo2, Undo2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { saveBoardAction } from "@/app/practice/system-design/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox, Select } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/client";
import {
  type Board,
  type BoardEdge,
  type BoardNode,
  defaultEdgeTraffic,
  type EdgeTraffic,
  emptyBoard,
  isComponent,
  MAX_EDGES,
  MAX_NODES,
  newComponent,
  parseBoard,
  type Traffic,
} from "@/lib/whiteboard/board";
import { type ComponentKind, isComponentKind } from "@/lib/whiteboard/catalog";
import { checkBlocks, checkBoard } from "@/lib/whiteboard/checks";
import {
  analyzeResilience,
  type FailureMode,
  type Failures,
  type SimInput,
  simulate,
} from "@/lib/whiteboard/simulate";
import { sidesBetween, TEMPLATE_KEYS, type TemplateKey, templateBoard } from "@/lib/whiteboard/templates";
import { cn } from "@/lib/utils";
import {
  type ComponentData,
  type FlowEdge,
  type FlowNode,
  newId,
  NODE_HEIGHT,
  NODE_WIDTH,
  SimContext,
  type SimView,
  toBoard,
  toBoardEdges,
  toBoardNodes,
  toFlowEdges,
  toFlowNodes,
} from "./flow";
import { Inspector } from "./inspector";
import { ArrowMarkers, ComponentNode, LoadEdge, NoteNode } from "./nodes";
import { DRAG_MIME, Palette, type PaletteItem } from "./palette";
import { ChecksList, ExpectedBlocks, TestResults, TrafficControls } from "./test-panel";

const NODE_TYPES = { component: ComponentNode, note: NoteNode };
const EDGE_TYPES = { load: LoadEdge };
const AUTOSAVE_MS = 1000;
const HISTORY_LIMIT = 100;
const backupKey = (key: string) => `interviewos:board:${key}`;

interface Snapshot {
  nodes: BoardNode[];
  edges: BoardEdge[];
  traffic: Traffic;
}

function readBackup(key: string): Board | null {
  try {
    const raw = window.localStorage.getItem(backupKey(key));
    return raw ? parseBoard(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function writeBackup(key: string, serialized: string | null) {
  try {
    if (serialized) window.localStorage.setItem(backupKey(key), serialized);
    else window.localStorage.removeItem(backupKey(key));
  } catch {
    // Storage unavailable: autosave still works.
  }
}

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

export interface WhiteboardProps {
  boardKey: string;
  initialBoard: Board | null;
  /** Question boards: expected building blocks and the brief's component list. */
  expected?: { groups: ComponentKind[][]; reference: string[] };
}

export function Whiteboard(props: WhiteboardProps) {
  return (
    <ReactFlowProvider>
      <WhiteboardInner {...props} />
    </ReactFlowProvider>
  );
}

function WhiteboardInner({ boardKey, initialBoard, expected }: WhiteboardProps) {
  const { m } = useI18n();
  const W = m.whiteboard;
  const rf = useReactFlow<FlowNode, FlowEdge>();
  const [initial] = useState(() => initialBoard ?? emptyBoard());
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(toFlowNodes(initial.nodes));
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>(toFlowEdges(initial.edges));
  const [traffic, setTraffic] = useState<Traffic>(initial.traffic);
  const [failures, setFailures] = useState<Failures>({});
  const [showLoad, setShowLoad] = useState(true);
  const [revision, setRevision] = useState(0);
  const [historySize, setHistorySize] = useState({ past: 0, future: 0 });
  const history = useRef<{ past: Snapshot[]; future: Snapshot[]; lastKey: string | null; lastAt: number }>({
    past: [],
    future: [],
    lastKey: null,
    lastAt: 0,
  });
  const wrapper = useRef<HTMLDivElement>(null);
  // Fit the view once freshly loaded nodes have been measured (bounds are unknown before that).
  const [fitRequest, setFitRequest] = useState(0);
  const fitDone = useRef(0);
  const nodesMeasured = useNodesInitialized();
  useEffect(() => {
    if (!fitRequest || fitDone.current === fitRequest || !nodesMeasured) return;
    fitDone.current = fitRequest;
    void rf.fitView({ padding: 0.2, maxZoom: 1, duration: 300 });
  }, [fitRequest, nodesMeasured, rf]);

  // ---- Board state, autosave and local backup ---------------------------------------------
  const board = useMemo(() => toBoard(nodes, edges, traffic), [nodes, edges, traffic]);
  const serialized = useMemo(() => JSON.stringify(board), [board]);
  const [lastSaved, setLastSaved] = useState(() =>
    initialBoard ? JSON.stringify(initialBoard) : JSON.stringify(emptyBoard()),
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [everSaved, setEverSaved] = useState(initialBoard !== null);
  const pending = useRef<string | null>(null);

  useEffect(() => {
    pending.current = serialized === lastSaved ? null : serialized;
    if (serialized === lastSaved) {
      writeBackup(boardKey, null);
      return;
    }
    writeBackup(boardKey, serialized);
    const t = window.setTimeout(async () => {
      setSaving(true);
      const res = await saveBoardAction({ key: boardKey, board: JSON.parse(serialized) as Board });
      setSaving(false);
      if (res.ok) {
        setLastSaved(serialized);
        setSaveError(false);
        setEverSaved(true);
      } else {
        setSaveError(true);
      }
    }, AUTOSAVE_MS);
    return () => window.clearTimeout(t);
  }, [serialized, lastSaved, boardKey]);

  // Flush an unsaved change when leaving the page.
  useEffect(
    () => () => {
      const unsaved = pending.current;
      if (unsaved) void saveBoardAction({ key: boardKey, board: JSON.parse(unsaved) as Board });
    },
    [boardKey],
  );

  // Restore a local backup that never reached the server (tab closed within the autosave delay).
  useEffect(() => {
    const backup = readBackup(boardKey);
    if (!backup || JSON.stringify(backup) === JSON.stringify(initial)) return;
    const t = window.setTimeout(() => {
      setNodes(toFlowNodes(backup.nodes));
      setEdges(toFlowEdges(backup.edges));
      setTraffic(backup.traffic);
      setRevision((r) => r + 1);
      setFitRequest((n) => n + 1);
    }, 0);
    return () => window.clearTimeout(t);
  }, [boardKey, initial, setNodes, setEdges]);

  // ---- History --------------------------------------------------------------------------
  const snapshot = (): Snapshot => ({
    nodes: toBoardNodes(rf.getNodes()),
    edges: toBoardEdges(rf.getEdges()),
    traffic,
  });
  const syncHistorySize = () =>
    setHistorySize({ past: history.current.past.length, future: history.current.future.length });
  /** Saves the state before a change; repeated edits of the same field within 1.5 s merge. */
  const record = (coalesceKey?: string) => {
    const h = history.current;
    const now = Date.now();
    if (coalesceKey && h.lastKey === coalesceKey && now - h.lastAt < 1500) {
      h.lastAt = now;
      return;
    }
    h.past.push(snapshot());
    if (h.past.length > HISTORY_LIMIT) h.past.shift();
    h.future = [];
    h.lastKey = coalesceKey ?? null;
    h.lastAt = now;
    syncHistorySize();
  };
  const apply = (s: Snapshot) => {
    setNodes(toFlowNodes(s.nodes));
    setEdges(toFlowEdges(s.edges));
    setTraffic(s.traffic);
    setRevision((r) => r + 1);
  };
  const undo = () => {
    const h = history.current;
    const prev = h.past.pop();
    if (!prev) return;
    h.future.push(snapshot());
    h.lastKey = null;
    apply(prev);
    syncHistorySize();
  };
  const redo = () => {
    const h = history.current;
    const next = h.future.pop();
    if (!next) return;
    h.past.push(snapshot());
    h.lastKey = null;
    apply(next);
    syncHistorySize();
  };

  const undoRef = useRef(undo);
  const redoRef = useRef(redo);
  useEffect(() => {
    undoRef.current = undo;
    redoRef.current = redo;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || isTyping(e.target)) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        undoRef.current();
      } else if ((key === "z" && e.shiftKey) || key === "y") {
        e.preventDefault();
        redoRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ---- Live load test ---------------------------------------------------------------------
  const simKey = useMemo(
    () =>
      JSON.stringify({
        nodes: board.nodes.filter(isComponent).map((n) => ({ ...n, x: 0, y: 0 })),
        edges: board.edges.map(({ sourceHandle: _s, targetHandle: _t, ...e }) => e),
        traffic: board.traffic,
        failures,
      }),
    [board, failures],
  );
  const analysis = useMemo(() => {
    const input = JSON.parse(simKey) as SimInput;
    const result = simulate(input);
    const resilience = analyzeResilience(input, result);
    return {
      result,
      resilience,
      checks: checkBoard(input.nodes, input.edges, input.traffic),
      verdicts: Object.fromEntries(resilience.map((r) => [r.id, r.verdict])),
    };
  }, [simKey]);
  const simView = useMemo<SimView>(
    () => ({ result: analysis.result, showLoad, failures, verdicts: analysis.verdicts }),
    [analysis, showLoad, failures],
  );
  const names = useMemo(
    () => new Map(nodes.flatMap((n) => (n.type === "component" ? [[n.id, n.data.label] as const] : []))),
    [nodes],
  );
  const componentCount = names.size;
  const clientIds = useMemo(
    () => new Set(nodes.filter((n) => n.type === "component" && n.data.kind === "client").map((n) => n.id)),
    [nodes],
  );

  // ---- Editing ---------------------------------------------------------------------------
  const uniqueLabel = (base: string) => {
    const taken = new Set(names.values());
    if (!taken.has(base)) return base;
    let i = 2;
    while (taken.has(`${base} ${i}`)) i++;
    return `${base} ${i}`;
  };

  const viewCenter = () => {
    const rect = wrapper.current?.getBoundingClientRect();
    const p = rf.screenToFlowPosition({
      x: (rect?.left ?? 0) + (rect?.width ?? 800) / 2,
      y: (rect?.top ?? 0) + (rect?.height ?? 600) / 2,
    });
    const offset = (nodes.length % 6) * 24;
    return { x: p.x - NODE_WIDTH / 2 + offset, y: p.y - NODE_HEIGHT / 2 + offset };
  };

  const addNode = (kind: PaletteItem, position = viewCenter()) => {
    if (nodes.length >= MAX_NODES) {
      toast.error(`Max ${MAX_NODES}`);
      return;
    }
    record();
    const pos = { x: Math.round(position.x), y: Math.round(position.y) };
    const node: FlowNode =
      kind === "note"
        ? { id: newId("n"), type: "note", position: pos, data: { text: "" }, selected: true }
        : (() => {
            const { id, x, y, ...data } = newComponent(kind, newId("c"), pos, uniqueLabel(W.kinds[kind]));
            return { id, type: "component" as const, position: { x, y }, data, selected: true };
          })();
    setNodes((ns) => [...ns.map((n) => (n.selected ? { ...n, selected: false } : n)), node]);
    setEdges((es) => es.map((e) => (e.selected ? { ...e, selected: false } : e)));
  };

  const onDrop = (e: React.DragEvent) => {
    const kind = e.dataTransfer.getData(DRAG_MIME);
    if (kind !== "note" && !isComponentKind(kind)) return;
    e.preventDefault();
    const p = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
    addNode(kind, { x: p.x - NODE_WIDTH / 2, y: p.y - NODE_HEIGHT / 2 });
  };

  const kindOf = (id: string) => {
    const n = rf.getNode(id);
    return n?.type === "component" ? n.data.kind : n ? "note" : undefined;
  };
  const canConnect = (source: string, target: string) =>
    source !== target &&
    kindOf(source) !== undefined &&
    kindOf(source) !== "note" &&
    kindOf(target) !== undefined &&
    kindOf(target) !== "note" &&
    !rf.getEdges().some((e) => e.source === source && e.target === target) &&
    rf.getEdges().length < MAX_EDGES;

  const connect = (
    source: string,
    target: string,
    sourceHandle?: string | null,
    targetHandle?: string | null,
  ) => {
    if (!canConnect(source, target)) return;
    record();
    const edge: FlowEdge = {
      id: `e-${source}-${target}`,
      source,
      target,
      sourceHandle: sourceHandle ?? "r",
      targetHandle: targetHandle ?? "l",
      type: "load",
      data: { traffic: defaultEdgeTraffic(kindOf(target)) },
    };
    setEdges((es) => [...es, edge]);
  };

  const onConnect = (c: Connection) => connect(c.source, c.target, c.sourceHandle, c.targetHandle);

  /** Dropping a connection anywhere on a component (not only on a dot) connects to it. */
  const onConnectEnd = (event: MouseEvent | TouchEvent, state: FinalConnectionState) => {
    if (state.isValid || !state.fromNode) return;
    const point = "changedTouches" in event ? event.changedTouches[0] : event;
    if (!point) return;
    const el = document.elementFromPoint(point.clientX, point.clientY)?.closest(".react-flow__node");
    const target = el?.getAttribute("data-id");
    if (!target || target === state.fromNode.id) return;
    const from = rf.getNode(state.fromNode.id);
    const to = rf.getNode(target);
    if (!from || !to) return;
    connect(state.fromNode.id, target, state.fromHandle?.id, sidesBetween(from.position, to.position).target);
  };

  const selectedNodes = nodes.filter((n) => n.selected);
  const selectedEdges = edges.filter((e) => e.selected);
  const selectedNode = selectedNodes.length === 1 && !selectedEdges.length ? selectedNodes[0]! : null;
  const selectedEdge = selectedEdges.length === 1 && !selectedNodes.length ? selectedEdges[0]! : null;

  const changeNode = (id: string, patch: Partial<ComponentData>, field: string) => {
    record(`node:${id}:${field}`);
    setNodes((ns) =>
      ns.map((n) => (n.id === id && n.type === "component" ? { ...n, data: { ...n.data, ...patch } } : n)),
    );
  };
  const changeEdge = (id: string, t: EdgeTraffic) => {
    record();
    setEdges((es) => es.map((e) => (e.id === id ? { ...e, data: { traffic: t } } : e)));
  };
  const setFailure = (id: string, mode: FailureMode | null) =>
    setFailures((f) => {
      const next = { ...f };
      if (mode) next[id] = mode;
      else delete next[id];
      return next;
    });
  const duplicate = (id: string) => {
    const n = rf.getNode(id);
    if (!n || n.type !== "component") return;
    record();
    const copy: FlowNode = {
      id: newId("c"),
      type: "component",
      position: { x: n.position.x + 32, y: n.position.y + 32 },
      data: { ...n.data, label: uniqueLabel(n.data.label) },
      selected: true,
    };
    setNodes((ns) => [...ns.map((x) => ({ ...x, selected: false })), copy]);
  };
  const deleteSelection = () => {
    void rf.deleteElements({
      nodes: selectedNodes.map((n) => ({ id: n.id })),
      edges: selectedEdges.map((e) => ({ id: e.id })),
    });
  };
  const changeTraffic = (t: Traffic, field: string) => {
    record(`traffic:${field}`);
    setTraffic(t);
  };

  const focusNode = (id: string) => {
    setNodes((ns) => ns.map((n) => ({ ...n, selected: n.id === id })));
    setEdges((es) => es.map((e) => (e.selected ? { ...e, selected: false } : e)));
    void rf.fitView({ nodes: [{ id }], duration: 300, maxZoom: 1.2, padding: 0.8 });
  };

  const loadTemplate = (key: TemplateKey) => {
    if (componentCount && !window.confirm(W.toolbar.templateConfirm)) return;
    record();
    const t = templateBoard(key, (k) => W.kinds[k]);
    apply({ ...t, traffic });
    setFailures({});
    setFitRequest((n) => n + 1);
  };
  const clearBoard = () => {
    if (!nodes.length || !window.confirm(W.toolbar.clearConfirm)) return;
    record();
    apply({ nodes: [], edges: [], traffic });
    setFailures({});
  };

  // Failures on components that no longer exist are dropped.
  const liveFailures = useMemo(
    () => Object.fromEntries(Object.entries(failures).filter(([id]) => names.has(id))) as Failures,
    [failures, names],
  );

  const saveLabel = saving
    ? W.toolbar.saving
    : saveError
      ? W.toolbar.saveError
      : serialized !== lastSaved
        ? W.toolbar.unsaved
        : everSaved
          ? W.toolbar.saved
          : "";

  const blocks = expected ? checkBlocks(board.nodes, expected.groups) : null;

  return (
    <SimContext.Provider value={simView}>
      <div className="flex flex-col gap-3" data-testid="whiteboard">
        <Card className="flex flex-wrap items-center gap-2 p-2">
          <Select
            className="h-7 w-auto max-w-56 text-xs"
            value=""
            onChange={(e) => {
              if ((TEMPLATE_KEYS as readonly string[]).includes(e.target.value))
                loadTemplate(e.target.value as TemplateKey);
            }}
            aria-label={W.toolbar.template}
            data-testid="wb-template"
          >
            <option value="">{W.toolbar.template}</option>
            {TEMPLATE_KEYS.map((k) => (
              <option key={k} value={k}>
                {W.templates[k]}
              </option>
            ))}
          </Select>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={undo}
            disabled={!historySize.past}
            aria-label={W.toolbar.undo}
            title={`${W.toolbar.undo} (Ctrl+Z)`}
            data-testid="wb-undo"
          >
            <Undo2 />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={redo}
            disabled={!historySize.future}
            aria-label={W.toolbar.redo}
            title={`${W.toolbar.redo} (Ctrl+Shift+Z)`}
          >
            <Redo2 />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => void rf.fitView({ padding: 0.2, duration: 300 })}
            aria-label={W.toolbar.fit}
            title={W.toolbar.fit}
          >
            <Maximize />
          </Button>
          <Button size="sm" variant="ghost" onClick={clearBoard} disabled={!nodes.length}>
            <Eraser />
            {W.toolbar.clear}
          </Button>
          <label className="ml-auto flex items-center gap-1.5 text-xs">
            <Checkbox
              checked={showLoad}
              onChange={(e) => setShowLoad(e.target.checked)}
              data-testid="wb-show-load"
            />
            {W.toolbar.showLoad}
          </label>
          <span
            className={cn(
              "min-w-28 text-right text-[11px]",
              saveError ? "text-danger" : "text-subtle-foreground",
            )}
            aria-live="polite"
            data-testid="wb-save-state"
          >
            {saveLabel}
          </span>
        </Card>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex min-w-0 flex-col gap-2">
            <Card className="p-2">
              <Palette onAdd={(k) => addNode(k)} />
            </Card>

            <div
              ref={wrapper}
              className="wb-canvas border-border relative h-[60vh] min-h-[420px] overflow-hidden rounded-lg border lg:h-[calc(100dvh-15rem)] lg:min-h-[520px]"
              onDragOver={(e) => {
                if (e.dataTransfer.types.includes(DRAG_MIME)) {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                }
              }}
              onDrop={onDrop}
              data-testid="wb-canvas"
            >
              <ArrowMarkers />
              <ReactFlow<FlowNode, FlowEdge>
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={NODE_TYPES}
                edgeTypes={EDGE_TYPES}
                onConnect={onConnect}
                onConnectEnd={onConnectEnd}
                isValidConnection={(c) => canConnect(c.source, c.target)}
                connectionMode={ConnectionMode.Loose}
                onNodeDragStart={() => record()}
                onBeforeDelete={async () => {
                  record();
                  return true;
                }}
                deleteKeyCode={["Backspace", "Delete"]}
                snapToGrid
                snapGrid={[8, 8]}
                fitView
                fitViewOptions={{ padding: 0.25, maxZoom: 1 }}
                minZoom={0.2}
                maxZoom={2}
                defaultEdgeOptions={{ type: "load" }}
                aria-label={W.title}
              >
                <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
                <Controls showInteractive={false} />
                <MiniMap
                  pannable
                  zoomable
                  className="hidden sm:block"
                  nodeColor={(n) => {
                    const s = showLoad ? analysis.result.nodes[n.id]?.status : undefined;
                    return s === "overloaded" || s === "down"
                      ? "var(--danger)"
                      : s === "hot"
                        ? "var(--warning)"
                        : n.type === "note"
                          ? "var(--warning-soft)"
                          : "var(--border-strong)";
                  }}
                />
                {!nodes.length ? (
                  <Panel position="top-center" className="pointer-events-none">
                    <p
                      className="bg-surface text-muted-foreground mt-16 max-w-xs rounded-md border px-3 py-2 text-center text-xs shadow-sm"
                      data-testid="wb-empty"
                    >
                      {W.empty}
                    </p>
                  </Panel>
                ) : null}
              </ReactFlow>
            </div>
          </div>

          <Card
            className="flex flex-col gap-3 p-3 lg:max-h-[calc(100dvh-8rem)] lg:overflow-y-auto"
            data-testid="wb-panel"
          >
            {selectedNode || selectedEdge ? (
              <div className="border-primary/40 bg-surface-2 rounded-md border p-3">
                <Inspector
                  key={`${selectedNode?.id ?? selectedEdge?.id}:${revision}`}
                  node={selectedNode}
                  edge={selectedEdge}
                  nodes={nodes}
                  failure={selectedNode ? liveFailures[selectedNode.id] : undefined}
                  onChangeNode={changeNode}
                  onChangeEdge={changeEdge}
                  onFailure={setFailure}
                  onDuplicate={duplicate}
                  onDelete={deleteSelection}
                />
              </div>
            ) : (
              <p className="text-subtle-foreground text-[11px]">{W.hint}</p>
            )}
            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold">{W.test.title}</h2>
              <TrafficControls traffic={traffic} onChange={changeTraffic} />
            </div>
            <TestResults
              result={analysis.result}
              resilience={analysis.resilience}
              failures={liveFailures}
              names={names}
              componentCount={componentCount}
              clientIds={clientIds}
              onFailure={setFailure}
              onHeal={() => setFailures({})}
              onFocus={focusNode}
            />
            <ChecksList checks={analysis.checks} names={names} onFocus={focusNode} />
            {expected && blocks ? <ExpectedBlocks blocks={blocks} reference={expected.reference} /> : null}
            <details className="border-border border-t pt-3 text-xs">
              <summary className="text-muted-foreground cursor-pointer font-medium">{W.test.how}</summary>
              <ul className="text-muted-foreground mt-2 flex list-disc flex-col gap-1 pl-4 text-[11px]">
                {W.test.rules.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </details>
            <p className="text-subtle-foreground text-[11px]" data-testid="wb-disclaimer">
              {W.test.disclaimer}
            </p>
          </Card>
        </div>
      </div>
    </SimContext.Provider>
  );
}
