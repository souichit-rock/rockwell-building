import type { ReactNode } from "react";
import { PageHeader, Tabs, type TabItem } from "@/components/ui";
import { paths } from "@/lib/paths";

const TABS: TabItem[] = [
  { label: "Standards", to: paths.standards() },
  { label: "Finishes", to: paths.finishes() },
  { label: "Compliance", to: paths.compliance() },
];

/** The shared header of the three list routes: "Design standards" with the Standards / Finishes / Compliance route tabs. */
export function StandardsHeader({ lede, actions }: { lede?: ReactNode; actions?: ReactNode }) {
  return (
    <PageHeader eyebrow="Registry" title="Design standards" lede={lede} actions={actions}>
      <Tabs items={TABS} />
    </PageHeader>
  );
}
