import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router";
import NotFound from "@/app/NotFound";
import { Breadcrumb, Button, Chip, Notice, PageHeader, cn, selectClass } from "@/components/ui";
import { PLAN_TEMPLATES } from "@/data/seed/plans";
import { assetsIn, pinsForFloor } from "@/data/selectors";
import { useDb } from "@/data/store";
import type { Db, DisciplineCode, Floor, Id, Rect, Tower } from "@/data/types";
import { plural } from "@/lib/format";
import { paths } from "@/lib/paths";
import { AssetDrawer } from "../components/AssetDrawer";
import { PlanCanvas, ZoomControls } from "../components/PlanCanvas";
import { SelectionPanel, SpaceList } from "../components/SidePanels";
import {
  FLOOR_KIND_LABEL, TONE_BG, focusTarget, governedOn, highlightValue, latestRev, parseHighlight, parseLayers, pick, selFor, type Sel,
} from "../lib";
import { FULL, centerOn, fitRects, inView } from "../view";

export default function FloorPlanPage() {
  const { towerId = "", floorId = "" } = useParams();
  const db = useDb((d) => d);
  const [sp] = useSearchParams();
  const tower = pick(db.towers, towerId);
  const floor = pick(db.floors, floorId);
  if (!tower) return <NotFound what="tower" id={towerId} />;
  if (!floor || floor.towerId !== tower.id) return <NotFound what="floor" id={floorId} />;
  if (!PLAN_TEMPLATES[floor.templateId]) return <NotFound what="floor plan" id={floor.id} />; // verifySeed guarantees a template; this only guards a hand-edited row

  // a point highlight that lives on another floor: follow it there instead of showing an empty plan
  const hl = parseHighlight(sp.get("highlight"));
  const target = hl?.kind === "asset" ? pick(db.assets, hl.id) : hl?.kind === "space" ? pick(db.spaces, hl.id) : undefined;
  if (hl && target && target.floorId !== floor.id) {
    return <Navigate replace to={paths.floor(target.towerId, target.floorId, { highlight: highlightValue(hl), layer: parseLayers(sp.get("layer"), db) })} />;
  }
  return <FloorView key={floor.id} db={db} tower={tower} floor={floor} />;
}

function FloorView({ db, tower, floor }: { db: Db; tower: Tower; floor: Floor }) {
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();
  const layers = parseLayers(sp.get("layer"), db);
  const hlRaw = sp.get("highlight") ?? "";
  const hl = parseHighlight(hlRaw);

  const floors = Object.values(db.floors).filter((f) => f.towerId === tower.id).sort((a, b) => a.level - b.level);
  const at = floors.findIndex((f) => f.id === floor.id);
  const spaces = Object.values(db.spaces).filter((s) => s.floorId === floor.id);
  const floorAssets = assetsIn(db, { floorId: floor.id });
  const allPins = pinsForFloor(db, floor.id);
  const pins = layers.length > 0 ? pinsForFloor(db, floor.id, layers) : allPins;

  const gov = hl?.kind === "doc" ? governedOn(db, hl.id, floor.id) : null;
  const focus = focusTarget(db, hl, allPins, gov);

  const [view, setView] = useState<Rect>(focus ?? FULL);
  const [sel, setSel] = useState<Sel>(() => selFor(db, floor.id, hl));
  const [drawer, setDrawer] = useState(false);
  const chipRow = useRef<HTMLDivElement>(null);
  const layerKey = layers.join(",");
  // on a phone the chip row scrolls sideways: bring an active layer chip that starts out of sight (a ?layer= link) into view
  useEffect(() => {
    const row = chipRow.current;
    const on = row?.querySelector<HTMLElement>("[aria-pressed='true']");
    if (row && on && on.offsetLeft + on.offsetWidth > row.clientWidth) row.scrollLeft = on.offsetLeft - 16;
  }, [layerKey]);
  // a highlight that arrives while the page is open (palette, a link on this floor) re-selects and re-centres
  const [seen, setSeen] = useState(hlRaw);
  if (seen !== hlRaw) {
    setSeen(hlRaw);
    if (hl) {
      setView(focus ?? FULL);
      setSel(selFor(db, floor.id, hl));
      setDrawer(false);
    }
  }

  const setParam = (key: string, value: string | null) =>
    setSp((prev) => {
      const next = new URLSearchParams(prev);
      if (value === null) next.delete(key);
      else next.set(key, value);
      return next;
    }, { replace: true });
  const toggleLayer = (code: DisciplineCode) => {
    const next = layers.includes(code) ? layers.filter((c) => c !== code) : [...layers, code];
    setParam("layer", next.length > 0 ? next.join(",") : null);
  };
  // once the person picks something else, an asset / space highlight in the address bar is stale; a document highlight stays
  const dropPointHighlight = () => {
    if (hl && hl.kind !== "doc") setParam("highlight", null);
  };

  const openAsset = (id: Id) => {
    setSel({ kind: "asset", id });
    setDrawer(true);
    dropPointHighlight();
    const pin = allPins.find((p) => p.assetId === id);
    if (pin && !inView(view, pin)) setView((v) => centerOn(v, pin));
  };
  const pickSpace = (id: Id, zoom: boolean) => {
    setSel({ kind: "space", id });
    setDrawer(false);
    dropPointHighlight();
    if (zoom && db.spaces[id]) {
      setView(fitRects([db.spaces[id].rect], 30));
      document.getElementById("plan-canvas")?.scrollIntoView({ block: "nearest" });
    }
  };
  const clearSel = () => {
    setSel(null);
    setDrawer(false);
    dropPointHighlight();
  };

  const counts = new Map<Id, number>();
  for (const a of floorAssets) counts.set(a.spaceId, (counts.get(a.spaceId) ?? 0) + 1);
  const perDiscipline = new Map<DisciplineCode, number>();
  for (const p of allPins) perDiscipline.set(p.disciplineId, (perDiscipline.get(p.disciplineId) ?? 0) + 1);
  const chips = Object.values(db.disciplines)
    .filter((d) => perDiscipline.has(d.id) || layers.includes(d.id))
    .sort((a, b) => a.order - b.order);

  const hlAssetId = hl?.kind === "asset" && db.assets[hl.id]?.floorId === floor.id ? hl.id : undefined;
  const hlSpaceId = hl?.kind === "space" && db.spaces[hl.id]?.floorId === floor.id ? hl.id : undefined;
  const litAssets = hlAssetId ? [hlAssetId] : (gov?.assetIds ?? []);
  const litSpaces = [...(hlSpaceId ? [hlSpaceId] : []), ...(gov?.spaceIds ?? []), ...(sel?.kind === "space" ? [sel.id] : [])];
  const hiddenByLayer = layers.length > 0 && litAssets.some((id) => !pins.some((p) => p.assetId === id));

  const drawerAsset = drawer && sel?.kind === "asset" ? db.assets[sel.id] : undefined;
  const prev = floors[at - 1];
  const next = floors[at + 1];
  const goTo = (id: Id) => navigate(paths.floor(tower.id, id, { layer: layers }));
  const rev = gov ? latestRev(gov.doc)?.rev : undefined;

  return (
    <div>
      <Breadcrumb items={[{ to: paths.towers(), label: "Towers" }, { to: paths.tower(tower.id), label: tower.name }, { label: `Floor ${floor.label}` }]} />
      <PageHeader
        eyebrow={tower.name}
        title={`${floor.label} · ${FLOOR_KIND_LABEL[floor.kind]}`}
        lede={`${plural(spaces.length, "space")} and ${plural(floorAssets.length, "asset")} on this floor. Schematic plan, not to scale.`}
        actions={
          <div className="flex items-center gap-2">
            {prev ? (
              <Button to={paths.floor(tower.id, prev.id, { layer: layers })} variant="ghost" aria-label={`Previous floor, ${prev.label}`}>
                <ChevronLeft className="size-4" strokeWidth={2} />{prev.label}
              </Button>
            ) : (
              <Button variant="ghost" disabled aria-label="No lower floor"><ChevronLeft className="size-4" strokeWidth={2} />—</Button>
            )}
            <div className="w-40 sm:w-60">
              <select aria-label="Floor" value={floor.id} onChange={(e) => goTo(e.target.value)} className={selectClass}>
                {floors.map((f) => (
                  <option key={f.id} value={f.id}>{f.label} · {FLOOR_KIND_LABEL[f.kind]}</option>
                ))}
              </select>
            </div>
            {next ? (
              <Button to={paths.floor(tower.id, next.id, { layer: layers })} variant="ghost" aria-label={`Next floor, ${next.label}`}>
                {next.label}<ChevronRight className="size-4" strokeWidth={2} />
              </Button>
            ) : (
              <Button variant="ghost" disabled aria-label="No higher floor">—<ChevronRight className="size-4" strokeWidth={2} /></Button>
            )}
          </div>
        }
      />

      {(hl || hiddenByLayer) && (
        <div className="mb-4 space-y-3">
          {hl?.kind === "doc" &&
            (!gov ? (
              <Notice tone="warn">No document matches the highlight "{hl.id}".</Notice>
            ) : gov.spaceIds.length === 0 && gov.assetIds.length === 0 ? (
              <Notice tone="warn">
                <span className="flex flex-wrap items-center justify-between gap-3">
                  <span>{gov.doc.docNo} does not govern any room or asset on this floor.</span>
                  <Button size="sm" variant="ghost" onClick={() => setParam("highlight", null)}>Clear</Button>
                </span>
              </Notice>
            ) : (
              <Notice tone="info">
                <span className="flex flex-wrap items-center justify-between gap-3">
                  <span>
                    Showing what {gov.doc.docNo}{rev && ` (Rev ${rev})`} governs on this floor:{" "}
                    {gov.allRooms
                      ? "the whole floor"
                      : [
                          gov.wholeFloor && "the floor as a whole",
                          gov.spaceIds.length > 0 && plural(gov.spaceIds.length, "room"),
                          gov.assetIds.length > 0 && plural(gov.assetIds.length, "asset"),
                        ].filter(Boolean).join(", ")}
                    .{gov.doc.status === "superseded" && " This sheet is superseded."}
                  </span>
                  <span className="flex gap-2">
                    <Button size="sm" variant="ghost" to={paths.document(gov.doc.id)}>Open document</Button>
                    <Button size="sm" variant="ghost" onClick={() => setParam("highlight", null)}>Clear</Button>
                  </span>
                </span>
              </Notice>
            ))}
          {hl && hl.kind !== "doc" && !hlAssetId && !hlSpaceId && <Notice tone="warn">No {hl.kind} matches the highlight "{hl.id}".</Notice>}
          {hiddenByLayer && (
            <Notice tone="info">
              <span className="flex flex-wrap items-center justify-between gap-3">
                <span>Some highlighted equipment is on a layer that is switched off.</span>
                <Button size="sm" variant="ghost" onClick={() => setParam("layer", null)}>Show all layers</Button>
              </span>
            </Notice>
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div ref={chipRow} role="group" aria-label="Discipline layers" className="relative flex w-full min-w-0 gap-2 overflow-x-auto pb-1 [scrollbar-width:none] sm:w-auto sm:flex-1">
              <Chip label="All layers" count={allPins.length} active={layers.length === 0} onClick={() => setParam("layer", null)} />
              {chips.map((d) => (
                <Chip key={d.id} label={d.name} count={perDiscipline.get(d.id) ?? 0} active={layers.includes(d.id)} onClick={() => toggleLayer(d.id)} />
              ))}
            </div>
            <ZoomControls view={view} onView={setView} />
          </div>

          <PlanCanvas
            view={view}
            onView={setView}
            template={PLAN_TEMPLATES[floor.templateId]}
            spaces={spaces}
            pins={pins}
            selectedAssetId={sel?.kind === "asset" ? sel.id : undefined}
            highlightSpaceIds={litSpaces}
            highlightAssetIds={litAssets}
            onPinClick={openAsset}
            onSpaceClick={(id) => pickSpace(id, false)}
          />

          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
            {allPins.length === 0 ? (
              <p className="text-[13px] text-muted">No equipment is registered on this floor. Rooms are shown for orientation.</p>
            ) : (
              <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-semibold text-ink-soft">
                {chips.filter((d) => perDiscipline.has(d.id)).map((d) => (
                  <li key={d.id} className="flex items-center gap-1.5">
                    <span aria-hidden="true" className={cn("size-2.5 rounded-full", TONE_BG[d.tone])} />
                    {d.name}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-muted">Scroll or use + and − to zoom, drag to pan, double-click to fit.</p>
          </div>
        </div>

        <aside className="min-w-0 space-y-4">
          <SelectionPanel db={db} sel={sel} onClear={clearSel} onOpenAsset={openAsset} onQuickView={() => setDrawer(true)} />
          <SpaceList spaces={spaces} counts={counts} selectedId={sel?.kind === "space" ? sel.id : undefined} onSelect={(id) => pickSpace(id, true)} />
        </aside>
      </div>

      <AssetDrawer asset={drawerAsset} onClose={() => setDrawer(false)} />
    </div>
  );
}
