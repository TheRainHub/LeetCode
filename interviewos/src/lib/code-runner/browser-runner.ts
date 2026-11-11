"use client";

import type { CodeRunner, RunRequest, RunResult, TestOutcome } from "./types";
import { notExecuted } from "./types";
import { WORKER_SOURCE } from "./worker-source";

export const BROWSER_RUN_TIMEOUT_MS = 4000;

/** Strips TypeScript types (sucrase) and module syntax so the code can run inside the worker. */
export async function transpileTypeScript(code: string): Promise<string> {
  const { transform } = await import("sucrase");
  const withoutExports = code.replace(/^\s*export\s+(default\s+)?/gm, "");
  return transform(withoutExports, { transforms: ["typescript"], disableESTransforms: true }).code;
}

type WorkerMessage =
  | { type: "done"; results: TestOutcome[]; logs: string[] }
  | { type: "compile-error"; message: string; logs: string[] };

/**
 * Runs TypeScript solutions in a dedicated Web Worker created from a Blob URL.
 * The worker is terminated after a hard timeout (infinite loops) and after
 * every run, so no state leaks between runs. Code never reaches the server.
 */
export const browserTypeScriptRunner: CodeRunner = {
  id: "browser-typescript",
  supports: (language) => language === "typescript",
  async run(request: RunRequest): Promise<RunResult> {
    if (request.language !== "typescript") {
      return notExecuted("The in-browser runner only supports TypeScript.");
    }
    if (typeof Worker === "undefined") return notExecuted("Web Workers are not available in this browser.");

    let js: string;
    try {
      js = await transpileTypeScript(request.code);
    } catch (err) {
      return {
        executed: false,
        mode: "browser",
        results: [],
        logs: [],
        compileError: err instanceof Error ? err.message : String(err),
      };
    }

    const blobUrl = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: "text/javascript" }));
    const worker = new Worker(blobUrl);

    try {
      const message = await new Promise<WorkerMessage | "timeout">((resolve) => {
        const timer = window.setTimeout(() => resolve("timeout"), BROWSER_RUN_TIMEOUT_MS);
        worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
          window.clearTimeout(timer);
          resolve(e.data);
        };
        worker.onerror = (e) => {
          window.clearTimeout(timer);
          e.preventDefault();
          resolve({ type: "compile-error", message: e.message || "Worker error", logs: [] });
        };
        worker.postMessage({
          code: js,
          method: request.signature.method,
          paramTypes: request.signature.params.map((p) => p.type),
          comparator: request.comparator,
          tests: request.tests,
        });
      });

      if (message === "timeout") {
        return {
          executed: true,
          mode: "browser",
          results: request.tests.map((t) => ({ name: t.name, passed: false, error: "Timed out" })),
          logs: [],
          message: `Execution exceeded ${BROWSER_RUN_TIMEOUT_MS / 1000}s — possible infinite loop.`,
        };
      }
      if (message.type === "compile-error") {
        return {
          executed: false,
          mode: "browser",
          results: [],
          logs: message.logs,
          compileError: message.message,
        };
      }
      return { executed: true, mode: "browser", results: message.results, logs: message.logs };
    } finally {
      worker.terminate();
      URL.revokeObjectURL(blobUrl);
    }
  },
};
