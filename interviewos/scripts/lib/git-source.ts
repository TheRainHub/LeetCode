import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const git = (cwd: string, ...a: string[]) =>
  execFileSync("git", a, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 256 * 1024 * 1024,
  }).trim();

/**
 * Makes sure a public Git repository is available locally: clones it (shallow) when
 * missing, updates it when present (unless fetching is disabled), and reports the commit.
 *
 * With `checkout: false` the files are never written to the working tree; read them with
 * `gitCommitFiles`. Use it for repositories whose file names Windows cannot create
 * (e.g. names containing ":"), where a normal clone fails at checkout.
 */
export function prepareGitSource(
  repoUrl: string,
  dir: string,
  options: { fetch: boolean; label: string; checkout?: boolean },
): { ok: boolean; commit: string | null; commitDate: Date | null } {
  const checkout = options.checkout ?? true;
  if (!existsSync(dir)) {
    if (!options.fetch) {
      console.warn(`[${options.label}] ${dir} not found and --no-fetch given; skipping this source.`);
      return { ok: false, commit: null, commitDate: null };
    }
    mkdirSync(dirname(dir), { recursive: true });
    console.log(`[${options.label}] cloning ${repoUrl} …`);
    execFileSync("git", ["clone", "--depth", "1", ...(checkout ? [] : ["--no-checkout"]), repoUrl, dir], {
      stdio: "inherit",
    });
  } else if (options.fetch && existsSync(join(dir, ".git"))) {
    try {
      if (checkout) git(dir, "pull", "--ff-only", "--quiet");
      else {
        // Move HEAD to the latest commit without touching the working tree.
        git(dir, "fetch", "--depth", "1", "--quiet", "origin", "HEAD");
        git(dir, "reset", "--soft", "--quiet", "FETCH_HEAD");
      }
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

/**
 * Top-level files of the commit checked out at HEAD, read from Git's object store by object id,
 * so it works even when the files could not be written to disk.
 */
export function gitCommitFiles(dir: string): { names(): string[]; read(name: string): string } {
  const entries = new Map<string, string>();
  for (const record of git(dir, "ls-tree", "-z", "HEAD").split("\0")) {
    const tab = record.indexOf("\t");
    if (tab < 0) continue;
    const [, type, oid] = record.slice(0, tab).split(" ");
    if (type === "blob" && oid) entries.set(record.slice(tab + 1), oid);
  }
  return {
    names: () => [...entries.keys()],
    read: (name) => {
      const oid = entries.get(name);
      if (!oid) throw new Error(`${name} is not in ${dir} at HEAD`);
      return execFileSync("git", ["cat-file", "blob", oid], {
        cwd: dir,
        encoding: "utf8",
        maxBuffer: 256 * 1024 * 1024,
      });
    },
  };
}
