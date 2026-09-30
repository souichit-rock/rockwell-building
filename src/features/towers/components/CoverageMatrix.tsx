import { CircleCheck, CircleX, FileText, TriangleAlert } from "lucide-react";
import { Link } from "react-router";
import { Badge, EmptyState } from "@/components/ui";
import type { CoverageCell, Db, Id } from "@/data/types";
import { paths } from "@/lib/paths";
import { cellKey, COVERAGE_LABEL, COVERAGE_TONE, FLOOR_KIND_LABEL, type CoverageModel } from "../lib";

const ICON = { current: CircleCheck, superseded: TriangleAlert, missing: CircleX } as const;

function Status({ status }: { status: CoverageCell["status"] }) {
  const Icon = ICON[status];
  return (
    <Badge tone={COVERAGE_TONE[status]}>
      <Icon aria-hidden="true" className="size-3.5" strokeWidth={2} />
      {COVERAGE_LABEL[status]}
    </Badge>
  );
}

const th = "border-b-[1.5px] border-line bg-surface px-3 py-2.5 text-[10px] font-extrabold uppercase tracking-[.11em] text-muted";
const td = "border-b border-line px-3 py-2 text-center align-middle group-last:border-b-0";

/**
 * Floors that hold assets (rows) by disciplines present in the tower (columns). Every cell is a CoverageCell from asBuiltCoverage:
 * current, superseded or missing. A blank means no asset of that discipline is on that floor, so there is nothing to document.
 */
export function CoverageMatrix({ db, towerId, model }: { db: Db; towerId: Id; model: CoverageModel }) {
  if (model.cells.size === 0) {
    return <EmptyState icon={FileText} title="No coverage to report" body="No equipment is registered in this tower yet, so no as-built sheet is expected." />;
  }
  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] border-separate border-spacing-0 text-[13px]">
          <caption className="sr-only">As-built sheet status for each floor and discipline that holds equipment</caption>
          <thead>
            <tr>
              <th scope="col" className={`${th} sticky left-0 z-10 text-left`}>Floor</th>
              {model.disciplines.map((d) => (
                <th key={d.id} scope="col" title={d.name} className={`${th} text-center`}>{d.id}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {model.floors.map((f) => (
              <tr key={f.id} className="group transition-colors duration-150 hover:bg-surface-2">
                <th
                  scope="row"
                  className="sticky left-0 z-[1] whitespace-nowrap border-b border-line bg-surface px-3 py-2 text-left font-semibold text-ink transition-colors duration-150 group-last:border-b-0 group-hover:bg-surface-2"
                >
                  <Link to={paths.floor(towerId, f.id)} className="focus-ring relative rounded hover:underline after:absolute after:-inset-x-2 after:-inset-y-2.5 after:content-['']">{f.label}</Link>
                  <span className="ml-2 text-xs font-medium text-muted">{FLOOR_KIND_LABEL[f.kind]}</span>
                </th>
                {model.disciplines.map((d) => {
                  const cell = model.cells.get(cellKey(f.id, d.id));
                  if (!cell) {
                    return (
                      <td key={d.id} className={td}>
                        <span className="text-muted" title={`No ${d.name} equipment on ${f.label}`}>
                          <span aria-hidden="true">–</span>
                          <span className="sr-only">No {d.name} equipment on {f.label}</span>
                        </span>
                      </td>
                    );
                  }
                  const doc = cell.docId ? db.documents[cell.docId] : undefined;
                  const to = doc ? paths.document(doc.id) : paths.documents({ tower: towerId, discipline: d.id, type: "as-built", current: 0 });
                  const title = doc ? `${doc.docNo} · ${doc.title}` : `No as-built for ${d.name} on ${f.label}. Open the register.`;
                  return (
                    <td key={d.id} className={td}>
                      <Link
                        to={to}
                        title={title}
                        aria-label={`${d.name} on ${f.label}: ${COVERAGE_LABEL[cell.status]}`}
                        className="focus-ring relative inline-block rounded-full after:absolute after:-inset-x-1 after:-inset-y-2 after:content-['']"
                      >
                        <Status status={cell.status} />
                      </Link>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line px-4 py-3 text-xs text-muted">
        <span className="font-extrabold uppercase tracking-[.11em]">Key</span>
        <Status status="current" />
        <Status status="superseded" />
        <Status status="missing" />
        <span>– no equipment of that discipline on the floor</span>
      </div>
      <p className="border-t border-line px-4 py-3 text-xs text-muted">
        {model.disciplines.map((d) => `${d.id} ${d.name}`).join(" · ")}
      </p>
    </div>
  );
}
