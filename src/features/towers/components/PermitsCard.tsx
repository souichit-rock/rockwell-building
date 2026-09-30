import { BadgeCheck } from "lucide-react";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { permitStatus } from "@/data/selectors";
import type { Id, Permit } from "@/data/types";
import { paths } from "@/lib/paths";
import { permitTone } from "@/lib/status";
import { PERMIT_LABEL, permitExpiry } from "../lib";

/** Permit strip: soonest expiry first, status from permitStatus, tone from permitTone. */
export function PermitsCard({ towerId, permits }: { towerId: Id; permits: Permit[] }) {
  return (
    <Card
      title="Permits"
      actions={<Button to={paths.permits({ tower: towerId })} variant="ghost" size="sm">All permits</Button>}
    >
      {permits.length === 0 ? (
        <EmptyState icon={BadgeCheck} title="No permits" body="No permit is on record for this tower." />
      ) : (
        <ul className="divide-y divide-line">
          {permits.map((p) => {
            const status = permitStatus(p.expiryDate);
            const expiry = permitExpiry(p);
            return (
              <li key={p.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-[14px] font-bold text-ink">{PERMIT_LABEL[p.type]}</p>
                  <p className="break-all font-mono text-[11px] text-muted">{p.number}</p>
                </div>
                <div className="shrink-0 text-right">
                  <Badge tone={permitTone(status)}>{status}</Badge>
                  <p className="mt-1 text-xs font-semibold text-ink-soft">{expiry.date}</p>
                  {expiry.note && <p className="text-xs text-muted">{expiry.note}</p>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
