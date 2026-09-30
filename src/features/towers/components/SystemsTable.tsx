import { Boxes } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { Badge, DataTable, EmptyState, type Column } from "@/components/ui";
import type { Id } from "@/data/types";
import { plural } from "@/lib/format";
import { paths } from "@/lib/paths";
import { complianceTone, dueTone } from "@/lib/status";
import type { SystemRow } from "../lib";

const pct = (r: SystemRow) => Math.round((r.ok / r.governed) * 100);

/** One row per discipline with assets. Compliance = (compliant + waived) / assets that have a governing standard. */
export function SystemsTable({ towerId, rows }: { towerId: Id; rows: SystemRow[] }) {
  const navigate = useNavigate();
  const open = (r: SystemRow) => navigate(paths.assets({ tower: towerId, discipline: r.id }));

  const columns: Column<SystemRow>[] = [
    {
      key: "name", label: "System", sort: (r) => r.name,
      render: (r) => (
        <Link to={paths.assets({ tower: towerId, discipline: r.id })} className="focus-ring rounded hover:underline">{r.name}</Link>
      ),
    },
    { key: "assets", label: "Assets", align: "right", sort: (r) => r.assets },
    {
      key: "overduePm", label: "Overdue PM", align: "right", sort: (r) => r.overduePm,
      render: (r) => (r.overduePm > 0 ? <Badge tone={dueTone("overdue")}>{r.overduePm}</Badge> : <span className="text-muted">0</span>),
    },
    { key: "openWos", label: "Open WOs", align: "right", sort: (r) => r.openWos },
    {
      key: "compliance", label: "Compliance", align: "right", sort: (r) => (r.governed > 0 ? r.ok / r.governed : -1),
      render: (r) =>
        r.governed === 0 ? (
          <span className="text-muted" title="No asset in this system has a governing standard">n/a</span>
        ) : (
          <span className="inline-flex flex-wrap items-center justify-end gap-1.5">
            <span title={`${r.ok} of ${r.governed} assets compliant or waived`}>{pct(r)}%</span>
            {r.deviations > 0 && <Badge tone={complianceTone("deviation")}>{plural(r.deviations, "deviation")}</Badge>}
            {r.phaseOut > 0 && <Badge tone={complianceTone("phase-out")}>{r.phaseOut} phase-out</Badge>}
          </span>
        ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      onRowClick={open}
      maxHeight="none"
      empty={<EmptyState icon={Boxes} title="No systems yet" body="No equipment is registered in this tower, so there is nothing to summarise." />}
    />
  );
}
