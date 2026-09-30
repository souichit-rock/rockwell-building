import { Boxes, FileText, Printer, Ruler } from "lucide-react";
import { Link, useParams } from "react-router";
import NotFound from "@/app/NotFound";
import { useTowerScope } from "@/app/useTowerScope";
import { Badge, Breadcrumb, Button, Card, DocumentCard, EmptyState, KV, Notice, PageHeader, StatTile, cn } from "@/components/ui";
import { docsFor } from "@/data/selectors";
import { useDb } from "@/data/store";
import { fmtDate, todayISO } from "@/lib/dates";
import { fmtNumber, plural } from "@/lib/format";
import { paths } from "@/lib/paths";
import { AssetsTable } from "../components/AssetsTable";
import { TierBadge } from "../components/TierBadge";
import { WarrantySpreadBar } from "../components/WarrantySpreadBar";
import { WhereUsedBars } from "../components/WhereUsedBars";
import { assetsOfModel, countByTower, lookup, predecessorsOf, standardsForType, warrantySpread } from "../lib";

const inlineLink = "focus-ring rounded font-bold text-ink hover:underline";
const monoLink = "focus-ring rounded font-mono font-bold text-ink hover:underline";

/** Model spec sheet. On paper it is one A4 page: header, specs, facts, datasheet, warranty spread, per-tower counts, house standard. */
export default function ModelPage() {
  const { modelId } = useParams();
  const db = useDb((d) => d);
  const { setTowerId } = useTowerScope();
  // This page counts across every tower; the registry falls back to the rail's tower scope, so a portfolio-wide link clears it.
  const allTowers = () => setTowerId(null);
  const model = lookup(db.models, modelId);
  if (!model) return <NotFound what="model" id={modelId} />;

  const brand = db.brands[model.brandId];
  const type = db.equipmentTypes[model.equipmentTypeId];
  const discipline = type && db.disciplines[type.disciplineId];
  const successor = model.successorModelId ? db.models[model.successorModelId] : undefined;
  const predecessors = predecessorsOf(db, model.id);
  const assets = assetsOfModel(db, model.id);
  const perTower = countByTower(db, assets);
  const groups = perTower.filter((r) => r.count > 0);
  const spread = warrantySpread(db, assets);
  const documents = docsFor(db, "model", model.id);
  const datasheets = documents.filter((d) => d.type === "datasheet");
  const otherDocs = documents.filter((d) => d.type !== "datasheet");
  const standards = brand ? standardsForType(db, model.equipmentTypeId, brand.id) : [];
  const registry = paths.assets({ model: model.id });
  const specs = Object.entries(model.specs).map(([k, v]) => ({ k, v }));

  const facts = [
    { k: "Brand", v: brand ? <Link to={paths.brand(brand.id)} className={inlineLink}>{brand.name}</Link> : "—" },
    { k: "Country", v: brand?.country ?? "—" },
    { k: "Type", v: type?.name ?? "—" },
    { k: "Discipline", v: discipline?.name ?? "—" },
    { k: "Default warranty", v: plural(model.defaultWarrantyMonths, "month") },
    { k: "Lifecycle", v: model.discontinued ? <Badge tone="neutral">Discontinued</Badge> : <Badge tone="ok">Current</Badge> },
    ...(successor ? [{ k: "Successor", v: <Link to={paths.model(successor.id)} className={monoLink}>{successor.modelNo}</Link> }] : []),
    ...(predecessors.length > 0
      ? [{
          k: "Replaces",
          v: (
            <span className="flex flex-wrap gap-x-3 gap-y-1">
              {predecessors.map((p) => (
                <Link key={p.id} to={paths.model(p.id)} className={monoLink}>{p.modelNo}</Link>
              ))}
            </span>
          ),
        }]
      : []),
    { k: "Installed", v: assets.length > 0 ? <Link to={registry} onClick={allTowers} className={inlineLink}>{plural(assets.length, "asset")}</Link> : "None" },
    { k: "Towers", v: groups.length > 0 ? groups.map((g) => g.tower.code).join(", ") : "—" },
  ];

  return (
    <div>
      <div className="print:hidden">
        <Breadcrumb
          items={[
            { to: paths.catalogue(), label: "Brands & models" },
            ...(brand ? [{ to: paths.brand(brand.id), label: brand.name }] : []),
            { label: model.modelNo },
          ]}
        />
      </div>
      <PageHeader
        eyebrow={
          <>
            Model · {type?.name ?? "Equipment"}
            <span className="hidden print:inline"> · Specification sheet · Rockwell Building</span>
          </>
        }
        title={<span className="break-words font-mono">{model.modelNo}</span>}
        lede={
          brand ? (
            <>
              By <Link to={paths.brand(brand.id)} className="focus-ring rounded font-semibold text-ink hover:underline">{brand.name}</Link>, {brand.country}.
              {discipline && ` ${discipline.name} equipment.`}
            </>
          ) : undefined
        }
        actions={
          <>
            <Button variant="ghost" className="print:hidden" onClick={() => window.print()}>
              <Printer aria-hidden="true" className="size-4" strokeWidth={2} />
              Print
            </Button>
            {assets.length > 0 && (
              <Button to={registry} onClick={allTowers} variant="primary" className="print:hidden">
                <Boxes aria-hidden="true" className="size-4" strokeWidth={2} />
                View {plural(assets.length, "asset")}
              </Button>
            )}
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {model.discontinued ? <Badge tone="neutral">Discontinued</Badge> : <Badge tone="ok">Current</Badge>}
          {discipline && <Badge tone="neutral">{discipline.name}</Badge>}
          {type && <Badge tone="neutral">{type.name}</Badge>}
        </div>
      </PageHeader>

      {model.discontinued && (
        <Notice tone="warn" className="mb-6 print:mb-3">
          Discontinued.{" "}
          {successor ? (
            <>
              Replaced by <Link to={paths.model(successor.id)} className="focus-ring rounded font-mono underline">{successor.modelNo}</Link>.
            </>
          ) : (
            "No successor model is recorded."
          )}
          {assets.length > 0 && ` ${plural(assets.length, "installed asset")} still ${assets.length === 1 ? "uses" : "use"} it.`}
        </Notice>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] print:grid-cols-2">
        <div className="min-w-0 space-y-4">
          <Card title="Specifications" className="print:p-4">
            {specs.length > 0 ? <KV items={specs} /> : <p className="type-small text-muted">No specifications are recorded for this model.</p>}
          </Card>

          {assets.length === 0 ? (
            <EmptyState icon={Boxes} title="Not installed" body="No asset in any tower uses this model, so there is no where-used or warranty spread yet." />
          ) : (
            <>
              <Card title="Warranty spread" className="print:p-4">
                <div className="grid grid-cols-3 gap-3">
                  {spread.buckets.map((b) => {
                    const tile = (
                      <StatTile
                        label={b.key === "soon" ? "≤ 90 d" : b.label}
                        value={fmtNumber(b.count)}
                        tone={b.key === "expired" && b.count > 0 ? "hot" : "default"}
                        className="h-full"
                      />
                    );
                    // an empty bucket is not a link: it would open a registry with no rows
                    return b.count > 0 ? (
                      <Link
                        key={b.key}
                        to={paths.assets({ model: model.id, band: b.bands })}
                        onClick={allTowers}
                        aria-label={`${b.count} ${b.key === "soon" ? "ending within 90 days" : b.label.toLowerCase()}, open in registry`}
                        className="focus-ring rounded-card transition-opacity duration-150 hover:opacity-80"
                      >
                        {tile}
                      </Link>
                    ) : (
                      <div key={b.key}>{tile}</div>
                    );
                  })}
                </div>
                <div className="mt-4">
                  <WarrantySpreadBar buckets={spread.buckets} none={spread.none} />
                </div>
                {spread.none > 0 && (
                  <p className="type-small mt-3 text-muted">
                    <Link to={paths.assets({ model: model.id, band: ["none"] })} onClick={allTowers} className="focus-ring rounded font-bold text-ink hover:underline">
                      {plural(spread.none, "asset")}
                    </Link>{" "}
                    with no warranty on file.
                  </p>
                )}
              </Card>

              <Card title="Installed by tower" className="print:p-4" actions={<Button to={registry} onClick={allTowers} variant="ghost" size="sm" className="print:hidden">Open in registry</Button>}>
                <WhereUsedBars rows={perTower} hrefFor={(towerId) => paths.assets({ model: model.id, tower: towerId })} />
              </Card>
            </>
          )}
        </div>

        <div className="min-w-0 space-y-4">
          <Card title="Model facts" className="print:p-4">
            <KV items={facts} />
          </Card>

          <Card title="Datasheet" className="print:p-4">
            {datasheets.length === 0 ? (
              <p className="type-small text-muted">
                <FileText aria-hidden="true" className="mr-1.5 inline size-4 align-text-bottom" strokeWidth={2} />
                No datasheet is on file for this model yet.
              </p>
            ) : (
              <div className="space-y-3">
                {datasheets.map((d) => (
                  <DocumentCard key={d.id} doc={d} />
                ))}
              </div>
            )}
            {otherDocs.length > 0 && (
              <div className={cn("print:hidden", datasheets.length === 0 ? "mt-4" : "mt-4 border-t border-line pt-4")}>
                <p className="type-eyebrow mb-1">Also linked to this model</p>
                <ul>
                  {otherDocs.map((d) => (
                    <li key={d.id}>
                      <Link to={paths.document(d.id)} className="focus-ring -mx-2 flex min-h-10 flex-col justify-center rounded px-2 py-1.5 transition-colors duration-150 hover:bg-surface-2">
                        <span className="font-mono text-[11px] font-bold text-muted">{d.docNo}</span>
                        <span className="text-[13px] font-semibold text-ink">{d.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          <Card title="House standard" className="print:p-4">
            {standards.length === 0 ? (
              <p className="type-small text-muted">
                <Ruler aria-hidden="true" className="mr-1.5 inline size-4 align-text-bottom" strokeWidth={2} />
                No design standard covers this equipment type.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {standards.map(({ standard, tier }) => (
                  <li key={standard.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <Link to={paths.standard(standard.id)} className="focus-ring rounded font-mono text-[12px] font-bold text-ink hover:underline">{standard.code}</Link>
                      <p className="type-small text-ink-soft">{standard.title}</p>
                    </div>
                    <TierBadge tier={tier} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {groups.length > 0 && (
        <section className="mt-6 min-w-0 space-y-4 print:hidden">
          <h2 className="type-heading text-ink">
            Installed instances<span className="ml-2 tabular-nums text-muted">{assets.length}</span>
          </h2>
          {groups.map(({ tower, count }) => (
            <div key={tower.id} className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <h3 className="text-[14px] font-bold text-ink">
                  <span className="mr-1.5 font-mono text-[12px] font-normal text-muted">{tower.code}</span>
                  {tower.name}
                  <span className="ml-2 tabular-nums text-muted">{count}</span>
                </h3>
                <Button to={paths.assets({ model: model.id, tower: tower.id })} variant="ghost" size="sm">Open in registry</Button>
              </div>
              <AssetsTable db={db} assets={assets.filter((a) => a.towerId === tower.id)} />
            </div>
          ))}
        </section>
      )}

      <p className="type-small mt-4 hidden text-muted print:block">
        Printed {fmtDate(todayISO())} from Rockwell Building · Sample data for demonstration
      </p>
    </div>
  );
}
