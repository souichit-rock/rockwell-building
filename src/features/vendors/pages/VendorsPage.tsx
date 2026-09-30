import { Download, Users } from "lucide-react";
import { Button, Chip, EmptyState, Field, PageHeader, StatTile, selectClass } from "@/components/ui";
import { useDb } from "@/data/store";
import { downloadCsv, type CsvColumn } from "@/lib/csv";
import { plural } from "@/lib/format";
import { TowerFilter } from "../components/bits";
import { VendorCard } from "../components/VendorCard";
import { useQueryFilters } from "../filters";
import { ACCREDITATION_DUE_DAYS, VENDOR_KINDS, isVendorKind, sentence, vendorRows, type VendorRow } from "../lib";

const iso = (d?: string) => d ?? "";

const CSV_COLUMNS: CsvColumn<VendorRow>[] = [
  { label: "Vendor", value: (r) => r.vendor.name },
  { label: "Kind", value: (r) => sentence(r.vendor.kind) },
  { label: "Disciplines", value: (r) => r.disciplines.map((d) => d.name).join("; ") },
  { label: "Primary contact", value: (r) => r.primary?.name },
  { label: "Contact role", value: (r) => r.primary?.role },
  { label: "Phone", value: (r) => r.primary?.phone },
  { label: "Email", value: (r) => r.primary?.email },
  { label: "Contract ref", value: (r) => r.vendor.contract?.ref },
  { label: "Contract start", value: (r) => iso(r.vendor.contract?.start) },
  { label: "Contract end", value: (r) => iso(r.vendor.contract?.end) },
  { label: "SLA response (h)", value: (r) => r.vendor.contract?.slaResponseHours },
  { label: "Accreditation expiry", value: (r) => iso(r.vendor.accreditationExpiry) },
  { label: "Assets served", value: (r) => r.served.length },
  { label: "Open work orders", value: (r) => r.openWos },
];

export default function VendorsPage() {
  const f = useQueryFilters();
  const rows = useDb((db) => vendorRows(db, f.towerId));
  const disciplines = useDb((db) => Object.values(db.disciplines).sort((a, b) => a.order - b.order));

  const kindParam = f.get("kind");
  const kind = isVendorKind(kindParam) ? kindParam : undefined;
  const discipline = disciplines.find((d) => d.id === f.get("discipline"))?.id;

  // Discipline chips count against the other two filters, so they always show what a click would give.
  const byKind = rows.filter((r) => !kind || r.vendor.kind === kind);
  const shown = byKind.filter((r) => !discipline || r.vendor.disciplineIds.includes(discipline));
  const chips = disciplines.filter((d) => discipline === d.id || byKind.some((r) => r.vendor.disciplineIds.includes(d.id)));

  const accreditationDue = shown.filter((r) => r.accreditationDays !== undefined && r.accreditationDays <= ACCREDITATION_DUE_DAYS).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Facilities"
        title="Vendors & contacts"
        lede="Who to call, what they are contracted for, and how fast they have to respond."
        actions={
          <Button variant="ghost" disabled={shown.length === 0} onClick={() => downloadCsv("vendors", CSV_COLUMNS, shown)}>
            <Download aria-hidden="true" className="size-4" strokeWidth={2} />
            Export CSV
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Vendors"
          value={shown.length}
          delta={kind || discipline ? `of ${rows.length} in scope` : f.towerId ? "serving this tower" : "in the directory"}
        />
        <StatTile label="Under contract" value={shown.filter((r) => r.contractActive).length} delta="contract running today" />
        <StatTile
          label={`Accreditation ≤ ${ACCREDITATION_DUE_DAYS} d`}
          value={accreditationDue}
          tone={accreditationDue > 0 ? "hot" : "default"}
          delta="ending soon or lapsed"
        />
        <StatTile label="Open work orders" value={shown.reduce((n, r) => n + r.openWos, 0)} delta="assigned to these vendors" />
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Kind" className="w-full sm:w-56">
            <select className={selectClass} value={kind ?? ""} onChange={(e) => f.update({ kind: e.target.value })}>
              <option value="">All kinds</option>
              {VENDOR_KINDS.map((k) => (
                <option key={k} value={k}>{sentence(k)}</option>
              ))}
            </select>
          </Field>
          <TowerFilter filters={f} className="w-full sm:w-64" />
        </div>
        <div role="group" aria-label="Discipline" className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          <Chip label="All disciplines" active={!discipline} count={byKind.length} onClick={() => f.update({ discipline: null })} />
          {chips.map((d) => (
            <Chip
              key={d.id}
              label={d.name}
              active={discipline === d.id}
              count={byKind.filter((r) => r.vendor.disciplineIds.includes(d.id)).length}
              onClick={() => f.update({ discipline: discipline === d.id ? null : d.id })}
            />
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No vendors match"
          body="No vendor fits these filters. Try another kind, discipline or tower."
          action={
            <Button variant="ghost" size="sm" onClick={() => f.update({ kind: null, discipline: null, tower: null })}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <>
          <p className="type-small text-muted">Showing {plural(shown.length, "vendor")}.</p>
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {shown.map((row) => (
              <li key={row.vendor.id} className="min-w-0">
                <VendorCard row={row} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
