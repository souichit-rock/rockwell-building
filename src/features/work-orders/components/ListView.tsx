import { Download } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { Badge, Button, DataTable, type Column } from "@/components/ui";
import { isOverdueWo } from "@/data/selectors";
import type { Db, WorkOrder } from "@/data/types";
import { downloadCsv, type CsvColumn } from "@/lib/csv";
import { fmtDateTime } from "@/lib/dates";
import { plural } from "@/lib/format";
import { paths } from "@/lib/paths";
import { priorityTone, woStatusTone } from "@/lib/status";
import { ageMs, badgeText, dueLine, KIND_LABEL, span, STATUSES } from "../lib";

const link = "focus-ring rounded hover:underline";

/** Work orders as a sortable table (50 per page) with a CSV export of exactly the rows shown. */
export function ListView({ db, rows, now }: { db: Db; rows: WorkOrder[]; now: number }) {
  const navigate = useNavigate();
  const towerName = (w: WorkOrder) => db.towers[w.towerId]?.name ?? w.towerId;
  const assigneeName = (w: WorkOrder) => (w.assignedToId ? db.teamMembers[w.assignedToId]?.name : undefined) ?? "";
  const vendorName = (w: WorkOrder) => (w.vendorId ? db.vendors[w.vendorId]?.name : undefined) ?? "";
  const tagOf = (w: WorkOrder) => (w.assetId ? db.assets[w.assetId]?.tag : undefined) ?? "";

  const columns: Column<WorkOrder>[] = [
    {
      key: "number", label: "Number", mono: true, sort: (w) => w.number,
      render: (w) => <Link to={paths.workOrder(w.id)} className={link}>{w.number}</Link>,
    },
    {
      key: "title", label: "Title", sort: (w) => w.title,
      render: (w) => <Link to={paths.workOrder(w.id)} className={link}>{w.title}</Link>,
    },
    { key: "tower", label: "Tower", sort: towerName, render: towerName },
    {
      key: "asset", label: "Asset", mono: true, sort: tagOf,
      render: (w) => (w.assetId && tagOf(w) ? <Link to={paths.asset(w.assetId)} className={link}>{tagOf(w)}</Link> : "—"),
    },
    { key: "kind", label: "Kind", sort: (w) => w.kind, render: (w) => KIND_LABEL[w.kind] },
    { key: "priority", label: "Priority", sort: (w) => w.priority, render: (w) => <Badge tone={priorityTone(w.priority)}>{w.priority}</Badge> },
    {
      key: "status", label: "Status", sort: (w) => STATUSES.indexOf(w.status),
      render: (w) => <Badge tone={woStatusTone(w.status, isOverdueWo(w, now))}>{badgeText(w.status)}</Badge>,
    },
    {
      key: "assigned", label: "Assigned to", sort: (w) => assigneeName(w) || vendorName(w),
      render: (w) =>
        assigneeName(w) || vendorName(w) ? (
          <span className="block">
            {assigneeName(w) || vendorName(w)}
            {assigneeName(w) && vendorName(w) && <span className="block text-xs font-medium text-muted">{vendorName(w)}</span>}
          </span>
        ) : (
          <span className="text-muted">Unassigned</span>
        ),
    },
    { key: "age", label: "Age", align: "right", sort: (w) => ageMs(w, now), render: (w) => span(ageMs(w, now)) },
    {
      key: "due", label: "Due", sort: (w) => Date.parse(w.dueAt),
      render: (w) => (
        <span className="whitespace-nowrap">
          {fmtDateTime(w.dueAt)}
          {isOverdueWo(w, now) && <span className="block text-xs font-bold text-danger-deep">{dueLine(w, now)}</span>}
        </span>
      ),
    },
  ];

  const csv: CsvColumn<WorkOrder>[] = [
    { label: "Number", value: (w) => w.number },
    { label: "Title", value: (w) => w.title },
    { label: "Tower", value: towerName },
    { label: "Asset", value: tagOf },
    { label: "Kind", value: (w) => KIND_LABEL[w.kind] },
    { label: "Priority", value: (w) => w.priority },
    { label: "Status", value: (w) => badgeText(w.status) },
    { label: "Overdue", value: (w) => (isOverdueWo(w, now) ? "Yes" : "No") },
    { label: "Assigned to", value: assigneeName },
    { label: "Vendor", value: vendorName },
    { label: "Reported", value: (w) => fmtDateTime(w.reportedAt) },
    { label: "Due", value: (w) => fmtDateTime(w.dueAt) },
    { label: "Completed", value: (w) => (w.completedAt ? fmtDateTime(w.completedAt) : "") },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="type-small text-muted">{plural(rows.length, "work order")}</p>
        <Button variant="ghost" size="sm" onClick={() => downloadCsv("work-orders", csv, rows)}>
          <Download aria-hidden="true" className="size-4" strokeWidth={2} />
          Export CSV
        </Button>
      </div>
      <DataTable columns={columns} rows={rows} rowKey={(w) => w.id} onRowClick={(w) => navigate(paths.workOrder(w.id))} />
    </div>
  );
}
