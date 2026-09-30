import { useState } from "react";
import { Link } from "react-router";
import { Badge, Button, cn, Monogram, selectClass } from "@/components/ui";
import { isOverdueWo } from "@/data/selectors";
import type { Db, Id, WOStatus, WorkOrder } from "@/data/types";
import { paths } from "@/lib/paths";
import { priorityTone } from "@/lib/status";
import { ageLine, changeStatus, dueLine, nextStatuses, STATUS_LABEL } from "../lib";
import { StatusDialog, type DialogTarget } from "./StatusDialog";

/**
 * A moved card remounts in its new column, which drops focus to <body>. Hand it back to the card's select (so the next move is one
 * Tab away), or to the title link when the select is disabled because the work order is closed out.
 */
function focusCard(id: Id) {
  requestAnimationFrame(() => {
    const select = document.getElementById(`wo-status-${id}`) as HTMLSelectElement | null;
    (select && !select.disabled ? select : document.getElementById(`wo-title-${id}`))?.focus();
  });
}

function WoCard({ db, wo, now, draft, onPick, onMove }: {
  db: Db;
  wo: WorkOrder;
  now: number;
  draft: WOStatus | undefined;
  onPick: (id: Id, to: WOStatus) => void;
  onMove: (wo: WorkOrder, to: WOStatus) => void;
}) {
  const overdue = isOverdueWo(wo, now);
  const tower = db.towers[wo.towerId];
  const asset = wo.assetId ? db.assets[wo.assetId] : undefined;
  const space = wo.spaceId ? db.spaces[wo.spaceId] : undefined;
  const assignee = wo.assignedToId ? db.teamMembers[wo.assignedToId] : undefined;
  const vendor = wo.vendorId ? db.vendors[wo.vendorId] : undefined;
  const owner = assignee?.name ?? vendor?.name;
  const due = dueLine(wo, now);
  const options: WOStatus[] = [wo.status, ...nextStatuses(wo.status)];
  // the select only stages a choice; nothing is written until Move, so arrowing through the options changes nothing
  const value = draft && options.includes(draft) ? draft : wo.status;

  return (
    <li className={cn("relative rounded-ctl border border-line bg-surface p-3 transition-colors", overdue ? "border-l-4 border-l-danger" : "hover:border-line-strong")}>
      <div className="flex items-start justify-between gap-2">
        <Link to={paths.workOrder(wo.id)} className="focus-ring rounded font-mono text-[11px] font-bold tracking-[.04em] text-muted hover:text-ink">
          {wo.number}
        </Link>
        <Badge tone={priorityTone(wo.priority)}>{wo.priority}</Badge>
      </div>
      {/* stretched link: the ::after covers the whole card so the card, not the text line, is the tap target */}
      <Link
        id={`wo-title-${wo.id}`}
        to={paths.workOrder(wo.id)}
        className="focus-ring mt-1.5 line-clamp-2 rounded text-[14px] font-bold leading-snug text-ink hover:underline after:absolute after:inset-0 after:content-['']"
      >
        {wo.title}
      </Link>
      <p className="mt-1 truncate text-xs text-ink-soft">
        {tower?.code ?? wo.towerId} · {asset ? <span className="font-mono">{asset.tag}</span> : (space?.name ?? "No asset")}
      </p>
      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
        <span>{ageLine(wo, now)}</span>
        {due && <span className={cn("font-bold", overdue && "text-danger-deep")}>{due}</span>}
      </p>
      {/* z-10 lifts the controls above the stretched link */}
      <div className="relative z-10 mt-2.5 space-y-2">
        <div className="flex items-center gap-2">
          <select
            id={`wo-status-${wo.id}`}
            aria-label={`Status of ${wo.number}`}
            className={cn(selectClass, "min-w-0 flex-1")}
            value={value}
            disabled={options.length === 1}
            onChange={(e) => onPick(wo.id, e.target.value as WOStatus)}
          >
            {options.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
          {owner ? (
            <span title={[assignee?.name, vendor?.name].filter(Boolean).join(" · ")}>
              <Monogram name={owner} />
              <span className="sr-only">Assigned to {owner}</span>
            </span>
          ) : (
            <span className="sr-only">Unassigned</span>
          )}
        </div>
        {value !== wo.status && (
          <Button variant="navy" size="sm" className="w-full" onClick={() => onMove(wo, value)}>
            Move to {STATUS_LABEL[value]}
          </Button>
        )}
      </div>
    </li>
  );
}

/**
 * Kanban board, one column per status in `columns`. Status changes go through the card's select (no drag and drop) and a Move
 * button, so keyboard and screen-reader users never change a work order by arrowing through the options.
 * Done and Cancelled open the close-out dialog, everything else applies at once.
 */
export function Board({ db, rows, columns, now }: { db: Db; rows: WorkOrder[]; columns: WOStatus[]; now: number }) {
  const [pending, setPending] = useState<{ id: Id; to: DialogTarget } | null>(null);
  const [drafts, setDrafts] = useState<Record<Id, WOStatus>>({});
  const setDraft = (id: Id, to: WOStatus | null) =>
    setDrafts((d) => {
      const next = { ...d };
      if (to) next[id] = to;
      else delete next[id];
      return next;
    });
  const move = (wo: WorkOrder, to: WOStatus) => {
    if (to === "done" || to === "cancelled") {
      setPending({ id: wo.id, to });
      return;
    }
    changeStatus(wo.id, to);
    setDraft(wo.id, null);
    focusCard(wo.id);
  };
  const closeDialog = () => {
    if (!pending) return;
    setDraft(pending.id, null);
    setPending(null);
    focusCard(pending.id);
  };

  return (
    <>
      <div className="grid auto-cols-[85%] grid-flow-col gap-3 overflow-x-auto pb-2 sm:auto-cols-[minmax(232px,1fr)]">
        {columns.map((status) => {
          const cards = rows.filter((w) => w.status === status);
          return (
            <div key={status} className="min-w-0 rounded-card bg-surface-2 p-2.5">
              <h2 className="mb-2.5 flex items-center justify-between gap-2 px-1 type-eyebrow">
                {STATUS_LABEL[status]}
                <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] tabular-nums text-ink-soft" aria-label={`${cards.length} work orders`}>
                  {cards.length}
                </span>
              </h2>
              {cards.length === 0 ? (
                <p className="rounded-ctl border border-dashed border-line-strong px-3 py-6 text-center text-xs font-semibold text-muted">Nothing here</p>
              ) : (
                <ul className="space-y-2.5">
                  {cards.map((wo) => <WoCard key={wo.id} db={db} wo={wo} now={now} draft={drafts[wo.id]} onPick={setDraft} onMove={move} />)}
                </ul>
              )}
            </div>
          );
        })}
      </div>
      <StatusDialog wo={pending ? db.workOrders[pending.id] : undefined} to={pending?.to ?? null} onClose={closeDialog} />
    </>
  );
}
