import { ClipboardList } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { Badge, Button, DataTable, EmptyState, type Column } from "@/components/ui";
import { fmtDate } from "@/lib/dates";
import { paths } from "@/lib/paths";
import { resultTone } from "@/lib/status";
import { excerpt, INSPECTION_TYPE_LABEL, words, type InspectionRow } from "../lib";

const link = "focus-ring relative rounded hover:underline after:absolute after:inset-x-0 after:-inset-y-2.5 after:content-['']"; // the ::after grows the hit area toward 40px

/** Visits logged against one PM plan, newest first. `markDone` is the plan's own "Mark done" link, offered when nothing is logged yet. */
export function VisitHistory({ rows, markDone }: { rows: InspectionRow[]; markDone: string }) {
  const navigate = useNavigate();
  const columns: Column<InspectionRow>[] = [
    {
      key: "date", label: "Date", sort: (r) => r.log.date,
      render: (r) => <Link to={paths.inspection(r.log.id)} className={`${link} whitespace-nowrap`}>{fmtDate(r.log.date)}</Link>,
    },
    { key: "type", label: "Type", sort: (r) => INSPECTION_TYPE_LABEL[r.log.type], render: (r) => <span className="whitespace-nowrap">{INSPECTION_TYPE_LABEL[r.log.type]}</span> },
    { key: "inspector", label: "Inspector", sort: (r) => r.log.inspector, render: (r) => <span className="whitespace-nowrap">{r.log.inspector}</span> },
    { key: "result", label: "Result", sort: (r) => r.log.result, render: (r) => <Badge tone={resultTone(r.log.result)}>{words(r.log.result)}</Badge> },
    {
      key: "findings", label: "Findings",
      render: (r) => (
        <span className="block min-w-[200px] max-w-[320px] whitespace-normal text-ink-soft">
          {r.log.findings ? excerpt(r.log.findings, 80) : <span className="text-muted">None recorded</span>}
        </span>
      ),
    },
    {
      key: "workOrder", label: "Work order", mono: true, sort: (r) => r.workOrder?.number ?? "",
      render: (r) => (r.workOrder ? <Link to={paths.workOrder(r.workOrder.id)} className={`${link} whitespace-nowrap`}>{r.workOrder.number}</Link> : <span className="text-muted">—</span>),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.log.id}
      onRowClick={(r) => navigate(paths.inspection(r.log.id))}
      pageSize={12}
      maxHeight="460px"
      empty={
        <EmptyState
          icon={ClipboardList}
          title="No visits logged"
          body="Visits recorded against this plan will be listed here."
          action={<Button to={markDone} variant="ghost" size="sm">Mark done</Button>}
        />
      }
    />
  );
}
