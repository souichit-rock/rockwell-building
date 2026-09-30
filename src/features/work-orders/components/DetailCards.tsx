import { Mail, MapPin, Phone } from "lucide-react";
import { Link } from "react-router";
import { Badge, Button, Card, EquipmentIcon, KV, Monogram } from "@/components/ui";
import { dueStatus } from "@/data/selectors";
import type { Db, Id, WorkOrder } from "@/data/types";
import { fmtDate, fmtDateTime } from "@/lib/dates";
import { paths } from "@/lib/paths";
import { assetStatusTone, conditionTone, dueTone, resultTone } from "@/lib/status";
import { ageMs, badgeText, dueLine, KIND_LABEL, phoneHref, RESULT_LABEL, span, targetText, whereOf } from "../lib";

const link = "focus-ring rounded underline decoration-line-strong decoration-1 underline-offset-2 transition-colors duration-150 hover:decoration-ink";

/** Asset (or room, or tower) the job is about: passport link, location and "Show on plan". */
export function PlaceCard({ db, wo }: { db: Db; wo: WorkOrder }) {
  const { tower, floor, space, asset } = whereOf(db, wo);
  const type = asset ? db.equipmentTypes[asset.equipmentTypeId] : undefined;
  const model = asset ? db.models[asset.modelId] : undefined;
  const brand = model ? db.brands[model.brandId] : undefined;
  const highlight: `asset:${Id}` | `space:${Id}` | undefined = asset ? `asset:${asset.id}` : space ? `space:${space.id}` : undefined;
  const planHref = tower && floor && highlight ? paths.floor(tower.id, floor.id, { highlight }) : undefined;

  const location = (
    <span>
      {[tower?.name, floor?.label].filter(Boolean).join(" · ")}
      {space && (
        <>
          {tower || floor ? " · " : ""}
          <Link to={paths.space(space.id)} className={link}>{space.name}</Link>
        </>
      )}
    </span>
  );

  if (!asset) {
    return (
      <Card title="Location">
        {space || tower ? (
          <KV items={[{ k: "Where", v: location }]} />
        ) : (
          <p className="type-small text-muted">No location recorded.</p>
        )}
        <p className="type-small mt-3 text-muted">Not tied to a specific asset.</p>
        {planHref && (
          <div className="mt-4">
            <Button to={planHref} size="sm">
              <MapPin aria-hidden="true" className="size-4" strokeWidth={2} />
              Show on plan
            </Button>
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card title="Asset">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-ctl bg-surface-2 text-ink">
          <EquipmentIcon name={type?.icon ?? "Box"} />
        </span>
        <div className="min-w-0">
          <Link to={paths.asset(asset.id)} className="focus-ring rounded font-mono text-[13px] font-bold text-ink hover:underline">{asset.tag}</Link>
          <p className="type-small text-ink-soft">{type?.name ?? asset.equipmentTypeId}</p>
        </div>
      </div>
      <KV
        className="mt-4"
        items={[
          ...(model ? [{ k: "Model", v: `${brand?.name ?? model.brandId} · ${model.modelNo}` }] : []),
          { k: "Status", v: <Badge tone={assetStatusTone(asset.status)}>{badgeText(asset.status)}</Badge> },
          { k: "Condition", v: <Badge tone={conditionTone(asset.condition)}>{asset.condition}</Badge> },
          { k: "Where", v: location },
        ]}
      />
      <div className="mt-4 flex flex-wrap gap-2">
        <Button to={paths.asset(asset.id)} size="sm">Open passport</Button>
        {planHref && (
          <Button to={planHref} size="sm">
            <MapPin aria-hidden="true" className="size-4" strokeWidth={2} />
            Show on plan
          </Button>
        )}
      </div>
    </Card>
  );
}

/** The PM plan this preventive job belongs to. Marking the work order done rolls this plan forward. */
export function PlanCard({ db, wo }: { db: Db; wo: WorkOrder }) {
  const plan = wo.planId ? db.pmPlans[wo.planId] : undefined;
  if (!plan) {
    // a preventive order raised without a plan still points at the plans on its asset (close-out then rolls nothing)
    const options = wo.kind === "preventive" && wo.assetId ? Object.values(db.pmPlans).filter((p) => p.assetId === wo.assetId) : [];
    if (options.length === 0) return null;
    return (
      <Card title="Preventive plans">
        <ul className="space-y-2">
          {options.map((p) => (
            <li key={p.id}>
              <Link to={paths.plan(p.id)} className={link}>{p.task}</Link>
              <span className="type-small block text-muted">Next due {fmtDate(p.nextDue)}</span>
            </li>
          ))}
        </ul>
      </Card>
    );
  }
  const due = dueStatus(plan.nextDue);
  return (
    <Card title="Preventive plan">
      <p className="font-bold text-ink">
        <Link to={paths.plan(plan.id)} className="focus-ring rounded hover:underline">{plan.task}</Link>
      </p>
      <KV
        className="mt-3"
        items={[
          { k: "Frequency", v: badgeText(plan.frequency).replace(/^./, (c) => c.toUpperCase()) },
          { k: "Last done", v: fmtDate(plan.lastDone) },
          { k: "Next due", v: <span className="inline-flex flex-wrap items-center gap-2">{fmtDate(plan.nextDue)}<Badge tone={dueTone(due)}>{badgeText(due)}</Badge></span> },
        ]}
      />
      <div className="mt-4">
        <Button to={paths.plan(plan.id)} size="sm">Open plan</Button>
      </div>
    </Card>
  );
}

function Person({ name, sub, phone, email, to, note }: {
  name: string;
  sub: string;
  phone?: string;
  email?: string;
  to?: string;
  note?: string;
}) {
  return (
    <div>
      <div className="flex items-start gap-3">
        <Monogram name={name} />
        <div className="min-w-0">
          <p className="font-bold text-ink">
            {to ? <Link to={to} className="focus-ring rounded hover:underline">{name}</Link> : name}
          </p>
          <p className="type-small text-muted">{sub}</p>
          {note && <p className="type-small text-muted">{note}</p>}
        </div>
      </div>
      {(phone || email) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {phone && (
            <Button to={phoneHref(phone)} size="sm" aria-label={`Call ${name} on ${phone}`}>
              <Phone aria-hidden="true" className="size-4" strokeWidth={2} />
              {phone}
            </Button>
          )}
          {email && (
            <Button to={`mailto:${email}`} size="sm" aria-label={`Email ${name} at ${email}`}>
              <Mail aria-hidden="true" className="size-4" strokeWidth={2} />
              Email
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/** Assigned team member and / or vendor, with tap-to-call and tap-to-email. */
export function ContactCard({ db, wo }: { db: Db; wo: WorkOrder }) {
  const member = wo.assignedToId ? db.teamMembers[wo.assignedToId] : undefined;
  const vendor = wo.vendorId ? db.vendors[wo.vendorId] : undefined;
  const contact = vendor?.contacts[0];
  return (
    <Card title="Assigned to">
      {!member && !vendor ? (
        <p className="type-small text-muted">
          Nobody is assigned yet.{wo.status === "open" ? " Assign moves it to the tower's Building Engineer." : ""}
        </p>
      ) : (
        <div className="space-y-4">
          {member && <Person name={member.name} sub={`${member.role} · ${member.team} team`} phone={member.phone} email={member.email} />}
          {member && vendor && <hr className="border-line" />}
          {vendor && (
            <Person
              name={vendor.name}
              to={paths.vendor(vendor.id)}
              sub={contact ? `${contact.name} · ${contact.role}` : "Vendor"}
              {...(contact ? { phone: contact.phone, email: contact.email } : {})}
              {...(vendor.contract ? { note: `Contract ${vendor.contract.ref} · responds within ${vendor.contract.slaResponseHours} h` } : {})}
            />
          )}
        </div>
      )}
    </Card>
  );
}

/** Inspection log entries written when this work order was closed out. */
export function InspectionCard({ db, wo }: { db: Db; wo: WorkOrder }) {
  const logs = Object.values(db.inspections).filter((i) => i.workOrderId === wo.id);
  if (logs.length === 0) return null;
  return (
    <Card title="Inspection log">
      <ul className="space-y-3">
        {logs.map((i) => (
          <li key={i.id} className="flex flex-wrap items-center justify-between gap-2">
            <Link to={paths.inspection(i.id)} className="focus-ring rounded font-semibold text-ink hover:underline">
              {fmtDate(i.date)} · {i.inspector}
            </Link>
            <Badge tone={resultTone(i.result)}>{RESULT_LABEL[i.result]}</Badge>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** The plain facts: number, kind, priority and its target, who reported it and the key times. */
export function FactsCard({ db, wo, now, overdue }: { db: Db; wo: WorkOrder; now: number; overdue: boolean }) {
  const tower = db.towers[wo.towerId];
  const reporter = db.teamMembers[wo.reportedById];
  const due = dueLine(wo, now);
  return (
    <Card title="Details">
      <KV
        items={[
          { k: "Number", v: wo.number, mono: true },
          { k: "Kind", v: KIND_LABEL[wo.kind] },
          { k: "Priority", v: `${wo.priority} · target ${targetText(wo.priority)}` },
          ...(tower ? [{ k: "Tower", v: <Link to={paths.tower(tower.id)} className={link}>{tower.name}</Link> }] : []),
          { k: "Reported", v: `${fmtDateTime(wo.reportedAt)}${reporter ? ` · ${reporter.name}` : ""}` },
          {
            k: "Due",
            v: (
              <span>
                {fmtDateTime(wo.dueAt)}
                {due && <span className={overdue ? "block text-xs font-bold text-danger-deep" : "block text-xs font-medium text-muted"}>{due}</span>}
              </span>
            ),
          },
          ...(wo.completedAt ? [{ k: "Completed", v: fmtDateTime(wo.completedAt) }] : []),
          { k: wo.status === "done" ? "Time to close" : wo.status === "cancelled" ? "Open for" : "Age", v: span(ageMs(wo, now)) },
        ]}
      />
    </Card>
  );
}
