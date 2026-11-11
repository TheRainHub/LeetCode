/**
 * Checks that every algorithm-visualizer entry referenced in content/problem-bank.ts
 * exists in github.com/algorithm-visualizer/algorithms (category/algorithm folders).
 *
 *   npm run bank:verify-visualizations                 # clones into .data-sources/ if missing
 *   npm run bank:verify-visualizations -- --dir <path> # use an existing clone
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { VISUALIZATIONS } from "../content/problem-bank";
import { visualizerUrl } from "../src/lib/problem-bank/visualizer";

const i = process.argv.indexOf("--dir");
const dir = resolve(i >= 0 ? process.argv[i + 1]! : ".data-sources/algorithm-visualizer-algorithms");
if (!existsSync(dir)) {
  execFileSync("git", ["clone", "--depth", "1", "https://github.com/algorithm-visualizer/algorithms", dir], {
    stdio: "inherit",
  });
}

let missing = 0;
const entries = [
  ...new Set(
    Object.values(VISUALIZATIONS)
      .flat()
      .map(([c, a]) => `${c}/${a}`),
  ),
];
for (const entry of entries) {
  const [category, algorithm] = entry.split("/") as [string, string];
  if (existsSync(join(dir, category, algorithm)))
    console.log(`OK      ${visualizerUrl(category, algorithm)}`);
  else {
    missing++;
    console.log(`MISSING ${entry}`);
  }
}
console.log(
  `${entries.length - missing}/${entries.length} visualizations exist in the algorithms repository.`,
);
if (missing) process.exit(1);
