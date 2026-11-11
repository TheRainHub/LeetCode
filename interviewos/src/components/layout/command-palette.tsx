"use client";

import { CornerDownLeft } from "lucide-react";
import { Dialog as D } from "radix-ui";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Kbd } from "@/components/ui/misc";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { MAIN_NAV, PERSONAL_NAV } from "./nav-items";

export interface PaletteEntry {
  label: string;
  href: string;
  group: string;
}

/** Keyboard-first navigation: ⌘/Ctrl+K opens, "g" + letter jumps directly. */
export function CommandPalette({ extra }: { extra: PaletteEntry[] }) {
  const { m } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const pendingG = useRef<number | null>(null);

  const entries = useMemo<PaletteEntry[]>(
    () => [
      ...[...MAIN_NAV, ...PERSONAL_NAV].map((n) => ({
        label: m.common.nav[n.key],
        href: n.href,
        group: m.common.nav.main,
      })),
      ...extra,
    ],
    [extra, m],
  );
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? entries.filter((e) => e.label.toLowerCase().includes(q)) : entries;
    return list.slice(0, 40);
  }, [entries, query]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery("");
      router.push(href);
    },
    [router],
  );

  useEffect(() => {
    const onOpen = () => setOpen(true);
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
          target.closest(".monaco-editor"));
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "g") {
        pendingG.current = window.setTimeout(() => (pendingG.current = null), 900);
        return;
      }
      if (pendingG.current !== null) {
        const item = [...MAIN_NAV, ...PERSONAL_NAV].find((n) =>
          n.shortcut?.endsWith(` ${e.key.toUpperCase()}`),
        );
        window.clearTimeout(pendingG.current);
        pendingG.current = null;
        if (item) {
          e.preventDefault();
          router.push(item.href);
        }
      }
    };
    window.addEventListener("interviewos:command-palette", onOpen);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("interviewos:command-palette", onOpen);
      window.removeEventListener("keydown", onKey);
    };
  }, [router]);

  return (
    <D.Root open={open} onOpenChange={setOpen}>
      <D.Portal>
        <D.Overlay className="data-[state=open]:animate-fade-in fixed inset-0 z-50 bg-black/50" />
        <D.Content
          className="border-border bg-surface data-[state=open]:animate-slide-up fixed top-[18vh] left-1/2 z-50 w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-lg border shadow-2xl"
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setIndex((i) => Math.min(filtered.length - 1, i + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setIndex((i) => Math.max(0, i - 1));
            } else if (e.key === "Enter" && filtered[index]) {
              e.preventDefault();
              go(filtered[index].href);
            }
          }}
        >
          <D.Title className="sr-only">{m.common.labels.search}</D.Title>
          <D.Description className="sr-only">{m.common.labels.search}</D.Description>
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIndex(0);
            }}
            placeholder={`${m.common.labels.search}…`}
            aria-label={m.common.labels.search}
            className="border-border placeholder:text-subtle-foreground h-11 w-full border-b bg-transparent px-4 text-sm outline-none"
          />
          <ul role="listbox" className="max-h-80 overflow-y-auto p-1.5">
            {filtered.map((e, i) => (
              <li key={`${e.href}-${e.label}`} role="option" aria-selected={i === index}>
                <button
                  type="button"
                  onMouseEnter={() => setIndex(i)}
                  onClick={() => go(e.href)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-left text-sm",
                    i === index ? "bg-surface-3 text-foreground" : "text-muted-foreground",
                  )}
                >
                  <span className="truncate">{e.label}</span>
                  <span className="text-subtle-foreground flex items-center gap-2 text-[11px]">
                    {e.group}
                    {i === index ? <CornerDownLeft className="size-3" /> : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="border-border text-subtle-foreground flex items-center gap-3 border-t px-3 py-2 text-[11px]">
            <span className="flex items-center gap-1">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd>
            </span>
            <span className="flex items-center gap-1">
              <Kbd>↵</Kbd>
            </span>
            <span className="ml-auto flex items-center gap-1">
              <Kbd>g</Kbd> + <Kbd>d</Kbd>/<Kbd>l</Kbd>/<Kbd>p</Kbd>…
            </span>
          </div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
