"use client";

import { Tabs as T } from "radix-ui";
import * as React from "react";
import { cn } from "@/lib/utils";

export const Tabs = T.Root;

export function TabsList({ className, ...props }: React.ComponentProps<typeof T.List>) {
  return (
    <T.List
      className={cn(
        "border-border bg-surface-2 inline-flex items-center gap-0.5 rounded-md border p-0.5",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof T.Trigger>) {
  return (
    <T.Trigger
      className={cn(
        "text-muted-foreground hover:text-foreground data-[state=active]:bg-surface data-[state=active]:text-foreground inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-[5px] px-2.5 text-xs font-medium transition-colors data-[state=active]:shadow-sm [&_svg]:size-3.5",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: React.ComponentProps<typeof T.Content>) {
  return <T.Content className={cn("focus-visible:outline-none", className)} {...props} />;
}
