import { Field, selectClass } from "@/components/ui";
import type { Db } from "@/data/types";
import { byName, KIND_LABEL, KINDS, PRIORITIES, priorityLabel, STATUS_LABEL, STATUSES, type WoFilters } from "../lib";

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
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      <Field label="Tower">
        <select className={selectClass} value={filters.tower} onChange={(e) => setTower(e.target.value)}>
          <option value="">All towers</option>
          {towers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </Field>
      <Field label="Status">
        <select className={selectClass} value={filters.status} onChange={(e) => update({ status: e.target.value })}>
          <option value="">Any status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
      </Field>
      <Field label="Priority">
        <select className={selectClass} value={filters.priority} onChange={(e) => update({ priority: e.target.value })}>
          <option value="">Any priority</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{priorityLabel(p)}</option>)}
        </select>
      </Field>
      <Field label="Kind">
        <select className={selectClass} value={filters.kind} onChange={(e) => update({ kind: e.target.value })}>
          <option value="">Any kind</option>
          {KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
        </select>
      </Field>
      <Field label="Assignee">
        <select className={selectClass} value={filters.assignee} onChange={(e) => update({ assignee: e.target.value })}>
          <option value="">Anyone</option>
          {people.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </Field>
      <Field label="Vendor">
        <select className={selectClass} value={filters.vendor} onChange={(e) => update({ vendor: e.target.value })}>
          <option value="">Any vendor</option>
          {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      </Field>
    </div>
  );
}
