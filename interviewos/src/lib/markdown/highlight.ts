import type { Element, Root } from "hast";
import { toText } from "hast-util-to-text";
import bash from "highlight.js/lib/languages/bash";
import c from "highlight.js/lib/languages/c";
import css from "highlight.js/lib/languages/css";
import go from "highlight.js/lib/languages/go";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import kotlin from "highlight.js/lib/languages/kotlin";
import python from "highlight.js/lib/languages/python";
import sql from "highlight.js/lib/languages/sql";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";
import { createLowlight } from "lowlight";
import { visit } from "unist-util-visit";

/**
 * Syntax highlighting for fenced code blocks with an explicit language, limited to the languages
 * the curriculum uses (the default highlight.js "common" set would add hundreds of KiB to the
 * server bundle). Unknown languages are left as plain text.
 */
const lowlight = createLowlight({
  bash,
  c,
  css,
  go,
  java,
  javascript,
  json,
  kotlin,
  python,
  sql,
  typescript,
  xml,
  yaml,
});
lowlight.registerAlias({
  bash: ["sh", "shell", "zsh"],
  javascript: ["js", "jsx", "mjs"],
  typescript: ["ts", "tsx"],
  xml: ["html", "svg"],
  yaml: ["yml"],
  kotlin: ["kt"],
  python: ["py"],
});

function languageOf(node: Element): string | null {
  const classes = node.properties?.className;
  if (!Array.isArray(classes)) return null;
  for (const cls of classes) {
    const name = String(cls);
    if (name === "no-highlight" || name === "nohighlight") return null;
    if (name.startsWith("language-")) return name.slice(9);
    if (name.startsWith("lang-")) return name.slice(5);
  }
  return null;
}

export function rehypeHighlightCode() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element, _index, parent) => {
      if (node.tagName !== "code" || !parent || parent.type !== "element" || parent.tagName !== "pre") return;
      const lang = languageOf(node);
      if (!lang || !lowlight.registered(lang)) return;
      const classes = Array.isArray(node.properties.className) ? node.properties.className : [];
      if (!classes.includes("hljs")) node.properties.className = ["hljs", ...classes];
      const result = lowlight.highlight(lang, toText(node, { whitespace: "pre" }));
      node.children = result.children as Element["children"];
    });
  };
}
