import { CalendarClock, ChevronDown, CircleCheck, ClipboardX, FileWarning, ShieldAlert, Siren, TriangleAlert, type LucideIcon } from "lucide-react";
import { Link } from "react-router";
import { Badge, Card, EmptyState } from "@/components/ui";
import type { AttentionItem, AttentionKind } from "@/data/types";
import { plural } from "@/lib/format";
import { paths } from "@/lib/paths";
import { healthTone } from "@/lib/status";
import type { AttentionGroup } from "../lib";

const VISIBLE = 4;

// short category labels for the badge; the icon repeats the kind for the eye
const KIND: Record<AttentionKind, { icon: LucideIcon; label: string }> = {
  "wo-p1": { icon: Siren, label: "P1" },
  "wo-p2": { icon: TriangleAlert, label: "P2" },
  "pm-overdue": { icon: CalendarClock, label: "PM" },
  permit: { icon: FileWarning, label: "Permit" },
  "warranty-30d": { icon: ShieldAlert, label: "Warranty" },
  "inspection-fail": { icon: ClipboardX, label: "Failed" },
};

function Row({ item }: { item: AttentionItem }) {
  const { icon: Icon, label } = KIND[item.kind];
  return (
    <li>
      <Link
        to={item.href}
        className="focus-ring group flex min-h-11 items-center gap-3 rounded-ctl px-2 py-2 transition-colors duration-150 hover:bg-surface-2"
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-ctl bg-surface-2 text-ink-soft transition-colors duration-150 group-hover:bg-surface">
          <Icon aria-hidden="true" className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-[14px] font-bold text-ink">{item.title}</span>
          <span className="block truncate text-xs text-ink-soft">{item.subtitle}</span>
        </span>
        <Badge tone={item.tone}>{label}</Badge>
      </Link>
    </li>
  );
}

/** "Needs attention": one block per tower (worst health first), items in the selector's severity order, the first four visible. */
export function AttentionCard({ groups, count }: { groups: AttentionGroup[]; count: number }) {
  return (
    <Card
      title="Needs attention"
      actions={groups.length > 0 ? <span className="text-xs font-semibold text-muted">{plural(count, "item")} · worst health first</span> : undefined}
    >
      {groups.length === 0 ? (
        <EmptyState
          icon={CircleCheck}
          title="Nothing needs attention"
          body="No overdue PM, P1 or P2 orders, permit alerts, expiring warranties or failed inspections."
        />
      ) : (
        <div className="space-y-5">
          {groups.map(({ tower, health, items }) => (
            <section key={tower.id} aria-label={tower.name} className="border-t border-line pt-4 first:border-t-0 first:pt-0">
              <header className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 px-2">
                <Link
                  to={paths.tower(tower.id)}
                  className="focus-ring relative rounded text-[13px] font-extrabold uppercase tracking-[.08em] text-ink after:absolute after:-inset-y-3 after:inset-x-0 after:content-[''] hover:underline"
                >
                  {tower.name}
                </Link>
                <Badge tone={healthTone(health.band)}>{health.band} · {health.score}</Badge>
                <span className="ml-auto text-xs text-muted">{plural(items.length, "item")}</span>
              </header>
              <ul>
                {items.slice(0, VISIBLE).map((item) => (
                  <Row key={`${item.kind}-${item.href}-${item.title}`} item={item} />
                ))}
              </ul>
              {items.length > VISIBLE && (
                <details className="group/more">
                  <summary className="focus-ring flex h-10 cursor-pointer list-none items-center gap-2 rounded-ctl px-2 text-[11px] font-extrabold uppercase tracking-[.08em] text-ink-soft transition-colors duration-150 hover:bg-surface-2 hover:text-ink [&::-webkit-details-marker]:hidden">
                    <ChevronDown aria-hidden="true" className="size-4 group-open/more:rotate-180" />
                    <span className="group-open/more:hidden">Show {items.length - VISIBLE} more</span>
                    <span className="hidden group-open/more:inline">Show fewer</span>
                  </summary>
                  <ul>
                    {items.slice(VISIBLE).map((item) => (
                      <Row key={`${item.kind}-${item.href}-${item.title}`} item={item} />
                    ))}
                  </ul>
                </details>
              )}
            </section>
          ))}
        </div>
      )}
    </Card>
  );
}
