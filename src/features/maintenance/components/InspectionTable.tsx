import { ChevronDown, ClipboardX } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Badge, cn, DataTable, EmptyState, type Column } from "@/components/ui";
import type { Id } from "@/data/types";
import { fmtDate } from "@/lib/dates";
import { fmtNumber, plural } from "@/lib/format";
import { paths } from "@/lib/paths";
import { resultTone } from "@/lib/status";
import { excerpt, INSPECTION_TYPE_LABEL, words, type InspectionRow } from "../lib";

const link = "focus-ring relative rounded hover:underline after:absolute after:inset-x-0 after:-inset-y-2.5 after:content-['']"; // the ::after grows the hit area toward 40px

/** The inspection log (spec 6.8). The Readings column expands a row in place: full findings plus every reading. */
export function InspectionTable({ rows }: { rows: InspectionRow[] }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState<ReadonlySet<Id>>(new Set());
  const toggle = (id: Id) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const columns: Column<InspectionRow>[] = [
    {
      key: "date", label: "Date", sort: (r) => r.log.date,
      render: (r) => <Link to={paths.inspection(r.log.id)} className={cn(link, "whitespace-nowrap")}>{fmtDate(r.log.date)}</Link>,
    },
    { key: "tower", label: "Tower", sort: (r) => r.tower.code, render: (r) => <span title={r.tower.name}>{r.tower.code}</span> },
    {
      key: "asset", label: "Asset", mono: true, sort: (r) => r.asset.tag,
      render: (r) => (
        <>
          <Link to={paths.asset(r.asset.id)} className={cn(link, "whitespace-nowrap")}>{r.asset.tag}</Link>
          <span className="block font-sans text-xs font-medium text-muted">{r.typeName}</span>
        </>
      ),
    },
    { key: "type", label: "Type", sort: (r) => INSPECTION_TYPE_LABEL[r.log.type], render: (r) => <span className="whitespace-nowrap">{INSPECTION_TYPE_LABEL[r.log.type]}</span> },
    { key: "inspector", label: "Inspector", sort: (r) => r.log.inspector, render: (r) => <span className="whitespace-nowrap">{r.log.inspector}</span> },
    { key: "result", label: "Result", sort: (r) => r.log.result, render: (r) => <Badge tone={resultTone(r.log.result)}>{words(r.log.result)}</Badge> },
    {
      key: "findings", label: "Findings",
      render: (r) => {
        const n = r.log.readings.length;
        const isOpen = open.has(r.log.id);
        return (
          <div className="min-w-[240px] max-w-[380px] whitespace-normal">
            <p className="text-ink-soft">
              {r.log.findings ? (isOpen ? r.log.findings : excerpt(r.log.findings, 90)) : <span className="text-muted">None recorded</span>}
            </p>
            {n > 0 && (
              <>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`readings-${r.log.id}`}
                  onClick={() => toggle(r.log.id)}
                  className="focus-ring relative mt-1 inline-flex h-8 items-center gap-1 rounded text-xs font-bold text-ink-soft transition-colors duration-150 after:absolute after:-inset-y-1 after:-inset-x-2 after:content-[''] hover:text-ink"
                >
                  <ChevronDown aria-hidden="true" className={cn("size-4 transition-transform duration-150", isOpen && "rotate-180")} strokeWidth={2} />
                  {plural(n, "reading")}
                </button>
                {isOpen && (
                  <dl id={`readings-${r.log.id}`} className="mt-1 space-y-1.5 rounded-ctl bg-surface-2 p-2.5 text-xs">
                    {r.log.readings.map((x, i) => (
                      <div key={`${i}-${x.label}`} className="flex justify-between gap-3">
                        <dt className="font-medium text-ink-soft">{x.label}</dt>
                        <dd className="m-0 whitespace-nowrap font-bold tabular-nums text-ink">
                          {fmtNumber(x.value)}
                          {x.unit ? ` ${x.unit}` : ""}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </>
            )}
          </div>
        );
      },
    },
    {
      key: "workOrder", label: "Work order", mono: true, sort: (r) => r.workOrder?.number ?? "",
      render: (r) =>
        r.workOrder ? <Link to={paths.workOrder(r.workOrder.id)} className={cn(link, "whitespace-nowrap")}>{r.workOrder.number}</Link> : <span className="text-muted">—</span>,
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.log.id}
      onRowClick={(r) => navigate(paths.inspection(r.log.id))}
      empty={<EmptyState icon={ClipboardX} title="No inspections" body="No inspection matches these filters." />}
    />
  );
}
