/**
 * Source of the Web Worker that executes transpiled TypeScript in the user's
 * browser. It is a plain string so it can be instantiated from a Blob URL
 * without bundler support, and so the canonicalization logic can be unit
 * tested against `canonical.ts`.
 *
 * The worker has no access to the page's DOM, cookies or storage; it is
 * terminated by the host after a hard timeout.
 */
export const WORKER_SOURCE = String.raw`
"use strict";
class ListNode {
  constructor(val, next) { this.val = val === undefined ? 0 : val; this.next = next === undefined ? null : next; }
}
function buildList(values, pos) {
  const dummy = new ListNode(0); let tail = dummy; let target = null;
  for (let i = 0; i < values.length; i++) { tail.next = new ListNode(values[i]); tail = tail.next; if (i === pos) target = tail; }
  if (pos >= 0) tail.next = target;
  return dummy.next;
}
function norm(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === "boolean" || typeof v === "string" || typeof v === "number") return v;
  if (Array.isArray(v)) return v.map(norm);
  if (v instanceof Set) return Array.from(v).map(norm);
  if (typeof v === "object" && v !== null && typeof v[Symbol.iterator] === "function") return Array.from(v).map(norm);
  return String(v);
}
function byJson(a, b) { const ja = JSON.stringify(a), jb = JSON.stringify(b); return ja < jb ? -1 : ja > jb ? 1 : 0; }
function canon(value, mode) {
  let n = norm(value);
  if (Array.isArray(n)) {
    if (mode === "unorderedList") n = n.slice().sort(byJson);
    if (mode === "unorderedNested") n = n.map(function (x) { return Array.isArray(x) ? x.slice().sort(byJson) : x; }).sort(byJson);
  }
  return JSON.stringify(n);
}
function fmt(x) {
  if (typeof x === "string") return x;
  try { return JSON.stringify(x); } catch (e) { return String(x); }
}
function convertArg(value, type) {
  if (type === "linkedListWithCycle") return buildList(value.values, value.pos);
  return JSON.parse(JSON.stringify(value));
}
self.onmessage = function (event) {
  const req = event.data;
  const logs = [];
  const sandboxConsole = {
    log: function () { if (logs.length < 200) logs.push(Array.prototype.map.call(arguments, fmt).join(" ")); },
  };
  sandboxConsole.info = sandboxConsole.log; sandboxConsole.warn = sandboxConsole.log; sandboxConsole.error = sandboxConsole.log;
  let fn;
  try {
    const factory = new Function("ListNode", "console", "self", "fetch", "XMLHttpRequest", "importScripts", "WebSocket",
      req.code + "\n;return (typeof " + req.method + " === 'function') ? " + req.method +
      " : (typeof Solution === 'function' ? function () { var s = new Solution(); return s." + req.method + ".apply(s, arguments); } : undefined);");
    fn = factory(ListNode, sandboxConsole, undefined, undefined, undefined, undefined, undefined);
  } catch (err) {
    self.postMessage({ type: "compile-error", message: String(err && err.message ? err.message : err), logs: logs });
    return;
  }
  if (typeof fn !== "function") {
    self.postMessage({ type: "compile-error", message: "Could not find a function named '" + req.method + "' (or a Solution class with that method).", logs: logs });
    return;
  }
  const results = [];
  for (let i = 0; i < req.tests.length; i++) {
    const t = req.tests[i];
    const expected = canon(t.expected, req.comparator);
    const started = performance.now();
    try {
      const args = t.args.map(function (a, j) { return convertArg(a, req.paramTypes[j]); });
      const actual = canon(fn.apply(null, args), req.comparator);
      results.push({ name: t.name, passed: actual === expected, actual: actual, expected: expected, durationMs: performance.now() - started });
    } catch (err) {
      results.push({ name: t.name, passed: false, expected: expected, error: String(err && err.message ? err.message : err), durationMs: performance.now() - started });
    }
  }
  self.postMessage({ type: "done", results: results, logs: logs });
};
`;
