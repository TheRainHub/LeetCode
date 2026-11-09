"use client";

import { Menu, Search, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Kbd } from "@/components/ui/misc";
import { Tooltip } from "@/components/ui/tooltip";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { isActive, MAIN_NAV, PERSONAL_NAV, type NavItem } from "./nav-items";

function NavLink({ item, pathname, onNavigate }: { item: NavItem; pathname: string; onNavigate?: () => void }) {
  const { m } = useI18n();
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] transition-colors",
        active ? "bg-surface-3 text-foreground" : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
      )}
    >
      <Icon className={cn("size-4 shrink-0", active ? "text-primary" : "text-subtle-foreground group-hover:text-muted-foreground")} />
      <span className="truncate">{m.common.nav[item.key]}</span>
    </Link>
  );
}

export function Sidebar({ aiEnabled }: { aiEnabled: boolean }) {
  const pathname = usePathname();
  const { m } = useI18n();
  const [open, setOpen] = useState(false);
  const focusMode = pathname.startsWith("/practice/problems/");

  useEffect(() => setOpen(false), [pathname]);

  const content = (
    <div className="flex h-full flex-col gap-4 px-3 py-4">
      <div className="flex items-center justify-between px-1">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground">
            IO
          </span>
          <span className="text-sm font-semibold tracking-tight">{m.common.appName}</span>
        </Link>
        <button
          type="button"
          className="rounded-md p-1 text-muted-foreground hover:bg-surface-2 md:hidden"
          onClick={() => setOpen(false)}
          aria-label={m.common.nav.closeMenu}
        >
          <X className="size-4" />
        </button>
      </div>

      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent("interviewos:command-palette"))}
        className="flex h-8 items-center gap-2 rounded-md border border-border bg-surface-2 px-2 text-xs text-subtle-foreground hover:text-muted-foreground"
      >
        <Search className="size-3.5" />
        <span className="flex-1 text-left">{m.common.labels.search}…</span>
        <Kbd>⌘K</Kbd>
      </button>

      <nav aria-label={m.common.nav.main} className="flex flex-col gap-0.5">
        {MAIN_NAV.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>
      <div>
        <p className="mb-1 px-2 text-[11px] font-medium tracking-wide text-subtle-foreground uppercase">{m.common.nav.personal}</p>
        <nav aria-label={m.common.nav.personal} className="flex flex-col gap-0.5">
          {PERSONAL_NAV.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </nav>
      </div>

      <div className="mt-auto px-1">
        <Tooltip content={aiEnabled ? m.common.ai.configured : m.common.ai.notConfiguredHelp} side="right">
          <div className="flex items-center gap-2 text-[11px] text-subtle-foreground">
            <Sparkles className={cn("size-3.5", aiEnabled ? "text-primary" : "text-subtle-foreground")} />
            {aiEnabled ? m.common.ai.configured : m.common.ai.notConfigured}
            <span className={cn("ml-auto size-1.5 rounded-full", aiEnabled ? "bg-success" : "bg-subtle-foreground")} />
          </div>
        </Tooltip>
      </div>
    </div>
  );

  return (
    <>
      <div className="sticky top-0 z-30 flex h-11 items-center gap-2 border-b border-border bg-background/90 px-3 backdrop-blur md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-surface-2"
          aria-label={m.common.nav.openMenu}
        >
          <Menu className="size-4" />
        </button>
        <span className="text-sm font-semibold">{m.common.appName}</span>
      </div>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-20 hidden w-56 border-r border-border bg-surface md:block",
          focusMode && "md:hidden",
        )}
      >
        {content}
      </aside>
      {open ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button type="button" aria-label={m.common.nav.closeMenu} className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 border-r border-border bg-surface animate-slide-up">{content}</aside>
        </div>
      ) : null}
    </>
  );
}

export function MainContainer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const fullBleed = pathname.startsWith("/practice/problems/");
  return <main className={cn("min-h-screen", fullBleed ? "md:pl-0" : "md:pl-56")}>{children}</main>;
}
