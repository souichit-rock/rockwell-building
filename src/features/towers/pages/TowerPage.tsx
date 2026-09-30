import { FileText, Layers, Plus } from "lucide-react";
import { useMemo } from "react";
import { useParams } from "react-router";
import { NotFound } from "@/app/NotFound";
import { Badge, Breadcrumb, Button, DocumentCard, EmptyState, PageHeader, StatTile } from "@/components/ui";
import { assetsIn, attentionItems, openWorkOrders, PM_DUE_DAYS, towerHealth } from "@/data/selectors";
import { useDb } from "@/data/store";
import type { Tower } from "@/data/types";
import { fmtNumber, plural } from "@/lib/format";
import { paths } from "@/lib/paths";
import { healthTone } from "@/lib/status";
import { CoverageMatrix } from "../components/CoverageMatrix";
import { FactsCard } from "../components/FactsCard";
import { FloorStack } from "../components/FloorStack";
import { OpenItems } from "../components/OpenItems";
import { PermitsCard } from "../components/PermitsCard";
import { Section } from "../components/Section";
import { SystemsTable } from "../components/SystemsTable";
import { assetCountsByFloor, contactsFor, coverageModel, floorsOf, keyDocuments, permitsOf, pmDueCount, systemsSummary } from "../lib";

export default function TowerPage() {
  const { towerId = "" } = useParams();
  const tower = useDb((db) => db.towers[towerId]);
  if (!tower) return <NotFound what="tower" id={towerId} />;
  return <TowerOverview tower={tower} />;
}

function TowerOverview({ tower }: { tower: Tower }) {
  const db = useDb((d) => d);
  const m = useMemo(() => {
    const id = tower.id;
    return {
      floors: floorsOf(db, id),
      counts: assetCountsByFloor(db, id),
      assetCount: assetsIn(db, { towerId: id }).length,
      health: towerHealth(db, id),
      openWos: openWorkOrders(db, { towerId: id }).length,
      pmDue: pmDueCount(db, id),
      attention: attentionItems(db, id),
      permits: permitsOf(db, id),
      docs: keyDocuments(db, id),
      contacts: contactsFor(db, tower),
      systems: systemsSummary(db, id),
      coverage: coverageModel(db, id),
    };
  }, [db, tower]);

  const { health, coverage } = m;
  const lowest = m.floors[m.floors.length - 1];
  const manager = db.teamMembers[tower.propertyManagerId];

  return (
    <>
      <Breadcrumb items={[{ to: paths.towers(), label: "Towers" }, { label: tower.name }]} />
      <PageHeader
        eyebrow={tower.estate}
        title={tower.name}
        lede={tower.address}
        actions={
          <>
            {lowest && (
              <Button to={paths.floor(tower.id, lowest.id)} variant="ghost">
                <Layers aria-hidden="true" className="size-4" strokeWidth={2} />
                Floor plans
              </Button>
            )}
            <Button to={paths.newWorkOrder({ towerId: tower.id })} variant="primary">
              <Plus aria-hidden="true" className="size-4" strokeWidth={2} />
              Raise work order
            </Button>
          </>
        }
      />

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            label="Health"
            value={health.score}
            tone={health.band === "Action" ? "hot" : "default"}
            delta={<Badge tone={healthTone(health.band)}>{health.band}</Badge>}
          />
          <StatTile label="Open work orders" value={fmtNumber(m.openWos)} delta={`${health.openP1} P1 · ${health.openP2} P2`} />
          <StatTile
            label="PM overdue"
            value={fmtNumber(health.overduePm)}
            tone={health.overduePm > 0 ? "hot" : "default"}
            delta={`${fmtNumber(m.pmDue)} due within ${PM_DUE_DAYS} days`}
          />
          <StatTile
            label="Current as-builts"
            value={coverage.total === 0 ? "n/a" : `${coverage.pct}%`}
            delta={`${coverage.current} of ${plural(coverage.total, "floor-discipline pair")}`}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-4">
            <FloorStack db={db} towerId={tower.id} floors={m.floors} counts={m.counts} />
            <OpenItems towerId={tower.id} items={m.attention} />
          </div>
          <aside className="min-w-0 space-y-4">
            <FactsCard tower={tower} floors={m.floors} assetCount={m.assetCount} manager={manager} contacts={m.contacts} />
            <PermitsCard towerId={tower.id} permits={m.permits} />
          </aside>
        </div>

        <Section title="Systems" note="Compliance = compliant + waived, of assets with a governing standard">
          <SystemsTable towerId={tower.id} rows={m.systems.rows} />
          {m.systems.unlinkedOpenWos > 0 && (
            <p className="type-small mt-2 text-muted">
              {plural(m.systems.unlinkedOpenWos, "open work order")} not linked to an asset, so not counted against a system.
            </p>
          )}
        </Section>

        <Section title="As-built coverage" note={coverage.total > 0 ? `${coverage.current} of ${coverage.total} current` : undefined}>
          <CoverageMatrix db={db} towerId={tower.id} model={coverage} />
        </Section>

        <Section
          title="Key documents"
          note="Current as-builts, latest revision"
          actions={<Button to={paths.documents({ tower: tower.id })} variant="ghost" size="sm">All documents</Button>}
        >
          {m.docs.length === 0 ? (
            <EmptyState icon={FileText} title="No current as-builts" body="No as-built sheet is marked current for this tower." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {m.docs.map((doc) => <DocumentCard key={doc.id} doc={doc} />)}
            </div>
          )}
        </Section>
      </div>
    </>
  );
}
