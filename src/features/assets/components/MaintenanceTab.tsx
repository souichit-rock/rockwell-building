import { CalendarX } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { dueStatus, isOverdueWo } from "@/data/selectors";
import { useDb } from "@/data/store";
import { fmtDate, fmtDateTime } from "@/lib/dates";
import { paths } from "@/lib/paths";
import { dueTone, priorityTone, woStatusTone } from "@/lib/status";
import { LINK, dueIn, words, type Passport } from "../lib";

function Meta({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10.5px] font-extrabold uppercase tracking-[.11em] text-muted">{k}</dt>
      <dd className="m-0 font-semibold text-ink">{children}</dd>
    </div>
  );
}

export function MaintenanceTab({ p }: { p: Passport }) {
  const { asset, plans, openWos } = p;
  const vendors = useDb((db) => db.vendors);
  return (
    <div className="space-y-4">
      <Card title="PM plans" actions={<Button to={paths.newInspection({ assetId: asset.id })} variant="ghost" size="sm">Log visit</Button>}>
        {plans.length === 0 ? (
          <EmptyState icon={CalendarX} title="No PM plan" body="No preventive maintenance is scheduled for this asset." className="py-8" />
        ) : (
          <ul className="divide-y divide-line">
            {plans.map((pl) => {
              const status = dueStatus(pl.nextDue);
              const vendor = pl.vendorId ? vendors[pl.vendorId] : undefined;
              return (
                <li key={pl.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-[14px] font-bold text-ink">
                        <Link to={paths.plan(pl.id)} className={LINK}>{pl.task}</Link>
                      </h3>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <Badge tone={dueTone(status)}>{words(status)}</Badge>
                        <Badge tone="neutral">{pl.frequency}</Badge>
                        {pl.regulatory && <Badge tone="info">regulatory</Badge>}
                      </div>
                    </div>
                    <Button to={paths.newInspection({ assetId: asset.id, planId: pl.id })} variant="ghost" size="sm">Mark done</Button>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-3 text-[13px] sm:grid-cols-4">
                    <Meta k="Last done">{fmtDate(pl.lastDone)}</Meta>
                    <Meta k="Next due">{fmtDate(pl.nextDue)} · {dueIn(pl.nextDue)}</Meta>
                    <Meta k="Team">{pl.assigneeTeam}</Meta>
                    <Meta k="Estimate">{pl.estimatedHours} h</Meta>
                    {vendor && <Meta k="Vendor"><Link to={paths.vendor(vendor.id)} className={LINK}>{vendor.name}</Link></Meta>}
                  </dl>
                  {pl.checklist.length > 0 && (
                    <details className="mt-3 text-[13px]">
                      <summary className="focus-ring inline-block cursor-pointer rounded py-1 font-bold text-ink-soft">Checklist ({pl.checklist.length})</summary>
                      <ol className="mt-2 list-decimal space-y-1 pl-5 text-ink-soft">
                        {pl.checklist.map((item) => <li key={item}>{item}</li>)}
                      </ol>
                    </details>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card title="Open work orders" actions={<Button to={paths.newWorkOrder({ assetId: asset.id })} variant="ghost" size="sm">Raise work order</Button>}>
        {openWos.length === 0 ? (
          <p className="type-small text-muted">No open work orders for this asset.</p>
        ) : (
          <ul className="divide-y divide-line">
            {openWos.map((wo) => (
              <li key={wo.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-3 first:pt-0 last:pb-0">
                <Link to={paths.workOrder(wo.id)} className={`${LINK} font-mono text-[12px] font-bold`}>{wo.number}</Link>
                <span className="min-w-0 flex-1 basis-48 font-semibold text-ink">{wo.title}</span>
                <Badge tone={priorityTone(wo.priority)}>{wo.priority}</Badge>
                <Badge tone={woStatusTone(wo.status, isOverdueWo(wo))}>{words(wo.status)}</Badge>
                <span className="text-xs text-muted">Due {fmtDateTime(wo.dueAt)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="type-small mt-4">
          <Link to={paths.workOrders({ assetId: asset.id })} className={LINK}>All work orders for {asset.tag}</Link>
        </p>
      </Card>
    </div>
  );
}
