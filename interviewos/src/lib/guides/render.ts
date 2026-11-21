/**
 * Converts the HTML <img> tags used in the guides to Markdown images (raw HTML is not rendered).
 * Kept apart from the parser so pages do not bundle the YAML front-matter parser.
 */
export function toRenderableMarkdown(content: string): string {
  return content.replace(/<img\s+[^>]*src="([^"]+)"[^>]*\/?>/gi, (_, src: string) => `![](${src})`);
}
