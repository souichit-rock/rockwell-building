import { useSearchParams } from "react-router";
import { NotFound } from "@/app/NotFound";
import { Breadcrumb, PageHeader } from "@/components/ui";
import { useDb } from "@/data/store";
import { paths } from "@/lib/paths";
import { InspectionForm } from "../components/InspectionForm";
import { pick } from "../lib";

/** New inspection (spec 6.8). `?assetId=` and `?planId=` prefill the form; a plan without an asset id brings its own asset. */
export default function NewInspectionPage() {
  const [sp] = useSearchParams();
  const db = useDb((d) => d);
  const assetId = sp.get("assetId") || undefined;
  const planId = sp.get("planId") || undefined;
  const plan = pick(db.pmPlans, planId);
  const asset = pick(db.assets, assetId ?? plan?.assetId);

  if (planId && !plan) return <NotFound what="PM plan" id={planId} />;
  if (assetId && !asset) return <NotFound what="asset" id={assetId} />;

  const own = plan && asset && plan.assetId === asset.id ? plan : undefined; // a plan for another asset is ignored, as the form does
  const context = own && asset ? `${asset.tag} · ${own.task}` : asset ? asset.tag : "Facilities";

  return (
    <div>
      <Breadcrumb
        items={[{ to: paths.maintenance(), label: "Maintenance" }, { to: paths.inspections(), label: "Inspections" }, { label: "Log inspection" }]}
      />
      <PageHeader
        eyebrow={context}
        title="Log inspection"
        lede={
          own
            ? "Record the visit. Saving it reschedules this PM plan from the visit date."
            : "Record a visit, test or survey against an asset. Pick a PM plan to reschedule it from the visit date."
        }
      />
      <InspectionForm key={`${asset?.id ?? ""}|${own?.id ?? ""}`} initialAssetId={asset?.id} initialPlanId={own?.id} />
    </div>
  );
}
