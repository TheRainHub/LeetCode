import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const git = (cwd: string, ...a: string[]) =>
  execFileSync("git", a, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

/**
 * Makes sure a public Git repository is available locally: clones it (shallow) when
 * missing, pulls when present (unless fetching is disabled), and reports the commit.
 */
export function prepareGitSource(
  repoUrl: string,
  dir: string,
  options: { fetch: boolean; label: string },
): { ok: boolean; commit: string | null; commitDate: Date | null } {
  if (!existsSync(dir)) {
    if (!options.fetch) {
      console.warn(`[${options.label}] ${dir} not found and --no-fetch given; skipping this source.`);
      return { ok: false, commit: null, commitDate: null };
    }
    mkdirSync(dirname(dir), { recursive: true });
    console.log(`[${options.label}] cloning ${repoUrl} …`);
    execFileSync("git", ["clone", "--depth", "1", repoUrl, dir], { stdio: "inherit" });
  } else if (options.fetch && existsSync(join(dir, ".git"))) {
    try {
      git(dir, "pull", "--ff-only", "--quiet");
    } catch (err) {
      console.warn(
        `[${options.label}] could not update ${dir} (${(err as Error).message.split("\n")[0]}); using the existing copy.`,
      );
    }
  }
  if (!existsSync(join(dir, ".git"))) return { ok: true, commit: null, commitDate: null };
  const [commit, date] = git(dir, "log", "-1", "--format=%H%n%cI").split("\n");
  return { ok: true, commit: commit ?? null, commitDate: date ? new Date(date) : null };
}
