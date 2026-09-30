import { Link, useParams } from "react-router";
import { NotFound } from "@/app/NotFound";
import { Badge, Breadcrumb, Button, Card, KV, PageHeader } from "@/components/ui";
import { dueStatus, permitStatus } from "@/data/selectors";
import { useDb } from "@/data/store";
import { fmtDate, todayISO } from "@/lib/dates";
import { paths } from "@/lib/paths";
import { dueTone, permitTone } from "@/lib/status";
import { AssetCard } from "../components/AssetCard";
import { VisitHistory } from "../components/VisitHistory";
import { dueNote, FREQUENCY_LABEL, inspectionRows, nextDueDates, pick, words } from "../lib";

const link = "focus-ring relative rounded hover:underline after:absolute after:inset-x-0 after:-inset-y-2.5 after:content-['']"; // the ::after grows the hit area toward 40px

/** One PM plan (spec 6.8): checklist, the next six visits, the visits already logged, and "Mark done". */
export default function PlanPage() {
  const { planId } = useParams();
  const db = useDb((d) => d);
  const plan = pick(db.pmPlans, planId);
  const asset = pick(db.assets, plan?.assetId);
  const tower = pick(db.towers, asset?.towerId);
  const floor = pick(db.floors, asset?.floorId);
  const type = pick(db.equipmentTypes, asset?.equipmentTypeId);
  if (!plan || !asset || !tower || !floor || !type) return <NotFound what="PM plan" id={planId} />;

  const today = todayISO();
  const status = dueStatus(plan.nextDue, today);
  const vendor = pick(db.vendors, plan.vendorId);
  const permit = pick(db.permits, plan.permitId);
  const permitDoc = pick(db.documents, permit?.docId);
  const visits = inspectionRows(db).filter((r) => r.log.planId === plan.id);
  const markDone = paths.newInspection({ assetId: asset.id, planId: plan.id });
  const upcoming = nextDueDates(plan, 6);

  return (
    <div>
      <Breadcrumb items={[{ to: paths.maintenance(), label: "Maintenance" }, { label: plan.task }]} />
      <PageHeader
        eyebrow={`${tower.name} · ${floor.label}`}
        title={plan.task}
        lede={
          <>
            <Link to={paths.asset(asset.id)} className={`${link} font-mono text-[13px] font-semibold text-ink`}>{asset.tag}</Link>
            {` · ${type.name}`}
          </>
        }
        actions={
          <>
            <Button to={paths.inspections({ assetId: asset.id })} variant="ghost">All visits</Button>
            <Button to={markDone} variant="primary">Mark done</Button>
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={dueTone(status)}>{words(status)}</Badge>
          <span className="type-small text-ink-soft">
            Next due {fmtDate(plan.nextDue)} · {dueNote(plan.nextDue, today)}
          </span>
          <Badge tone="neutral">{FREQUENCY_LABEL[plan.frequency]}</Badge>
          {plan.regulatory && <Badge tone="info">Regulatory</Badge>}
        </div>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-4">
          <Card title="Checklist" actions={<Badge tone="neutral">{plan.checklist.length} steps</Badge>}>
            {plan.checklist.length === 0 ? (
              <p className="type-small text-muted">No checklist is recorded for this plan.</p>
            ) : (
              <ol className="space-y-2.5">
                {plan.checklist.map((step, i) => (
                  <li key={`${i}-${step}`} className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-surface-2 text-[11px] font-extrabold tabular-nums text-ink-soft"
                    >
                      {i + 1}
                    </span>
                    <span className="pt-0.5 text-ink">{step}</span>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          <Card title="Next six due dates">
            <ol className="divide-y divide-line">
              {upcoming.map((date, i) => {
                const s = dueStatus(date, today);
                return (
                  <li key={date} className="flex min-h-12 flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5 first:pt-0 last:pb-0">
                    <span>
                      <span className="block font-semibold tabular-nums text-ink">{fmtDate(date)}</span>
                      <span className="block text-xs font-medium text-muted">{i === 0 ? "Next visit" : `Visit ${i + 1}`}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-muted">{dueNote(date, today)}</span>
                      <Badge tone={dueTone(s)}>{words(s)}</Badge>
                    </span>
                  </li>
                );
              })}
            </ol>
            <p className="type-small mt-3 text-muted">Projected from the next due date at the {FREQUENCY_LABEL[plan.frequency].toLowerCase()} interval.</p>
          </Card>

          <section aria-labelledby="visit-history">
            <h2 id="visit-history" className="type-heading mb-3 text-ink">Visit history</h2>
            <VisitHistory rows={visits} markDone={markDone} />
          </section>
        </div>

        <aside className="min-w-0 space-y-4">
          <Card title="Plan">
            <KV
              items={[
                { k: "Frequency", v: FREQUENCY_LABEL[plan.frequency] },
                { k: "Team", v: `${plan.assigneeTeam} team` },
                {
                  k: "Vendor",
                  v: vendor ? <Link to={paths.vendor(vendor.id)} className={link}>{vendor.name}</Link> : <span className="text-muted">In-house</span>,
                },
                { k: "Estimate", v: `${plan.estimatedHours} h` },
                { k: "Last done", v: fmtDate(plan.lastDone) },
                { k: "Next due", v: fmtDate(plan.nextDue) },
                { k: "Regulatory", v: plan.regulatory ? "Yes" : "No" },
              ]}
            />
          </Card>

          {plan.regulatory && (
            <Card title="Permit">
              {permit ? (
                <>
                  <KV
                    items={[
                      { k: "Number", v: permit.number, mono: true },
                      { k: "Issuer", v: permit.issuer },
                      { k: "Issued", v: fmtDate(permit.issuedDate) },
                      { k: "Expires", v: fmtDate(permit.expiryDate) },
                      {
                        k: "Status",
                        v: <Badge tone={permitTone(permitStatus(permit.expiryDate, today))}>{permitStatus(permit.expiryDate, today)}</Badge>,
                      },
                    ]}
                  />
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button to={paths.permits({ tower: tower.id, type: permit.type })} variant="ghost" size="sm">Open permits</Button>
                    {permitDoc && <Button to={paths.document(permitDoc.id)} variant="ghost" size="sm">Permit document</Button>}
                  </div>
                </>
              ) : (
                <>
                  <p className="type-small text-muted">This is a regulatory plan, but no permit is linked to it.</p>
                  <div className="mt-4">
                    <Button to={paths.permits({ tower: tower.id })} variant="ghost" size="sm">Open permits</Button>
                  </div>
                </>
              )}
            </Card>
          )}

          <AssetCard asset={asset} />
        </aside>
      </div>
    </div>
  );
}
