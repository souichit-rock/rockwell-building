import type { ReactNode } from "react";
import { PageHeader, Tabs } from "@/components/ui";
import { paths } from "@/lib/paths";

/** "Maintenance" header with the Schedule / Inspections route tabs; `tower` keeps an explicit ?tower= across the two tabs. */
export function MaintenanceHeader({ tower, actions }: { tower?: string; actions?: ReactNode }) {
  return (
    <PageHeader
      eyebrow="Facilities"
      title="Maintenance"
      lede="Preventive maintenance plans by due date, and the log of every visit, test and survey."
      actions={actions}
    >
      <Tabs
        items={[
          { label: "Schedule", to: paths.maintenance({ tower }), end: true },
          { label: "Inspections", to: paths.inspections({ tower }), end: true },
        ]}
      />
    </PageHeader>
  );
}
