import type { ReactNode } from "react";
import { useSearchParams } from "react-router";
import { PageHeader, Tabs } from "@/components/ui";
import { paths } from "@/lib/paths";

// ponytail: paths.standards() / paths.compliance() take no query yet, so the tower is appended here; foundation patch is in the review notes.
const withTower = (to: string, tower: string | undefined) => (tower ? `${to}?tower=${encodeURIComponent(tower)}` : to);

/**
 * The shared header of the three list routes: "Design standards" with the Standards / Finishes / Compliance route tabs.
 * An explicit ?tower= travels with the tab switch (the shell scope already persists on its own).
 */
export function StandardsHeader({ lede, actions }: { lede?: ReactNode; actions?: ReactNode }) {
  const [params] = useSearchParams();
  const tower = params.get("tower") ?? undefined;
  return (
    <PageHeader eyebrow="Registry" title="Design standards" lede={lede} actions={actions}>
      <Tabs
        items={[
          { label: "Standards", to: withTower(paths.standards(), tower) },
          { label: "Finishes", to: paths.finishes({ tower }) },
          { label: "Compliance", to: withTower(paths.compliance(), tower) },
        ]}
      />
    </PageHeader>
  );
}
