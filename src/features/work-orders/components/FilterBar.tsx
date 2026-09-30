import type { ReactNode } from "react";
import { selectClass } from "@/components/ui";
import type { Db } from "@/data/types";
import { byName, KIND_LABEL, KINDS, PRIORITIES, priorityLabel, STATUS_LABEL, STATUSES, type WoFilters } from "../lib";

/** Same recipe as the other list pages: the label is screen-reader only, the "Any ..." option is the visible name. Two per row on a phone. */
function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: ReactNode }) {
  return (
    <label className="block w-[calc(50%-.375rem)] min-w-0 sm:w-44">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={selectClass}>
        {children}
      </select>
    </label>
  );
}

/** Tower / status / priority / kind / assignee / vendor selects. Every value lives in the route query (see useWoFilters). */
export function FilterBar({ db, filters, update, setTower }: {
  db: Db;
  filters: WoFilters;
  update: (patch: Record<string, string>) => void;
  setTower: (id: string) => void;
}) {
  const towers = Object.values(db.towers).sort(byName);
  const people = Object.values(db.teamMembers).sort(byName);
  const vendors = Object.values(db.vendors).sort(byName);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <FilterSelect label="Tower" value={filters.tower} onChange={setTower}>
        <option value="">All towers</option>
        {towers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </FilterSelect>
      <FilterSelect label="Status" value={filters.status} onChange={(v) => update({ status: v })}>
        <option value="">Any status</option>
        {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
      </FilterSelect>
      <FilterSelect label="Priority" value={filters.priority} onChange={(v) => update({ priority: v })}>
        <option value="">Any priority</option>
        {PRIORITIES.map((p) => <option key={p} value={p}>{priorityLabel(p)}</option>)}
      </FilterSelect>
      <FilterSelect label="Kind" value={filters.kind} onChange={(v) => update({ kind: v })}>
        <option value="">Any kind</option>
        {KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
      </FilterSelect>
      <FilterSelect label="Assignee" value={filters.assignee} onChange={(v) => update({ assignee: v })}>
        <option value="">Anyone</option>
        {people.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
      </FilterSelect>
      <FilterSelect label="Vendor" value={filters.vendor} onChange={(v) => update({ vendor: v })}>
        <option value="">Any vendor</option>
        {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
      </FilterSelect>
    </div>
  );
}
