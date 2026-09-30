import { CalendarX } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { Badge, DataTable, EmptyState, type Column } from "@/components/ui";
import { fmtDate } from "@/lib/dates";
import { paths } from "@/lib/paths";
import { dueTone } from "@/lib/status";
import { dueNote, FREQUENCY_LABEL, FREQUENCY_ORDER, words, type PlanRow } from "../lib";

const STATUS_ORDER = { overdue: 0, due: 1, "on-track": 2 } as const;
const link = "focus-ring relative rounded hover:underline after:absolute after:inset-x-0 after:-inset-y-2.5 after:content-['']"; // the ::after grows the hit area toward 40px

export function RegulatoryBadge({ row }: { row: PlanRow }) {
  if (!row.plan.regulatory) return <span className="text-muted">—</span>;
  const { permit, tower } = row;
  return (
    <Link
      to={paths.permits({ tower: tower.id, ...(permit ? { type: permit.type } : {}) })}
      title={permit ? `Permit ${permit.number}, expires ${fmtDate(permit.expiryDate)}` : "Regulatory plan"}
      className="focus-ring relative inline-block rounded-full after:absolute after:-inset-y-2 after:inset-x-0 after:content-['']"
    >
      <Badge tone="info">Regulatory</Badge>
    </Link>
  );
}

/** The PM schedule list (spec 6.8). Sorting and paging belong to DataTable; rows arrive already filtered and ordered by next due. */
export function PlanTable({ rows }: { rows: PlanRow[] }) {
  const navigate = useNavigate();
  const columns: Column<PlanRow>[] = [
    {
      key: "tag", label: "Asset", mono: true, sort: (r) => r.asset.tag,
      render: (r) => <Link to={paths.asset(r.asset.id)} className={`${link} whitespace-nowrap`}>{r.asset.tag}</Link>,
    },
    {
      key: "task", label: "Task", sort: (r) => r.plan.task,
      render: (r) => (
        <>
          <Link to={paths.plan(r.plan.id)} className={link}>{r.plan.task}</Link>
          <span className="block text-xs font-medium text-muted">{r.typeName}</span>
        </>
      ),
    },
    {
      key: "frequency", label: "Frequency", sort: (r) => FREQUENCY_ORDER[r.plan.frequency],
      render: (r) => <span className="whitespace-nowrap">{FREQUENCY_LABEL[r.plan.frequency]}</span>,
    },
    {
      key: "owner", label: "Team / vendor", sort: (r) => r.vendor?.name ?? r.plan.assigneeTeam,
      render: (r) =>
        r.vendor ? (
          <>
            <Link to={paths.vendor(r.vendor.id)} className={link}>{r.vendor.name}</Link>
            <span className="block text-xs font-medium text-muted">{r.plan.assigneeTeam} team</span>
          </>
        ) : (
          <span>{r.plan.assigneeTeam} team</span>
        ),
    },
    { key: "lastDone", label: "Last done", sort: (r) => r.plan.lastDone, render: (r) => <span className="whitespace-nowrap">{fmtDate(r.plan.lastDone)}</span> },
    {
      key: "nextDue", label: "Next due", sort: (r) => r.plan.nextDue,
      render: (r) => (
        <>
          <span className="whitespace-nowrap">{fmtDate(r.plan.nextDue)}</span>
          <span className="block whitespace-nowrap text-xs font-medium text-muted">{dueNote(r.plan.nextDue)}</span>
        </>
      ),
    },
    {
      key: "status", label: "Status", sort: (r) => STATUS_ORDER[r.status],
      render: (r) => <Badge tone={dueTone(r.status)}>{words(r.status)}</Badge>,
    },
    { key: "regulatory", label: "Regulatory", sort: (r) => (r.plan.regulatory ? 0 : 1), render: (r) => <RegulatoryBadge row={r} /> },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.plan.id}
      onRowClick={(r) => navigate(paths.plan(r.plan.id))}
      empty={<EmptyState icon={CalendarX} title="No PM plans" body="No plan matches these filters." />}
    />
  );
}
