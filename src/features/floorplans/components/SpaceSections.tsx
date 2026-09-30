import { FileText, Inbox, Palette } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { Badge, Button, Card, DataTable, DocumentCard, EmptyState, cn, type Column } from "@/components/ui";
import { dueStatus, isOverdueWo } from "@/data/selectors";
import type { Asset, Db, Document, Finish, FinishRow, Floor, Space, Tower, WorkOrder } from "@/data/types";
import { fmtDate } from "@/lib/dates";
import { plural } from "@/lib/format";
import { paths } from "@/lib/paths";
import { assetStatusTone, conditionTone, docStatusTone, dueTone, priorityTone, warrantyTone, woStatusTone } from "@/lib/status";
import { assetBrief, capitalise, kindLabel, overrideNote, words, type RoomDoc } from "../lib";
import { Section } from "./Section";

// the ::after grows the hit area to a 40px-tall target without moving the text
const LINK = "focus-ring relative rounded font-semibold text-ink underline-offset-2 hover:underline after:absolute after:-inset-x-1 after:-inset-y-2.5 after:content-['']";
const MUTED = "text-[13px] font-medium text-muted";

// --- equipment in the room ---------------------------------------------------------------------------------------------------

type AssetRow = { asset: Asset; b: ReturnType<typeof assetBrief> };

/** Every asset registered in the room. Sorting and paging belong to DataTable; the row and the tag both open the passport. */
export function SpaceAssets({ db, assets }: { db: Db; assets: Asset[] }) {
  const navigate = useNavigate();
  const rows: AssetRow[] = assets.map((asset) => ({ asset, b: assetBrief(db, asset) }));
  const columns: Column<AssetRow>[] = [
    {
      key: "tag", label: "Tag", mono: true, sort: (r) => r.asset.tag,
      render: (r) => <Link to={paths.asset(r.asset.id)} className={cn(LINK, "whitespace-nowrap")}>{r.asset.tag}</Link>,
    },
    {
      key: "type", label: "Equipment", sort: (r) => r.b.type?.name ?? "",
      render: (r) => (
        <>
          {r.b.type?.name ?? "—"}
          <span className="mt-0.5 block text-xs font-medium text-muted">
            {r.b.brand?.name ?? "Unknown brand"} · <span className="font-mono text-[11px]">{r.b.model?.modelNo ?? "no model"}</span>
          </span>
        </>
      ),
    },
    {
      key: "status", label: "Status", sort: (r) => r.asset.status,
      render: (r) => (
        <span className="flex flex-col items-start gap-1">
          <Badge tone={assetStatusTone(r.asset.status)} dot>{words(r.asset.status)}</Badge>
          <Badge tone={conditionTone(r.asset.condition)}>{r.asset.condition} condition</Badge>
        </span>
      ),
    },
    {
      key: "pm", label: "Next PM", sort: (r) => r.b.plan?.nextDue ?? "9999-12-31",
      render: (r) =>
        r.b.plan ? (
          <span className="flex flex-col items-start gap-1">
            <span className="whitespace-nowrap">{fmtDate(r.b.plan.nextDue)}</span>
            <Badge tone={dueTone(dueStatus(r.b.plan.nextDue))}>{words(dueStatus(r.b.plan.nextDue))}</Badge>
          </span>
        ) : (
          <span className={cn(MUTED, "whitespace-nowrap")}>No PM plan</span>
        ),
    },
    {
      key: "warranty", label: "Warranty", sort: (r) => r.b.warranty?.end ?? "9999-12-31",
      render: (r) => (
        <span className="flex flex-col items-start gap-1">
          <Badge tone={warrantyTone(r.b.band)}>{words(r.b.band)}</Badge>
          {r.b.warranty && <span className="whitespace-nowrap text-xs font-medium text-muted">Ends {fmtDate(r.b.warranty.end)}</span>}
        </span>
      ),
    },
  ];

  return (
    <Section title="Equipment in this room" note={plural(assets.length, "asset")}>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.asset.id}
        onRowClick={(r) => navigate(paths.asset(r.asset.id))}
        empty={<EmptyState icon={Inbox} title="No equipment here" body="No asset is registered in this room." />}
      />
    </Section>
  );
}

// --- documents ---------------------------------------------------------------------------------------------------------------

/** Sheets that govern the room or its equipment as cards; sheets that only cover the whole floor as a quieter list underneath. */
export function RoomDocuments({ tower, floor, room, floorWide }: { tower: Tower; floor: Floor; room: RoomDoc[]; floorWide: Document[] }) {
  const onPlan = (doc: Document) => paths.floor(tower.id, floor.id, { highlight: `doc:${doc.id}` });
  const PLAN_LINK = "focus-ring relative shrink-0 rounded text-xs font-bold text-ink-soft underline-offset-2 hover:text-ink hover:underline after:absolute after:-inset-x-1 after:-inset-y-3 after:content-['']";
  return (
    <Section title="Documents governing this room" note={plural(room.length + floorWide.length, "sheet")}>
      {room.length === 0 && floorWide.length === 0 ? (
        <EmptyState icon={FileText} title="No governing documents" body="No drawing or sheet on record governs this room, its equipment or its floor." />
      ) : (
        <div className="space-y-5">
          {room.length > 0 ? (
            <ul className="grid gap-3 md:grid-cols-2">
              {room.map(({ doc, why }) => (
                <li key={doc.id} className="min-w-0">
                  <DocumentCard doc={doc} />
                  <p className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-1 text-xs font-medium text-muted">
                    <span>{why}</span>
                    <Link to={onPlan(doc)} className={PLAN_LINK}>Show on plan</Link>
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className={MUTED}>No sheet names this room or the equipment in it.</p>
          )}
          {floorWide.length > 0 && (
            <div>
              <p className="type-eyebrow mb-2">Also covering the whole floor ({floor.label})</p>
              <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
                {floorWide.map((doc) => (
                  <li key={doc.id} className="flex min-h-10 flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2">
                    <Link to={paths.document(doc.id)} className={cn(LINK, "font-mono text-[12px]")}>{doc.docNo}</Link>
                    <span className="type-small min-w-[10rem] flex-1 truncate text-ink-soft">{doc.title}</span>
                    <Badge tone={docStatusTone(doc.status)}>{words(doc.status)}</Badge>
                    <Link to={onPlan(doc)} className={PLAN_LINK}>On plan</Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Section>
  );
}

// --- finish schedule ---------------------------------------------------------------------------------------------------------

/** The data-driven inline colour (Finish.swatch): the only place this feature sets a colour that is not a token. */
function Swatch({ finish }: { finish: Finish }) {
  return <span aria-hidden="true" className="inline-block size-6 shrink-0 rounded border border-line-strong" style={{ background: finish.swatch }} />;
}

function FinishCell({ finish }: { finish: Finish }) {
  return (
    <span className="flex items-center gap-2.5">
      <Swatch finish={finish} />
      <span className="min-w-0">
        <span className="block font-mono text-[11px] font-bold text-muted">{finish.code}</span>
        <span className="block text-[13px] font-semibold text-ink">{finish.name}</span>
      </span>
    </span>
  );
}

/** finishesFor(): the portfolio row per surface beside this tower's override, the deviating ones marked. */
export function FinishSchedule({ db, tower, space, rows }: { db: Db; tower: Tower; space: Space; rows: FinishRow[] }) {
  const columns: Column<FinishRow>[] = [
    { key: "surface", label: "Surface", sort: (r) => r.surface, render: (r) => capitalise(r.surface) },
    { key: "standard", label: "Portfolio standard", render: (r) => (r.portfolio ? <FinishCell finish={r.portfolio} /> : <span className={MUTED}>None set</span>) },
    {
      key: "tower", label: `${tower.code} finish`,
      render: (r) => {
        if (!r.override) return <span className={MUTED}>Follows the standard</span>;
        if (!r.portfolio) {
          return (
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <FinishCell finish={r.override} />
              <Badge tone="info">Tower only</Badge>
            </span>
          );
        }
        if (!r.deviates) return <span className={MUTED}>Same as the standard</span>;
        const note = overrideNote(db, space.kind, r.surface, tower.id);
        return (
          <span className="block">
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <FinishCell finish={r.override} />
              <Badge tone="warn">Override</Badge>
            </span>
            {note && <span className="mt-1.5 block text-xs font-medium text-muted">{note}</span>}
          </span>
        );
      },
    },
  ];
  const overrides = rows.filter((r) => r.deviates).length;
  return (
    <Section
      title="Finish schedule"
      note={`Room kind: ${kindLabel(space.kind)}${overrides > 0 ? ` · ${plural(overrides, "override")} at ${tower.name}` : ""}`}
      actions={<Button to={paths.finishes({ tower: tower.id })} variant="ghost" size="sm">Open finish schedule</Button>}
    >
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.surface}
        empty={
          <EmptyState
            icon={Palette}
            title="No finish schedule"
            body={`Finishes are set per room kind. None are defined for ${kindLabel(space.kind)}.`}
          />
        }
      />
    </Section>
  );
}

// --- work orders -------------------------------------------------------------------------------------------------------------

/** Open work orders raised on the room or on equipment in it. Renders nothing when there are none. */
export function OpenWorkOrders({ wos }: { wos: WorkOrder[] }) {
  if (wos.length === 0) return null;
  return (
    <Card title="Open work orders" actions={<Badge tone="neutral">{wos.length}</Badge>} tight>
      <ul className="-mx-2 space-y-0.5">
        {wos.map((w) => (
          <li key={w.id}>
            <Link to={paths.workOrder(w.id)} className="focus-ring flex min-h-10 items-start gap-3 rounded-ctl px-2 py-2 transition-colors duration-150 hover:bg-surface-2">
              <span className="min-w-0 flex-1">
                <span className="block font-mono text-[11px] font-bold text-muted">{w.number}</span>
                <span className="block text-[13px] font-semibold text-ink">{w.title}</span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                <Badge tone={priorityTone(w.priority)}>{w.priority}</Badge>
                <Badge tone={woStatusTone(w.status, isOverdueWo(w))}>{words(w.status)}</Badge>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
