import {
  Archive,
  Boxes,
  Cog,
  Database,
  Globe,
  ListOrdered,
  type LucideIcon,
  MonitorSmartphone,
  Network,
  Plug,
  RadioTower,
  Search,
  Server,
  Split,
  Waypoints,
  Zap,
} from "lucide-react";
import { type ComponentKind, KIND_SPECS } from "@/lib/whiteboard/catalog";

export const KIND_ICONS: Record<ComponentKind, LucideIcon> = {
  client: MonitorSmartphone,
  dns: Globe,
  cdn: Network,
  loadBalancer: Split,
  apiGateway: Waypoints,
  service: Server,
  realtime: RadioTower,
  worker: Cog,
  cache: Zap,
  sql: Database,
  nosql: Boxes,
  queue: ListOrdered,
  objectStorage: Archive,
  search: Search,
  external: Plug,
};

const GROUP_TONE: Record<string, string> = {
  clients: "bg-surface-3 text-foreground",
  edge: "bg-[color-mix(in_srgb,var(--series-1)_16%,transparent)] text-[var(--series-1)]",
  compute: "bg-[color-mix(in_srgb,var(--series-3)_16%,transparent)] text-[var(--series-3)]",
  data: "bg-[color-mix(in_srgb,var(--series-4)_18%,transparent)] text-[var(--series-4)]",
  async: "bg-[color-mix(in_srgb,var(--series-2)_16%,transparent)] text-[var(--series-2)]",
  external: "bg-surface-3 text-muted-foreground",
};

/** Icon tile coloured by the component's group. */
export function KindIcon({ kind, className }: { kind: ComponentKind; className?: string }) {
  const Icon = KIND_ICONS[kind];
  return (
    <span
      className={`grid size-7 shrink-0 place-items-center rounded-md ${GROUP_TONE[KIND_SPECS[kind].group]} ${className ?? ""}`}
      aria-hidden
    >
      <Icon className="size-4" />
    </span>
  );
}
