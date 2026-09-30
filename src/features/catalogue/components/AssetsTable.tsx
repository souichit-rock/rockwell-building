import { Link, useNavigate } from "react-router";
import { Badge, DataTable, type Column } from "@/components/ui";
import { warrantyBand, warrantyFor } from "@/data/selectors";
import type { Asset, Db, ISODate, WarrantyBand } from "@/data/types";
import { fmtDate } from "@/lib/dates";
import { paths } from "@/lib/paths";
import { assetStatusTone, warrantyTone } from "@/lib/status";
import { BAND_LABEL, words } from "../lib";

interface Row { asset: Asset; end?: ISODate; band: WarrantyBand }

const link = "focus-ring rounded font-bold text-ink hover:underline";

/** Assets that use a brand or model: tag, (model), (tower), location, install date, status and warranty. Rows open the passport. */
export function AssetsTable({ db, assets, show = {} }: { db: Db; assets: Asset[]; show?: { tower?: boolean; model?: boolean } }) {
  const navigate = useNavigate();
  const rows: Row[] = assets.map((asset) => {
    const end = warrantyFor(db, asset.id)?.end;
    return { asset, end, band: warrantyBand(end) };
  });

  const tag: Column<Row> = {
    key: "tag", label: "Tag", mono: true, sort: (r) => r.asset.tag,
    render: (r) => <Link to={paths.asset(r.asset.id)} className={link}>{r.asset.tag}</Link>,
  };
  const model: Column<Row> = {
    key: "model", label: "Model", mono: true, sort: (r) => db.models[r.asset.modelId]?.modelNo ?? "",
    render: (r) => (
      <Link to={paths.model(r.asset.modelId)} className="focus-ring rounded hover:underline">
        {db.models[r.asset.modelId]?.modelNo ?? r.asset.modelId}
      </Link>
    ),
  };
  const tower: Column<Row> = {
    key: "tower", label: "Tower", sort: (r) => db.towers[r.asset.towerId]?.code ?? "",
    render: (r) => db.towers[r.asset.towerId]?.name ?? r.asset.towerId,
  };
  const rest: Column<Row>[] = [
    {
      key: "location", label: "Location", sort: (r) => db.floors[r.asset.floorId]?.level ?? 0,
      render: (r) => `${db.floors[r.asset.floorId]?.label ?? r.asset.floorId} · ${db.spaces[r.asset.spaceId]?.name ?? r.asset.spaceId}`,
    },
    { key: "installed", label: "Installed", sort: (r) => r.asset.installDate, render: (r) => fmtDate(r.asset.installDate) },
    {
      key: "status", label: "Status", sort: (r) => r.asset.status,
      render: (r) => <Badge tone={assetStatusTone(r.asset.status)}>{words(r.asset.status)}</Badge>,
    },
    {
      key: "warranty", label: "Warranty", sort: (r) => r.end ?? "",
      render: (r) => (
        <span className="flex flex-col items-start gap-1">
          <Badge tone={warrantyTone(r.band)}>{BAND_LABEL[r.band]}</Badge>
          {r.end && <span className="text-xs text-muted">to {fmtDate(r.end)}</span>}
        </span>
      ),
    },
  ];
  const columns = [tag, ...(show.model ? [model] : []), ...(show.tower ? [tower] : []), ...rest];

  return <DataTable columns={columns} rows={rows} rowKey={(r) => r.asset.id} onRowClick={(r) => navigate(paths.asset(r.asset.id))} maxHeight="none" />;
}
