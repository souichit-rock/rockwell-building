import { ChevronRight, CircleCheck } from "lucide-react";
import { Link } from "react-router";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import type { AttentionItem, Id } from "@/data/types";
import { plural } from "@/lib/format";
import { paths } from "@/lib/paths";
import { ATTENTION_LABEL } from "../lib";

export const OPEN_ITEMS_LIMIT = 8;

/** Top of attentionItems(towerId): P1, P2, overdue PM, permits, warranties, failed inspections, each row a link to its record. */
export function OpenItems({ towerId, items }: { towerId: Id; items: AttentionItem[] }) {
  const shown = items.slice(0, OPEN_ITEMS_LIMIT);
  return (
    <Card
      title="Open items"
      actions={<Button to={paths.workOrders({ tower: towerId })} variant="ghost" size="sm">Work orders</Button>}
    >
      {shown.length === 0 ? (
        <EmptyState icon={CircleCheck} title="Nothing needs attention" body="No open P1 or P2 work orders, overdue PM, permits, warranties or failed inspections." />
      ) : (
        <>
          <ul className="-mx-2 divide-y divide-line">
            {shown.map((item) => (
              <li key={`${item.kind}-${item.href}-${item.title}`}>
                <Link to={item.href} className="focus-ring flex items-start gap-3 rounded-ctl px-2 py-3 transition-colors duration-150 hover:bg-surface-2">
                  <Badge tone={item.tone} className="mt-0.5 shrink-0">{ATTENTION_LABEL[item.kind]}</Badge>
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-[14px] font-bold text-ink">{item.title}</span>
                    <span className="block break-words text-xs text-ink-soft">{item.subtitle}</span>
                  </span>
                  <ChevronRight aria-hidden="true" className="mt-1 size-4 shrink-0 text-muted" strokeWidth={2} />
                </Link>
              </li>
            ))}
          </ul>
          {items.length > shown.length && (
            <p className="type-small mt-3 text-muted">Showing {shown.length} of {plural(items.length, "item")}, most urgent first.</p>
          )}
        </>
      )}
    </Card>
  );
}
