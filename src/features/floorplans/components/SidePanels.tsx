import { ChevronRight, Inbox } from "lucide-react";
import { Badge, Button, Card, EmptyState, EquipmentIcon, cn } from "@/components/ui";
import { assetsIn } from "@/data/selectors";
import type { Db, Id, Space } from "@/data/types";
import { fmtSqm, plural } from "@/lib/format";
import { paths } from "@/lib/paths";
import { assetStatusTone } from "@/lib/status";
import { TONE_BG, kindLabel, toneOf, words, type Sel } from "../lib";

const ROW =
  "focus-ring flex min-h-10 w-full items-center gap-3 rounded-ctl px-3 py-2 text-left transition-colors duration-150 hover:bg-surface-2";

/** Every room on the floor with its asset count, busiest first. The buttons are also the keyboard route to a room, which the SVG itself does not offer. */
export function SpaceList({ spaces, counts, selectedId, onSelect }: {
  spaces: Space[];
  counts: Map<Id, number>;
  selectedId: Id | undefined;
  onSelect: (spaceId: Id) => void;
}) {
  const ordered = [...spaces].sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0));
  return (
    <Card title="Spaces" actions={<span className="text-xs font-bold tabular-nums text-muted">{spaces.length}</span>} tight>
      {spaces.length === 0 ? (
        <EmptyState icon={Inbox} title="No spaces" body="This floor has no rooms in the register." />
      ) : (
        <ul className="-mx-2 max-h-[420px] space-y-0.5 overflow-y-auto px-2">
          {ordered.map((s) => {
            const n = counts.get(s.id) ?? 0;
            const selected = s.id === selectedId;
            return (
              <li key={s.id}>
                <button type="button" aria-pressed={selected} onClick={() => onSelect(s.id)} className={cn(ROW, selected && "bg-gold-soft")}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-ink">{s.name}</span>
                    <span className="block truncate font-mono text-[11px] text-muted">{s.code} · {kindLabel(s.kind)}</span>
                  </span>
                  {n > 0 ? <Badge tone="neutral">{n}</Badge> : <span aria-label="no assets" className="text-xs text-muted">—</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

const Clear = ({ onClick }: { onClick: () => void }) => (
  <Button variant="ghost" size="sm" onClick={onClick}>Clear</Button>
);

/** The non-modal card beside the plan: the room that was clicked, or the pin that a deep link selected. */
export function SelectionPanel({ db, sel, onClear, onOpenAsset, onQuickView }: {
  db: Db;
  sel: Sel;
  onClear: () => void;
  onOpenAsset: (assetId: Id) => void;
  onQuickView: () => void;
}) {
  if (!sel) return null;

  if (sel.kind === "asset") {
    const asset = db.assets[sel.id];
    const type = asset && db.equipmentTypes[asset.equipmentTypeId];
    if (!asset || !type) return null;
    return (
      <Card title="Selected asset" actions={<Clear onClick={onClear} />} tight>
        <div className="flex items-start gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-ctl bg-surface-2 text-ink-soft">
            <EquipmentIcon name={type.icon} />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[13px] font-bold text-ink">{asset.tag}</p>
            <p className="text-[13px] text-ink-soft">{type.name}</p>
            <Badge tone={assetStatusTone(asset.status)} dot className="mt-2">{words(asset.status)}</Badge>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={onQuickView}>Quick view</Button>
          <Button variant="ghost" size="sm" to={paths.asset(asset.id)}>Open passport</Button>
        </div>
      </Card>
    );
  }

  const space = db.spaces[sel.id];
  if (!space) return null;
  const assets = assetsIn(db, { spaceId: space.id }).sort((a, b) => (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0));
  return (
    <Card title={space.name} actions={<Clear onClick={onClear} />} tight>
      <p className="font-mono text-[11px] font-bold text-muted">{space.code} · {kindLabel(space.kind)} · {fmtSqm(space.areaSqm)}</p>
      <p className="mt-3 type-eyebrow">{plural(assets.length, "asset")} in this room</p>
      {assets.length === 0 ? (
        <p className="mt-2 text-[13px] text-muted">No equipment is registered in this room.</p>
      ) : (
        <ul className="-mx-2 mt-1 max-h-60 space-y-0.5 overflow-y-auto px-2">
          {assets.map((a) => (
            <li key={a.id}>
              <button type="button" onClick={() => onOpenAsset(a.id)} className={ROW}>
                <span aria-hidden="true" className={cn("size-2.5 shrink-0 rounded-full", TONE_BG[toneOf(db, a)])} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-mono text-[12px] font-bold text-ink">{a.tag}</span>
                  <span className="block truncate text-[12px] text-ink-soft">{db.equipmentTypes[a.equipmentTypeId]?.name}</span>
                </span>
                <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted" strokeWidth={2} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" to={paths.space(space.id)}>Open space</Button>
        <Button variant="ghost" size="sm" to={paths.newWorkOrder({ spaceId: space.id, towerId: space.towerId })}>Raise work order</Button>
      </div>
    </Card>
  );
}
