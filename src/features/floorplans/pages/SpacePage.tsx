import { MapPin, Wrench } from "lucide-react";
import { Link, useParams } from "react-router";
import NotFound from "@/app/NotFound";
import { FloorPlanSvg } from "@/components/plan/FloorPlanSvg";
import { Breadcrumb, Button, Card, KV, PageHeader } from "@/components/ui";
import { PLAN_TEMPLATES } from "@/data/seed/plans";
import { assetsIn, finishesFor, pinsForFloor } from "@/data/selectors";
import { useDb } from "@/data/store";
import { fmtSqm, plural } from "@/lib/format";
import { paths } from "@/lib/paths";
import { FinishSchedule, OpenWorkOrders, RoomDocuments, SpaceAssets } from "../components/SpaceSections";
import { FLOOR_KIND_LABEL, docsForSpace, kindLabel, openWosForSpace, pick } from "../lib";

const LINK = "focus-ring relative rounded text-ink underline-offset-2 hover:underline after:absolute after:-inset-x-1 after:-inset-y-2.5 after:content-['']";

export default function SpacePage() {
  const { spaceId = "" } = useParams();
  const db = useDb((d) => d);
  const space = pick(db.spaces, spaceId);
  const tower = space && pick(db.towers, space.towerId);
  const floor = space && pick(db.floors, space.floorId);
  if (!space || !tower || !floor) return <NotFound what="space" id={spaceId} />;

  const template = PLAN_TEMPLATES[floor.templateId];
  const assets = assetsIn(db, { spaceId: space.id }).sort((a, b) => (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0));
  const floorSpaces = Object.values(db.spaces).filter((s) => s.floorId === floor.id);
  const docs = docsForSpace(db, space);
  const wos = openWosForSpace(db, space);
  const finishes = finishesFor(db, space.kind, tower.id);
  const showOnPlan = paths.floor(tower.id, floor.id, { highlight: `space:${space.id}` });

  return (
    <div>
      <Breadcrumb
        items={[
          { to: paths.towers(), label: "Towers" },
          { to: paths.tower(tower.id), label: tower.name },
          { to: paths.floor(tower.id, floor.id), label: `Floor ${floor.label}` },
          { label: space.name },
        ]}
      />
      <PageHeader
        eyebrow={`${tower.name} · ${floor.label}`}
        title={space.name}
        lede={
          <>
            <span className="font-mono text-[13px]">{space.code}</span> · {kindLabel(space.kind)} · {fmtSqm(space.areaSqm)}
          </>
        }
        actions={
          <Button to={paths.newWorkOrder({ spaceId: space.id, towerId: tower.id })} variant="primary">
            <Wrench aria-hidden="true" className="size-4" strokeWidth={2} />
            Raise work order
          </Button>
        }
      />

      {/* One grid, not two columns: on a phone the order is plan, facts, then the registers; from lg the facts sit beside the plan. */}
      <div className="grid gap-x-4 gap-y-6 lg:grid-cols-[1fr_340px] lg:items-start">
        <Card
          title="Location"
          className="lg:col-start-1 lg:row-start-1"
          actions={
            <Button to={showOnPlan} variant="ghost" size="sm">
              <MapPin aria-hidden="true" className="size-4" strokeWidth={2} />
              Show on plan
            </Button>
          }
        >
          {template ? (
            <FloorPlanSvg
              compact
              className="mx-auto max-w-[640px]"
              template={template}
              spaces={floorSpaces}
              pins={pinsForFloor(db, floor.id)}
              highlightSpaceIds={[space.id]}
              highlightAssetIds={assets.map((a) => a.id)}
            />
          ) : (
            <p className="type-small text-muted">No plan is drawn for this floor.</p>
          )}
          <p className="type-small mt-3 text-ink-soft">
            {space.name} is highlighted on the {floor.label} plan{assets.length > 0 ? "; the equipment in it is ringed and other pins are dimmed" : ""}.
          </p>
        </Card>

        <aside className="min-w-0 space-y-4 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <Card title="Facts" tight>
            <KV
              items={[
                { k: "Tower", v: <Link to={paths.tower(tower.id)} className={LINK}>{tower.name}</Link> },
                { k: "Floor", v: <Link to={paths.floor(tower.id, floor.id)} className={LINK}>{floor.label} · {FLOOR_KIND_LABEL[floor.kind]}</Link> },
                { k: "Room code", v: space.code, mono: true },
                { k: "Kind", v: kindLabel(space.kind) },
                { k: "Area", v: fmtSqm(space.areaSqm) },
                { k: "Equipment", v: plural(assets.length, "asset") },
                { k: "Open work orders", v: wos.length },
              ]}
            />
          </Card>
          <OpenWorkOrders wos={wos} />
        </aside>

        <div className="min-w-0 space-y-6 lg:col-start-1 lg:row-start-2">
          <SpaceAssets db={db} assets={assets} />
          <RoomDocuments tower={tower} floor={floor} room={docs.room} floorWide={docs.floor} />
          <FinishSchedule db={db} tower={tower} space={space} rows={finishes} />
        </div>
      </div>
    </div>
  );
}
