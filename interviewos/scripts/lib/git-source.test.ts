// @vitest-environment node
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { emptyModel, readPatterns } from "../../src/lib/problem-bank/read-sources";
import { gitCommitFiles, prepareGitSource } from "./git-source";

const root = mkdtempSync(join(tmpdir(), "git-source-"));
const git = (cwd: string, ...args: string[]) =>
  execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", ...args], {
    cwd,
    stdio: "pipe",
  });

afterAll(() => rmSync(root, { recursive: true, force: true }));

describe("reading a source without checking it out", () => {
  it("reads files whose names Windows cannot create, straight from Git", () => {
    const origin = join(root, "origin");
    execFileSync("git", ["init", "-q", "-b", "main", origin]);
    // A name with ":" — valid in Git and on Linux/macOS, impossible on Windows (NTFS).
    const name = "✅  Pattern 01 : Sliding Window.md";
    writeFileSync(join(origin, name), "Problems: https://leetcode.com/problems/minimum-window-substring/\n");
    writeFileSync(join(origin, "README.md"), "# Notes\n");
    git(origin, "add", "-A");
    git(origin, "commit", "-q", "-m", "init");

    const dir = join(root, "clone");
    const prepared = prepareGitSource(`file://${origin}`, dir, {
      fetch: true,
      label: "test",
      checkout: false,
    });
    expect(prepared.ok).toBe(true);
    expect(prepared.commit).toMatch(/^[0-9a-f]{40}$/);
    // Nothing was written to the working tree …
    expect(existsSync(join(dir, name))).toBe(false);
    // … yet the files are readable.
    const files = gitCommitFiles(dir);
    expect(files.names().sort()).toEqual(["README.md", name]);
    const model = emptyModel();
    readPatterns(files, model);
    expect(model.patterns).toEqual([
      expect.objectContaining({
        name: "Sliding Window",
        position: 1,
        fileName: name,
        problems: ["minimum-window-substring"],
      }),
    ]);

    // Updating moves HEAD to the new commit without checking anything out.
    writeFileSync(join(origin, "✅ Pattern 02: Two Pointers.md"), "https://leetcode.com/problems/two-sum/\n");
    git(origin, "add", "-A");
    git(origin, "commit", "-q", "-m", "second");
    const updated = prepareGitSource(`file://${origin}`, dir, {
      fetch: true,
      label: "test",
      checkout: false,
    });
    expect(updated.commit).not.toBe(prepared.commit);
    expect(gitCommitFiles(dir).names()).toContain("✅ Pattern 02: Two Pointers.md");
  });
});
