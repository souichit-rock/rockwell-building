import { ClipboardCheck, Pencil, Printer, Wrench } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import NotFound from "@/app/NotFound";
import { Badge, Breadcrumb, Button, Notice, PageHeader, Tabs, cn } from "@/components/ui";
import { useDb } from "@/data/store";
import type { Asset } from "@/data/types";
import { todayISO, fmtDate } from "@/lib/dates";
import { paths } from "@/lib/paths";
import { assetStatusTone, conditionTone } from "@/lib/status";
import { DocumentsTab } from "../components/DocumentsTab";
import { EditAssetModal } from "../components/EditAssetModal";
import { HistoryTab } from "../components/HistoryTab";
import { MaintenanceTab } from "../components/MaintenanceTab";
import { OverviewTab } from "../components/OverviewTab";
import { TAB_KEYS, passportOf, sequenceOf, words, type TabKey } from "../lib";

function PassportView({ asset }: { asset: Asset }) {
  const db = useDb((d) => d);
  const p = useMemo(() => passportOf(db, asset), [db, asset]);
  const [sp, setSp] = useSearchParams();
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!saved) return;
    const t = window.setTimeout(() => setSaved(false), 6000);
    return () => window.clearTimeout(t);
  }, [saved]);

  if (!p) return <NotFound what="asset" id={asset.id} />;

  const requested = sp.get("tab");
  const tab: TabKey = TAB_KEYS.find((k) => k === requested) ?? "overview";
  const setTab = (key: string) =>
    setSp((prev) => {
      const next = new URLSearchParams(prev);
      if (key === "overview") next.delete("tab");
      else next.set("tab", key);
      return next;
    }, { replace: true });

  const { tower, floor, space, type } = p;
  return (
    <div>
      <div className="print:hidden">
        <Breadcrumb
          items={[
            { to: paths.assets(), label: "Assets" },
            { to: paths.assets({ tower: tower.id }), label: tower.name },
            { label: asset.tag },
          ]}
        />
      </div>

      <PageHeader
        eyebrow={`${tower.name} · ${floor.label} · ${space.name}`}
        title={`${type.name} ${sequenceOf(asset.tag)}`}
        lede={
          <>
            <span className="font-mono text-[13px]">{asset.tag}</span> · S/N <span className="font-mono text-[13px]">{asset.serial}</span>
          </>
        }
        actions={
          <>
            <Button to={paths.newWorkOrder({ assetId: asset.id })} variant="primary" className="print:hidden">
              <Wrench aria-hidden="true" className="size-4" strokeWidth={2} />
              Raise work order
            </Button>
            <Button to={paths.newInspection({ assetId: asset.id })} variant="ghost" className="print:hidden">
              <ClipboardCheck aria-hidden="true" className="size-4" strokeWidth={2} />
              Log visit
            </Button>
            <Button variant="ghost" className="print:hidden" onClick={() => setEditing(true)}>
              <Pencil aria-hidden="true" className="size-4" strokeWidth={2} />
              Edit
            </Button>
            <Button variant="ghost" className="print:hidden" onClick={() => window.print()}>
              <Printer aria-hidden="true" className="size-4" strokeWidth={2} />
              Print
            </Button>
          </>
        }
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge tone={assetStatusTone(asset.status)}>{words(asset.status)}</Badge>
          <Badge tone={conditionTone(asset.condition)}>{asset.condition} condition</Badge>
          <Badge tone="neutral">Criticality {asset.criticality}</Badge>
        </div>
        <Tabs
          className="print:hidden"
          value={tab}
          onChange={setTab}
          items={[
            { key: "overview", label: "Overview" },
            { key: "documents", label: "Documents", count: p.docCount },
            { key: "maintenance", label: "Maintenance", count: p.plans.length + p.openWos.length },
            { key: "history", label: "History", count: p.history.length },
          ]}
        />
      </PageHeader>

      {saved && <Notice tone="ok" className="mb-4 print:hidden">Asset updated. Demo edits stay in this browser until you reset the demo data.</Notice>}

      {/* the overview stays mounted so a print from any tab is still the one-page passport */}
      <div role="tabpanel" aria-label="Overview" className={cn(tab !== "overview" && "hidden print:block")}>
        <OverviewTab p={p} onTab={setTab} />
      </div>
      {tab === "documents" && <div role="tabpanel" aria-label="Documents" className="print:hidden"><DocumentsTab p={p} /></div>}
      {tab === "maintenance" && <div role="tabpanel" aria-label="Maintenance" className="print:hidden"><MaintenanceTab p={p} /></div>}
      {tab === "history" && <div role="tabpanel" aria-label="History" className="print:hidden"><HistoryTab p={p} /></div>}

      <p className="type-small mt-4 hidden text-muted print:block">
        Printed {fmtDate(todayISO())} from Rockwell Building · Sample data for demonstration
      </p>

      <EditAssetModal asset={asset} open={editing} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); setSaved(true); }} />
    </div>
  );
}

export default function AssetPassport() {
  const { assetId = "" } = useParams();
  const asset = useDb((db) => db.assets[assetId]);
  return asset ? <PassportView asset={asset} /> : <NotFound what="asset" id={assetId} />;
}
