"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/** Client-side Markdown for dynamic text (AI feedback, chat). No raw HTML, no syntax highlighting. */
export function Markdown({ children, className, compact }: { children: string; className?: string; compact?: boolean }) {
  return (
    <div
      className={cn(
        "prose-lesson prose max-w-none dark:prose-invert",
        compact ? "prose-sm prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 prose-pre:my-2" : "prose-sm",
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
