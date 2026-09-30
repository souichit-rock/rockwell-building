import { Badge, Button, Card, EquipmentIcon, KV } from "@/components/ui";
import { useDb } from "@/data/store";
import type { Asset } from "@/data/types";
import { paths } from "@/lib/paths";
import { assetStatusTone, conditionTone } from "@/lib/status";
import { pick, words } from "../lib";

/** The asset a plan or an inspection belongs to: tag, type, room, condition and the two ways out (passport, floor plan). */
export function AssetCard({ asset }: { asset: Asset }) {
  const db = useDb((d) => d);
  const tower = pick(db.towers, asset.towerId);
  const floor = pick(db.floors, asset.floorId);
  const space = pick(db.spaces, asset.spaceId);
  const type = pick(db.equipmentTypes, asset.equipmentTypeId);
  const model = pick(db.models, asset.modelId);
  const brand = pick(db.brands, model?.brandId);

  return (
    <Card title="Asset">
      <div className="flex items-start gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-ctl bg-surface-2 text-ink-soft">
          {type && <EquipmentIcon name={type.icon} className="size-5" />}
        </div>
        <div className="min-w-0">
          <p className="font-mono text-[12px] font-bold text-ink">{asset.tag}</p>
          <p className="text-[14px] font-bold text-ink">{type?.name ?? "Unknown equipment"}</p>
          {brand && model && <p className="type-small text-muted">{brand.name} · <span className="font-mono text-[12px]">{model.modelNo}</span></p>}
        </div>
      </div>
      <KV
        className="mt-4"
        items={[
          { k: "Tower", v: tower?.name ?? "—" },
          { k: "Floor", v: floor?.label ?? "—" },
          { k: "Room", v: space?.name ?? "—" },
          { k: "Status", v: <Badge tone={assetStatusTone(asset.status)}>{words(asset.status)}</Badge> },
          { k: "Condition", v: <Badge tone={conditionTone(asset.condition)}>{asset.condition}</Badge> },
          { k: "Criticality", v: `Class ${asset.criticality}` },
        ]}
      />
      <div className="mt-4 flex flex-wrap gap-2">
        <Button to={paths.asset(asset.id)} variant="ghost" size="sm">Open passport</Button>
        {tower && floor && (
          <Button to={paths.floor(tower.id, floor.id, { highlight: `asset:${asset.id}` })} variant="ghost" size="sm">Show on plan</Button>
        )}
      </div>
    </Card>
  );
}
