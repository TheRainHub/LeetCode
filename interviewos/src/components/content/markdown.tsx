import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/** Renders trusted, seeded Markdown (and user notes). Raw HTML is not enabled. */
export function Markdown({
  children,
  className,
  compact,
}: {
  children: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "prose-lesson prose dark:prose-invert max-w-none",
        compact ? "prose-sm prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5" : "prose-sm sm:prose-base",
        "prose-headings:font-semibold prose-headings:tracking-tight prose-h3:mt-8 prose-h3:text-base prose-a:no-underline hover:prose-a:underline",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { detect: false, ignoreMissing: true }]]}
        components={{
          img: ({ src, alt }) =>
            typeof src === "string" ? (
              // External diagrams (e.g. visual guides) are plain images; next/image would need a domain allowlist.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt={alt ?? ""}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="rounded-md"
              />
            ) : null,
          a: ({ href, children: c }) => (
            <a href={href} target={href?.startsWith("http") ? "_blank" : undefined} rel="noreferrer noopener">
              {c}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
