"use client";

import { StickyNote } from "lucide-react";
import { Fragment } from "react";
import { useI18n } from "@/lib/i18n/client";
import { type ComponentKind, PALETTE_GROUPS } from "@/lib/whiteboard/catalog";
import { KindIcon } from "./kind-icon";

export const DRAG_MIME = "application/x-interviewos-component";
export type PaletteItem = ComponentKind | "note";

/** Components to drag onto the board; clicking adds one in the middle of the view. */
export function Palette({ onAdd }: { onAdd: (kind: PaletteItem) => void }) {
  const { m } = useI18n();
  const W = m.whiteboard;
  const item = (kind: PaletteItem, icon: React.ReactNode, label: string, help: string) => (
    <button
      key={kind}
      type="button"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(DRAG_MIME, kind);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={() => onAdd(kind)}
      title={`${label} — ${help}`}
      aria-label={W.palette.add(label)}
      data-testid={`wb-palette-${kind}`}
      className="border-border bg-surface hover:border-primary hover:bg-surface-2 flex shrink-0 cursor-grab items-center gap-1.5 rounded-md border py-1 pr-2 pl-1 text-[11px] active:cursor-grabbing"
    >
      {icon}
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
  return (
    <div
      className="flex flex-col gap-1.5"
      data-testid="wb-palette"
      role="toolbar"
      aria-label={W.palette.title}
    >
      <p className="text-subtle-foreground text-[11px]">
        <span className="text-foreground font-medium">{W.palette.title}.</span> {W.palette.help}
      </p>
      <div className="-mx-1 flex items-center gap-1 overflow-x-auto px-1 pb-1 lg:flex-wrap lg:overflow-visible lg:pb-0">
        {PALETTE_GROUPS.map((g, i) => (
          <Fragment key={g.group}>
            {i > 0 ? <span className="bg-border mx-0.5 h-5 w-px" aria-hidden /> : null}
            {g.kinds.map((k) => item(k, <KindIcon kind={k} className="size-6" />, W.kinds[k], W.kindHelp[k]))}
          </Fragment>
        ))}
        <span className="bg-border mx-0.5 h-5 w-px" aria-hidden />
        {item(
          "note",
          <span
            className="bg-warning-soft text-warning grid size-6 place-items-center rounded-md"
            aria-hidden
          >
            <StickyNote className="size-3.5" />
          </span>,
          W.palette.note,
          W.palette.note,
        )}
      </div>
    </div>
  );
}
