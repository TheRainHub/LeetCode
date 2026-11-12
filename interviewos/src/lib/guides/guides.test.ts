import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GUIDES_FOR_LESSON, GUIDES_FOR_QUESTION, guideSourceUrl } from "@content/guides";
import { guideSlug, toRenderableMarkdown } from "./parse";
import { readGuides } from "./read";

const ROOT = join(process.cwd(), "e2e", "fixtures", "guides", "system-design-101");

describe("guide parsing", () => {
  it("normalises file names into URL-safe slugs", () => {
    expect(guideSlug("evolution-of-uber's-api-layer.md")).toBe("evolution-of-ubers-api-layer");
    expect(guideSlug("a-beginner's-guide-to-cdn-content-delivery-network.md")).toBe(
      "a-beginners-guide-to-cdn-content-delivery-network",
    );
  });

  it("reads guides and categories, skipping drafts", () => {
    const { guides, categories, warnings } = readGuides(ROOT);
    expect(warnings).toEqual([]);
    expect(guides.map((g) => g.slug)).toEqual([
      "consistent-hashing",
      "evolution-of-ubers-api-layer",
      "top-8-cache-eviction-strategies",
    ]);
    expect(guides[0]).toMatchObject({
      title: "Consistent Hashing",
      publishedOn: "2024-03-01",
      categories: ["database-and-storage"],
      tags: ["Distributed Systems", "Hashing"],
      path: "data/guides/consistent-hashing.md",
    });
    expect(guides[1]!.path).toBe("data/guides/evolution-of-uber's-api-layer.md");
    expect(categories.map((c) => [c.slug, c.sort])).toEqual([
      ["caching-performance", 150],
      ["database-and-storage", 120],
    ]);
  });

  it("converts HTML image tags for rendering without changing the text", () => {
    const md = 'Intro\n<img src="https://example.com/a.png" alt="x">\nText stays.';
    expect(toRenderableMarkdown(md)).toBe("Intro\n![](https://example.com/a.png)\nText stays.");
  });

  it("links back to the original file", () => {
    expect(guideSourceUrl("data/guides/evolution-of-uber's-api-layer.md")).toBe(
      "https://github.com/ByteByteGoHq/system-design-101/blob/HEAD/data/guides/evolution-of-uber's-api-layer.md",
    );
  });

  it("uses only URL-safe slugs in the curated mappings", () => {
    for (const slug of [...Object.values(GUIDES_FOR_LESSON), ...Object.values(GUIDES_FOR_QUESTION)].flat()) {
      expect(slug).toMatch(/^[a-z0-9-]+$/);
    }
  });
});
