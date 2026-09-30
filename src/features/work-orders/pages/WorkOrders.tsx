import { ClipboardList, Plus } from "lucide-react";
import { Button, Chip, EmptyState, PageHeader, StatTile, Tabs } from "@/components/ui";
import { isOverdueWo } from "@/data/selectors";
import { useDb } from "@/data/store";
import { fmtNumber } from "@/lib/format";
import { paths } from "@/lib/paths";
import { Board } from "../components/Board";
import { FilterBar } from "../components/FilterBar";
import { ListView } from "../components/ListView";
import { filterWorkOrders, isFinal, sortWorkOrders, STATUSES, useWoFilters } from "../lib";

/** /work-orders: Board / List of the same filtered set, so counts agree between the two views. */
export default function WorkOrders() {
  const db = useDb((d) => d);
  const { filters, update, setTower, clear, hasFilters, scopeTower, clearScope } = useWoFilters();
  const now = Date.now();

  const rows = sortWorkOrders(filterWorkOrders(db, filters), now);
  const active = rows.filter((w) => !isFinal(w.status));
  const overdue = active.filter((w) => isOverdueWo(w, now)).length;
  const urgent = active.filter((w) => w.priority === "P1" || w.priority === "P2").length;
  const done = rows.filter((w) => w.status === "done").length;
  // cancelled orders match the same filters but stay behind a chip; a status filter already says what to show
  const cancelledCount = filters.status ? 0 : filterWorkOrders(db, { ...filters, status: "cancelled" }).length;
  const columns = filters.status ? [filters.status] : filters.cancelled ? STATUSES : STATUSES.filter((s) => s !== "cancelled");

  const asset = filters.assetId ? db.assets[filters.assetId] : undefined;
  const newLink = paths.newWorkOrder({
    ...(filters.assetId ? { assetId: filters.assetId } : {}),
    ...(filters.tower ? { towerId: filters.tower } : {}),
  });

  return (
    <div>
      <PageHeader
        eyebrow="Facilities"
        title="Work orders"
        lede="Raised, assigned, in progress, done. Change a card's status right on the board."
        actions={
          <Button variant="primary" to={newLink}>
            <Plus aria-hidden="true" className="size-4" strokeWidth={2.5} />
            New work order
          </Button>
        }
      >
        <Tabs
          items={[
            { key: "board", label: "Board", count: rows.length },
            { key: "list", label: "List", count: rows.length },
          ]}
          value={filters.view}
          onChange={(view) => update({ view: view === "list" ? "list" : "" })}
        />
      </PageHeader>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile label="Active" value={fmtNumber(active.length)} delta={`of ${fmtNumber(rows.length)} shown`} />
          <StatTile label="Overdue" value={fmtNumber(overdue)} tone={overdue > 0 ? "hot" : "default"} delta="past their due time" />
          <StatTile label="P1 and P2 active" value={fmtNumber(urgent)} delta="highest priorities" />
          <StatTile label="Done" value={fmtNumber(done)} delta="closed out" />
        </div>

        <FilterBar db={db} filters={filters} update={update} setTower={setTower} />

        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {scopeTower && <Chip active label={`Scoped to ${db.towers[scopeTower]?.name ?? scopeTower} ×`} onClick={clearScope} />}
          {filters.assetId && <Chip active label={`Asset ${asset?.tag ?? filters.assetId} ×`} onClick={() => update({ assetId: "" })} />}
          {!filters.status && (
            <Chip
              active={filters.cancelled}
              label="Cancelled"
              count={cancelledCount}
              onClick={() => update({ cancelled: filters.cancelled ? "" : "1" })}
            />
          )}
          {hasFilters && <Chip active={false} label="Clear filters" onClick={clear} />}
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No work orders"
            body={hasFilters || scopeTower ? "Nothing matches these filters." : "Nothing has been raised yet."}
            action={
              hasFilters ? (
                <Button variant="ghost" size="sm" onClick={clear}>Clear filters</Button>
              ) : (
                <Button variant="ghost" size="sm" to={newLink}>New work order</Button>
              )
            }
          />
        ) : filters.view === "list" ? (
          <ListView db={db} rows={rows} now={now} />
        ) : (
          <Board db={db} rows={rows} columns={columns} now={now} />
        )}
      </div>
    </div>
  );
}
