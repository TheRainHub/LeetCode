/**
 * Verifies every seeded problem: generates the local test harness for each
 * language with the reference solution, runs it with the real toolchain and
 * checks that all tests pass. Languages whose toolchain is missing are skipped
 * (reported, not failed).
 *
 * Usage: npm run content:verify-harnesses
 */
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PROBLEMS } from "../content/problems";
import { generateHarness, HARNESS_FILENAMES, parseHarnessOutput } from "../src/lib/code-runner/harness";
import type { Language } from "../src/lib/content/types";

const ROOT = join(process.cwd(), ".harness-tmp");

function available(cmd: string, args: string[]): boolean {
  return spawnSync(cmd, args, { stdio: "ignore" }).status === 0;
}

const runners: Record<Language, { ok: boolean; run: (dir: string) => string }> = {
  java: {
    ok: available("java", ["-version"]),
    run: (dir) => execFileSync("java", ["Main.java"], { cwd: dir, encoding: "utf8", timeout: 60_000 }),
  },
  python: {
    ok: available("python3", ["--version"]),
    run: (dir) => execFileSync("python3", ["solution_test.py"], { cwd: dir, encoding: "utf8", timeout: 30_000 }),
  },
  typescript: {
    ok: true,
    run: (dir) =>
      execFileSync(join(process.cwd(), "node_modules", ".bin", "tsx"), ["solution.test.ts"], {
        cwd: dir,
        encoding: "utf8",
        timeout: 30_000,
      }),
  },
};

let failures = 0;
rmSync(ROOT, { recursive: true, force: true });

for (const problem of PROBLEMS) {
  for (const language of ["java", "python", "typescript"] as Language[]) {
    const runner = runners[language];
    if (!runner.ok) {
      console.log(`SKIP ${problem.slug} [${language}] — toolchain not installed`);
      continue;
    }
    const dir = join(ROOT, problem.slug, language);
    mkdirSync(dir, { recursive: true });
    const source = generateHarness(language, {
      code: problem.solutions[language],
      signature: problem.signature,
      comparator: problem.comparator,
      tests: problem.tests,
    });
    writeFileSync(join(dir, HARNESS_FILENAMES[language]), source);
    let output = "";
    try {
      output = runner.run(dir);
    } catch (err) {
      const e = err as { stdout?: string; stderr?: string; message: string };
      output = `${e.stdout ?? ""}\n${e.stderr ?? e.message}`;
    }
    const parsed = parseHarnessOutput(
      output,
      problem.tests.map((t) => t.name),
    );
    const allPassed = parsed.valid && parsed.summary!.passed === parsed.summary!.total;
    if (allPassed) {
      console.log(`PASS ${problem.slug} [${language}] ${parsed.summary!.passed}/${parsed.summary!.total}`);
    } else {
      failures++;
      console.log(`FAIL ${problem.slug} [${language}]\n${output.trim()}`);
    }
  }
}

rmSync(ROOT, { recursive: true, force: true });
if (failures > 0) {
  console.error(`\n${failures} harness run(s) failed`);
  process.exit(1);
}
console.log("\nAll harnesses verified.");
