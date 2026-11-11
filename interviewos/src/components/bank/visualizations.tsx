import { Code2, MonitorPlay } from "lucide-react";
import { VISUALIZATIONS } from "@content/problem-bank";
import type { Messages } from "@/lib/i18n";
import { visualizerSourceUrl, visualizerUrl } from "@/lib/problem-bank/visualizer";

/** Links to algorithm-visualizer.org animations relevant to a lesson (static mapping, no import needed). */
export function VisualizationLinks({ lesson, m }: { lesson: string; m: Messages }) {
  const items = VISUALIZATIONS[lesson];
  if (!items?.length) return null;
  return (
    <ul className="flex flex-col gap-1" data-testid="visualizations">
      {items.map(([category, algorithm]) => (
        <li key={`${category}/${algorithm}`} className="flex items-center gap-2 text-xs">
          <MonitorPlay className="text-primary size-3.5 shrink-0" aria-hidden />
          <a
            href={visualizerUrl(category, algorithm)}
            target="_blank"
            rel="noreferrer noopener"
            className="hover:text-primary"
          >
            {algorithm}
          </a>
          <span className="text-subtle-foreground">· {category}</span>
          <a
            href={visualizerSourceUrl(category, algorithm)}
            target="_blank"
            rel="noreferrer noopener"
            className="text-subtle-foreground hover:text-foreground ml-auto inline-flex items-center gap-1"
          >
            <Code2 className="size-3" aria-hidden />
            {m.bank.lessonCard.code}
          </a>
        </li>
      ))}
    </ul>
  );
}
