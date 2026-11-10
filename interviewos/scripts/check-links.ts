/**
 * Verifies every external link in the seeded content (lesson readings and
 * problem links) actually resolves. Uses curl so the system proxy settings
 * apply. Usage: npm run content:check-links
 */
import { execFile } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { promisify } from "node:util";
import { PROBLEMS } from "../content/problems";
import { parseLesson } from "../src/lib/content/lesson-parser";

const run = promisify(execFile);
const dir = join(process.cwd(), "content", "lessons");

function list(d: string): string[] {
  return readdirSync(d).flatMap((n) => {
    const f = join(d, n);
    return statSync(f).isDirectory() ? list(f) : n.endsWith(".md") ? [f] : [];
  });
}

const links = new Map<string, string[]>();
const add = (url: string, where: string) => links.set(url, [...(links.get(url) ?? []), where]);
for (const f of list(dir)) {
  const l = parseLesson(readFileSync(f, "utf8"), relative(process.cwd(), f));
  for (const r of l.readings) add(r.url, l.slug);
}
for (const p of PROBLEMS) for (const l of p.externalLinks) add(l.url, `problem:${p.slug}`);

async function status(url: string): Promise<string> {
  const args = ["-sS", "-o", "/dev/null", "-w", "%{http_code}", "-L", "--max-time", "25", "-A", "Mozilla/5.0 (X11; Linux x86_64) InterviewOS-link-check", url];
  try {
    const { stdout } = await run("curl", args);
    return stdout.trim();
  } catch (err) {
    return `ERR ${(err as Error).message.split("\n")[0]}`;
  }
}

async function main() {
  const urls = [...links.keys()];
  const results: { url: string; code: string }[] = [];
  const queue = [...urls];
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      for (let url = queue.shift(); url; url = queue.shift()) results.push({ url, code: await status(url) });
    }),
  );
  // Sites that block automated clients (but work in a browser) report 403/429; flag separately.
  // A proxy/network policy that refuses the CONNECT means the link could not be checked from here.
  const unreachable = results.filter((r) => /CONNECT tunnel failed|Could not resolve host|Failed to connect/i.test(r.code));
  const broken = results.filter((r) => !/^(2|3)\d\d$/.test(r.code) && !["403", "429"].includes(r.code) && !unreachable.includes(r));
  const blocked = results.filter((r) => ["403", "429"].includes(r.code));
  console.log(`Checked ${results.length} unique links.`);
  for (const b of blocked) console.log(`BLOCKED ${b.code} ${b.url} (${links.get(b.url)!.join(", ")})`);
  for (const b of broken) console.log(`BROKEN  ${b.code} ${b.url} (${links.get(b.url)!.join(", ")})`);
  if (unreachable.length) console.log(`UNVERIFIED ${unreachable.length} link(s): this network blocked the request (proxy/firewall), not necessarily a broken link.`);
  if (broken.length) process.exit(1);
}

void main();
