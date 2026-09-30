import { Box, CalendarClock, ChevronRight, ClipboardList, FileText, Mail, Phone, ShieldCheck } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";
import NotFound from "@/app/NotFound";
import { Badge, Breadcrumb, Button, Card, DataTable, EmptyState, KV, Monogram, PageHeader, StatTile, type Column } from "@/components/ui";
import { permitStatus } from "@/data/selectors";
import { useDb } from "@/data/store";
import { daysUntil, fmtDate } from "@/lib/dates";
import { fmtNumber } from "@/lib/format";
import { paths } from "@/lib/paths";
import { assetStatusTone, dueTone, permitTone, priorityTone, warrantyTone, woStatusTone } from "@/lib/status";
import { ContactActions, HeaderActions, Section, linkClass } from "../components/bits";
import {
  BAND_LABEL, CONTRACT_ENDING_DAYS, claimHref, expiryState, fmtHours, mailHref, relDays, sentence, signedDays,
  telHref, vendorDetail, words, type PlanRow, type ServedRow, type WarrantyRow, type WoRow,
} from "../lib";

const dash = "—";
const nowrap = (text: string) => <span className="whitespace-nowrap">{text}</span>;

const woColumns: Column<WoRow>[] = [
  {
    key: "number", label: "Number", mono: true, sort: (r) => r.wo.number,
    render: (r) => <Link to={paths.workOrder(r.wo.id)} className={`${linkClass} whitespace-nowrap`}>{r.wo.number}</Link>,
  },
  { key: "title", label: "Title", sort: (r) => r.wo.title, render: (r) => r.wo.title },
  { key: "tower", label: "Tower", sort: (r) => r.tower?.code ?? "", render: (r) => r.tower?.code ?? dash },
  {
    key: "asset", label: "Asset", mono: true, sort: (r) => r.assetTag,
    render: (r) => (r.wo.assetId ? <Link to={paths.asset(r.wo.assetId)} className={`${linkClass} whitespace-nowrap`}>{r.assetTag}</Link> : dash),
  },
  { key: "priority", label: "Priority", sort: (r) => r.wo.priority, render: (r) => <Badge tone={priorityTone(r.wo.priority)}>{r.wo.priority}</Badge> },
  {
    key: "status", label: "Status", sort: (r) => r.wo.status,
    render: (r) => <Badge tone={woStatusTone(r.wo.status, r.overdue)}>{words(r.wo.status)}</Badge>,
  },
  { key: "reported", label: "Reported", sort: (r) => r.wo.reportedAt, render: (r) => nowrap(fmtDate(r.wo.reportedAt)) },
  { key: "response", label: "Response", align: "right", sort: (r) => r.response ?? -1, render: (r) => fmtHours(r.response) },
];

const assetColumns: Column<ServedRow>[] = [
  {
    key: "tag", label: "Asset", mono: true, sort: (r) => r.asset.tag,
    render: (r) => <Link to={paths.asset(r.asset.id)} className={`${linkClass} whitespace-nowrap`}>{r.asset.tag}</Link>,
  },
  { key: "type", label: "Type", sort: (r) => r.typeName, render: (r) => r.typeName },
  { key: "tower", label: "Tower", sort: (r) => r.tower?.code ?? "", render: (r) => r.tower?.code ?? dash },
  { key: "model", label: "Brand · model", sort: (r) => `${r.brandName} ${r.modelNo}`, render: (r) => nowrap(`${r.brandName} · ${r.modelNo}`) },
  { key: "role", label: "Role", sort: (r) => r.role, render: (r) => nowrap(r.role) },
  {
    key: "status", label: "Status", sort: (r) => r.asset.status,
    render: (r) => <Badge tone={assetStatusTone(r.asset.status)}>{words(r.asset.status)}</Badge>,
  },
  { key: "warranty", label: "Warranty", sort: (r) => r.band, render: (r) => <Badge tone={warrantyTone(r.band)}>{BAND_LABEL[r.band]}</Badge> },
];

const planColumns: Column<PlanRow>[] = [
  {
    key: "asset", label: "Asset", mono: true, sort: (r) => r.assetTag,
    render: (r) => <Link to={paths.asset(r.plan.assetId)} className={`${linkClass} whitespace-nowrap`}>{r.assetTag}</Link>,
  },
  { key: "task", label: "Task", sort: (r) => r.plan.task, render: (r) => <Link to={paths.plan(r.plan.id)} className={linkClass}>{r.plan.task}</Link> },
  { key: "frequency", label: "Frequency", sort: (r) => r.plan.frequency, render: (r) => sentence(r.plan.frequency) },
  { key: "team", label: "Team", sort: (r) => r.plan.assigneeTeam, render: (r) => r.plan.assigneeTeam },
  { key: "last", label: "Last done", sort: (r) => r.plan.lastDone, render: (r) => nowrap(fmtDate(r.plan.lastDone)) },
  { key: "next", label: "Next due", sort: (r) => r.plan.nextDue, render: (r) => nowrap(fmtDate(r.plan.nextDue)) },
  { key: "state", label: "Status", sort: (r) => r.state, render: (r) => <Badge tone={dueTone(r.state)}>{words(r.state)}</Badge> },
];

const warrantyColumns: Column<WarrantyRow>[] = [
  {
    key: "tag", label: "Asset", mono: true, sort: (r) => r.asset.tag,
    render: (r) => <Link to={paths.asset(r.asset.id)} className={`${linkClass} whitespace-nowrap`}>{r.asset.tag}</Link>,
  },
  { key: "type", label: "Type", sort: (r) => r.typeName, render: (r) => r.typeName },
  { key: "tower", label: "Tower", sort: (r) => r.tower?.code ?? "", render: (r) => r.tower?.code ?? dash },
  { key: "end", label: "Ends", sort: (r) => r.warranty.end, render: (r) => nowrap(fmtDate(r.warranty.end)) },
  {
    key: "days", label: "Days left", align: "right", sort: (r) => r.days,
    render: (r) => <Badge tone={warrantyTone(r.band)}>{signedDays(r.days)}</Badge>,
  },
  { key: "coverage", label: "Coverage", sort: (r) => r.warranty.coverage, render: (r) => r.warranty.coverage },
  {
    key: "claim", label: "Claim sheet",
    render: (r) => (
      <Button to={claimHref(new URLSearchParams(), r.warranty.id)} size="sm" aria-label={`Claim sheet for ${r.asset.tag}`}>
        <FileText aria-hidden="true" className="size-4" strokeWidth={2} />
        Claim sheet
      </Button>
    ),
  },
];

export default function VendorDetailPage() {
  const { vendorId = "" } = useParams();
  const navigate = useNavigate();
  const d = useDb((db) => vendorDetail(db, vendorId));
  if (!d) return <NotFound what="vendor" id={vendorId} />;

  const { vendor, disciplines, brands, served, plans, orders, warranties } = d;
  const primary = vendor.contacts[0];
  const contract = vendor.contract;
  const contractDays = contract ? daysUntil(contract.end) : undefined;
  const contractState = contractDays === undefined ? "valid" : expiryState(contractDays, CONTRACT_ENDING_DAYS);
  const accreditationDays = vendor.accreditationExpiry ? daysUntil(vendor.accreditationExpiry) : undefined;
  const accreditationState = vendor.accreditationExpiry ? permitStatus(vendor.accreditationExpiry) : "valid";
  const slaBreached = !!contract && d.medianResponse !== null && d.medianResponse > contract.slaResponseHours;
  const ends = (days: number) => (days < 0 ? `Expired ${relDays(days)}` : `Ends ${relDays(days)}`);

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumb items={[{ to: paths.vendors(), label: "Vendors" }, { label: vendor.name }]} />
        <PageHeader
          eyebrow={`Vendor · ${words(vendor.kind)}`}
          title={
            <span className="flex items-center gap-3">
              <Monogram name={vendor.name} size="lg" />
              <span className="min-w-0 break-words">{vendor.name}</span>
            </span>
          }
          lede={disciplines.map((x) => x.name).join(" · ")}
          actions={
            <HeaderActions>
              {primary && (
                <Button to={telHref(primary.phone)} variant="primary" aria-label={`Call ${primary.name} on ${primary.phone}`}>
                  <Phone aria-hidden="true" className="size-4" strokeWidth={2} />
                  Call
                </Button>
              )}
              {primary && (
                <Button to={mailHref(primary.email)} aria-label={`Email ${primary.name} at ${primary.email}`}>
                  <Mail aria-hidden="true" className="size-4" strokeWidth={2} />
                  Email
                </Button>
              )}
              <Button to={paths.workOrders({ vendor: vendor.id })}>Work orders</Button>
              <Button to={paths.assets({ vendor: vendor.id })}>Assets</Button>
            </HeaderActions>
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="order-2 min-w-0 space-y-8 lg:order-1">
          <Section title="Work order history">
            <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatTile label="Work orders" value={fmtNumber(orders.length)} delta="assigned to this vendor" />
              <StatTile label="Open" value={fmtNumber(d.openCount)} delta="not done or cancelled" />
              <StatTile
                label="Median response"
                value={fmtHours(d.medianResponse)}
                tone={slaBreached ? "hot" : "default"}
                delta={contract ? `Contract SLA ${fmtNumber(contract.slaResponseHours)} h` : "No contract SLA"}
              />
            </div>
            <p className="type-small mb-3 text-muted">
              Response runs from reported to the first assigned or in-progress entry; {fmtNumber(d.timedCount)} of {fmtNumber(orders.length)} orders have one.
            </p>
            <DataTable
              columns={woColumns}
              rows={orders}
              rowKey={(r) => r.wo.id}
              maxHeight="480px"
              onRowClick={(r) => navigate(paths.workOrder(r.wo.id))}
              empty={<EmptyState icon={ClipboardList} title="No work orders" body="No work order has been assigned to this vendor." />}
            />
          </Section>

          <Section title={`Assets served (${fmtNumber(served.length)})`}>
            <DataTable
              columns={assetColumns}
              rows={served}
              rowKey={(r) => r.asset.id}
              maxHeight="480px"
              onRowClick={(r) => navigate(paths.asset(r.asset.id))}
              empty={<EmptyState icon={Box} title="No assets" body="This vendor neither services nor installed any asset." />}
            />
            <p className="type-small mt-2 text-muted">Service means the vendor maintains the asset; installer means it supplied and installed it, so it holds the warranty.</p>
          </Section>

          <Section title={`PM plans performed (${fmtNumber(plans.length)})`}>
            <DataTable
              columns={planColumns}
              rows={plans}
              rowKey={(r) => r.plan.id}
              maxHeight="480px"
              onRowClick={(r) => navigate(paths.plan(r.plan.id))}
              empty={<EmptyState icon={CalendarClock} title="No PM plans" body="No preventive maintenance plan names this vendor." />}
            />
          </Section>

          <Section title={`Warranties held (${fmtNumber(warranties.length)})`}>
            <DataTable
              columns={warrantyColumns}
              rows={warranties}
              rowKey={(r) => r.warranty.id}
              maxHeight="480px"
              onRowClick={(r) => navigate(paths.asset(r.asset.id))}
              empty={<EmptyState icon={ShieldCheck} title="No warranties" body="This vendor holds no warranty." />}
            />
          </Section>
        </div>

        <div className="order-1 min-w-0 space-y-4 lg:order-2">
          <Card title="Contacts">
            {vendor.contacts.length === 0 ? (
              <p className="type-small text-muted">No contacts on file.</p>
            ) : (
              <ul className="space-y-4">
                {vendor.contacts.map((c) => (
                  <li key={c.email} className="border-t border-line pt-4 first:border-t-0 first:pt-0">
                    <p className="text-[14px] font-bold text-ink">{c.name}</p>
                    <p className="type-small text-muted">{c.role}</p>
                    <p className="type-small mt-1 break-words text-ink-soft">{c.phone}</p>
                    <p className="type-small break-all text-ink-soft">{c.email}</p>
                    <ContactActions contact={c} className="mt-2.5" />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Contract">
            {contract && contractDays !== undefined ? (
              <div className="space-y-4">
                <KV
                  items={[
                    { k: "Reference", v: contract.ref, mono: true },
                    { k: "Term", v: `${fmtDate(contract.start)} – ${fmtDate(contract.end)}` },
                    { k: "Response", v: `within ${fmtNumber(contract.slaResponseHours)} h` },
                    { k: "Scope", v: contract.scope },
                  ]}
                />
                <Badge tone={permitTone(contractState)} dot>{ends(contractDays)}</Badge>
              </div>
            ) : (
              <p className="type-small text-muted">No service contract on file for this vendor.</p>
            )}
          </Card>

          {vendor.accreditationExpiry && accreditationDays !== undefined && (
            <Card title="Accreditation">
              <div className="space-y-4">
                <KV items={[{ k: "Expires", v: fmtDate(vendor.accreditationExpiry) }]} />
                <Badge tone={permitTone(accreditationState)} dot>{ends(accreditationDays)}</Badge>
              </div>
            </Card>
          )}

          {brands.length > 0 && (
            <Card title="Brands represented">
              <ul className="-mx-2 space-y-1">
                {brands.map((b) => (
                  <li key={b.id}>
                    <Link to={paths.brand(b.id)} className="focus-ring flex items-center gap-3 rounded-ctl p-2 transition-colors duration-150 hover:bg-surface-2">
                      <Monogram name={b.name} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-bold text-ink">{b.name}</span>
                        <span className="type-small block text-muted">{b.country}</span>
                      </span>
                      <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted" strokeWidth={2} />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
