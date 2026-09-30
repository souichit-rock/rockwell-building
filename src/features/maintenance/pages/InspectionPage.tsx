import { Link, useLocation, useParams } from "react-router";
import { NotFound } from "@/app/NotFound";
import { Badge, Breadcrumb, Button, Card, KV, Notice, PageHeader } from "@/components/ui";
import { isOverdueWo, readingsSeries } from "@/data/selectors";
import { useDb } from "@/data/store";
import { fmtDate } from "@/lib/dates";
import { fmtNumber } from "@/lib/format";
import { paths } from "@/lib/paths";
import { priorityTone, resultTone, woStatusTone } from "@/lib/status";
import { AssetCard } from "../components/AssetCard";
import { INSPECTION_TYPE_LABEL, pick, readSaved, RESULT_LABEL, words } from "../lib";

const link = "focus-ring relative rounded hover:underline after:absolute after:inset-x-0 after:-inset-y-2.5 after:content-['']"; // the ::after grows the hit area toward 40px

/** One inspection (spec 6.8): result, readings against the previous visit, findings, and the asset, plan and work order it ties to. */
export default function InspectionPage() {
  const { inspectionId } = useParams();
  const { state } = useLocation();
  const db = useDb((d) => d);
  const log = pick(db.inspections, inspectionId);
  const asset = pick(db.assets, log?.assetId);
  const tower = pick(db.towers, asset?.towerId);
  const floor = pick(db.floors, asset?.floorId);
  if (!log || !asset || !tower || !floor) return <NotFound what="inspection" id={inspectionId} />;

  const saved = readSaved(state);
  const justSaved = saved && saved.inspectionId === log.id ? saved : undefined;
  const plan = pick(db.pmPlans, log.planId);
  const vendor = pick(db.vendors, log.vendorId);
  const wo = pick(db.workOrders, log.workOrderId);
  const series = readingsSeries(db, asset.id);
  const typeLabel = INSPECTION_TYPE_LABEL[log.type];
  const equipment = pick(db.equipmentTypes, asset.equipmentTypeId)?.name;
  const raiseWo = paths.newWorkOrder({ assetId: asset.id, title: `${typeLabel} ${log.result === "fail" ? "failed" : "findings"}: ${asset.tag}` });

  return (
    <div>
      <Breadcrumb
        items={[{ to: paths.maintenance(), label: "Maintenance" }, { to: paths.inspections(), label: "Inspections" }, { label: `${asset.tag} · ${fmtDate(log.date)}` }]}
      />
      <PageHeader
        eyebrow={`${tower.name} · ${floor.label}`}
        title={equipment ? `${typeLabel} · ${equipment}` : typeLabel}
        lede={
          <>
            <Link to={paths.asset(asset.id)} className={`${link} font-mono text-[13px] font-semibold text-ink`}>{asset.tag}</Link>
            {` · ${fmtDate(log.date)} · ${log.inspector}`}
          </>
        }
        actions={
          <>
            <Button to={paths.inspections({ assetId: asset.id })} variant="ghost">All visits</Button>
            <Button to={paths.newInspection({ assetId: asset.id, ...(plan ? { planId: plan.id } : {}) })} variant="ghost">Log another visit</Button>
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={resultTone(log.result)}>{words(log.result)}</Badge>
          <Badge tone="neutral">{typeLabel}</Badge>
          {wo && <Badge tone="info">Work order raised</Badge>}
        </div>
      </PageHeader>

      {justSaved && (
        <Notice tone="ok" className="mb-4">
          Inspection saved.
          {plan && justSaved.nextDue && ` ${plan.task} is rescheduled to ${fmtDate(justSaved.nextDue)}.`}
          {justSaved.workOrderId && (
            <>
              {" "}
              Work order{" "}
              <Link to={paths.workOrder(justSaved.workOrderId)} className="focus-ring rounded font-extrabold underline">
                {justSaved.workOrderNumber ?? "raised"}
              </Link>{" "}
              was raised from the findings.
            </>
          )}
        </Notice>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-4">
          <Card title="Findings">
            {log.findings ? (
              <p className="whitespace-pre-line text-ink">{log.findings}</p>
            ) : (
              <p className="type-small text-muted">No findings were recorded.</p>
            )}
          </Card>

          <Card title="Readings" actions={<Badge tone="neutral">{log.readings.length}</Badge>}>
            {log.readings.length === 0 ? (
              <p className="type-small text-muted">No readings were taken on this visit.</p>
            ) : (
              <div className="-mx-1 overflow-x-auto px-1">
                <table className="w-full min-w-[420px] border-separate border-spacing-0 text-[13px]">
                  <thead>
                    <tr>
                      {["Reading", "Value", "Unit", "Previous visit"].map((h, i) => (
                        <th
                          key={h}
                          scope="col"
                          className={`whitespace-nowrap border-b-[1.5px] border-line px-3 py-2.5 text-[10px] font-extrabold uppercase tracking-[.11em] text-muted ${i === 1 || i === 3 ? "text-right" : "text-left"}`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {log.readings.map((r, i) => {
                      const earlier = (series[r.label] ?? []).filter((p) => p.date < log.date);
                      const prev = earlier[earlier.length - 1];
                      return (
                        <tr key={`${i}-${r.label}`}>
                          <td className="border-b border-line px-3 py-2.75 font-semibold text-ink">{r.label}</td>
                          <td className="border-b border-line px-3 py-2.75 text-right font-bold tabular-nums text-ink">{fmtNumber(r.value)}</td>
                          <td className="border-b border-line px-3 py-2.75 text-ink-soft">{r.unit || "—"}</td>
                          <td className="border-b border-line px-3 py-2.75 text-right tabular-nums text-ink-soft">
                            {prev ? (
                              <>
                                {fmtNumber(prev.value)}
                                <span className="block text-xs font-medium text-muted">{fmtDate(prev.date)}</span>
                              </>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <aside className="min-w-0 space-y-4">
          <Card title="Visit">
            <KV
              items={[
                { k: "Date", v: fmtDate(log.date) },
                { k: "Type", v: typeLabel },
                { k: "Inspector", v: log.inspector },
                { k: "Result", v: <Badge tone={resultTone(log.result)}>{RESULT_LABEL[log.result]}</Badge> },
                {
                  k: "Vendor",
                  v: vendor ? <Link to={paths.vendor(vendor.id)} className={link}>{vendor.name}</Link> : <span className="text-muted">In-house</span>,
                },
                {
                  k: "PM plan",
                  v: plan ? <Link to={paths.plan(plan.id)} className={link}>{plan.task}</Link> : <span className="text-muted">Stand-alone visit</span>,
                },
              ]}
            />
          </Card>

          <Card title="Work order">
            {wo ? (
              <div className="space-y-2">
                <p>
                  <Link to={paths.workOrder(wo.id)} className={`${link} font-mono text-[12px] font-bold text-ink`}>{wo.number}</Link>
                </p>
                <p className="font-semibold text-ink">{wo.title}</p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge tone={priorityTone(wo.priority)}>{wo.priority}</Badge>
                  <Badge tone={woStatusTone(wo.status, isOverdueWo(wo))}>{words(wo.status)}</Badge>
                </div>
              </div>
            ) : log.result === "pass" ? (
              <p className="type-small text-muted">A pass needs no follow-up work order.</p>
            ) : (
              <>
                <p className="type-small text-muted">No work order is linked to these findings.</p>
                <div className="mt-4">
                  <Button to={raiseWo} variant="ghost" size="sm">Raise work order</Button>
                </div>
              </>
            )}
          </Card>

          <AssetCard asset={asset} />
        </aside>
      </div>
    </div>
  );
}
