import type { ReactNode } from "react";
import { useSearchParams } from "react-router";
import { PageHeader, Tabs } from "@/components/ui";
import { paths } from "@/lib/paths";

/** Shared header of the two list routes: title plus the Register / Permits route tabs. An explicit ?tower= travels with the tab switch. */
export function DocsHeader({ actions }: { actions?: ReactNode }) {
  const [params] = useSearchParams();
  const tower = params.get("tower") ?? undefined;
  return (
    <PageHeader
      eyebrow="Registry"
      title="Documents"
      lede="Drawings, manuals and reports by tower, floor and asset, with the permits that keep each tower compliant."
      actions={actions}
    >
      <Tabs items={[{ label: "Register", to: paths.documents({ tower }), end: true }, { label: "Permits", to: paths.permits({ tower }) }]} />
    </PageHeader>
  );
}
