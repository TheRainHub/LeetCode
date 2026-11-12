import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseGuide, parseGuideCategory, type ParsedGuide } from "./parse";

/** Reads guides and categories from a local copy of the System Design 101 repository. */
export function readGuides(root: string) {
  const warnings: string[] = [];
  const guides: ParsedGuide[] = [];
  const guidesDir = join(root, "data", "guides");
  for (const file of readdirSync(guidesDir).sort()) {
    if (!file.endsWith(".md")) continue;
    try {
      const g = parseGuide(file, readFileSync(join(guidesDir, file), "utf8"));
      if (g) guides.push(g);
    } catch (err) {
      warnings.push(`${file}: ${(err as Error).message.split("\n")[0]}`);
    }
  }
  const categoriesDir = join(root, "data", "categories");
  const categories = existsSync(categoriesDir)
    ? readdirSync(categoriesDir)
        .filter((f) => f.endsWith(".md"))
        .sort()
        .map((f) => parseGuideCategory(f, readFileSync(join(categoriesDir, f), "utf8")))
    : [];
  return { guides, categories, warnings };
}
