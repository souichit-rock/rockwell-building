import { Boxes, Ruler, Tags } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";
import NotFound from "@/app/NotFound";
import {
  Badge, Breadcrumb, Button, Card, DataTable, EmptyState, KV, Monogram, Notice, PageHeader, StatTile, type Column,
} from "@/components/ui";
import { brandImpact } from "@/data/selectors";
import { useDb } from "@/data/store";
import { fmtDate } from "@/lib/dates";
import { fmtNumber, plural } from "@/lib/format";
import { paths } from "@/lib/paths";
import { AssetsTable } from "../components/AssetsTable";
import { Section } from "../components/Section";
import { TierBadge } from "../components/TierBadge";
import { WhereUsedBars } from "../components/WhereUsedBars";
import {
  approvalsOf, assetsOfBrand, bestTier, countByTower, installedCounts, isRestricted, lookup, modelRows, openWosOnAssets, specLine,
  sentence, tierRank, vendorsOfBrand, words, type BrandApprovalRow, type ModelRow,
} from "../lib";

const inlineLink = "focus-ring rounded font-bold text-ink hover:underline";

export default function BrandPage() {
  const { brandId } = useParams();
  const db = useDb((d) => d);
  const navigate = useNavigate();
  const brand = lookup(db.brands, brandId);
  if (!brand) return <NotFound what="brand" id={brandId} />;

  const assets = assetsOfBrand(db, brand.id);
  const models = modelRows(db, installedCounts(db).byModel).filter((r) => r.model.brandId === brand.id)
    .sort((a, b) => a.model.modelNo.localeCompare(b.model.modelNo, "en", { numeric: true }));
  const approvals = approvalsOf(db, brand.id);
  const best = bestTier(approvals);
  const restricted = approvals.filter((a) => isRestricted(a.tier));
  const impact = brandImpact(db, brand.id);
  const openWos = openWosOnAssets(db, assets);
  const vendors = vendorsOfBrand(db, brand.id);
  const perTower = countByTower(db, assets);
  const towerCode = (id: string) => db.towers[id]?.code ?? id;
  const discontinued = models.filter((r) => r.model.discontinued).length;
  const registry = paths.assets({ brand: brand.id });

  const approvalColumns: Column<BrandApprovalRow>[] = [
    {
      key: "standard", label: "Standard", mono: true, sort: (r) => r.standard.code,
      render: (r) => <Link to={paths.standard(r.standard.id)} className={inlineLink}>{r.standard.code}</Link>,
    },
    { key: "title", label: "Title", sort: (r) => r.standard.title, render: (r) => r.standard.title },
    { key: "tier", label: "Approval", sort: (r) => tierRank(r.tier), render: (r) => <TierBadge tier={r.tier} /> },
    { key: "note", label: "Note", render: (r) => <span className="text-ink-soft">{r.note ?? "—"}</span> },
  ];

  const modelColumns: Column<ModelRow>[] = [
    {
      key: "model", label: "Model", mono: true, sort: (r) => r.model.modelNo,
      render: (r) => <Link to={paths.model(r.model.id)} className={inlineLink}>{r.model.modelNo}</Link>,
    },
    { key: "type", label: "Type", sort: (r) => r.type?.name ?? "", render: (r) => r.type?.name ?? "—" },
    { key: "specs", label: "Specifications", render: (r) => <span className="text-ink-soft">{specLine(r.model) || "—"}</span> },
    {
      key: "installed", label: "Installed", align: "right", sort: (r) => r.installed,
      render: (r) =>
        r.installed > 0 ? (
          <Link to={paths.assets({ model: r.model.id })} className={inlineLink}>{fmtNumber(r.installed)}</Link>
        ) : (
          <span className="text-muted">0</span>
        ),
    },
    {
      key: "status", label: "Status", sort: (r) => Number(r.model.discontinued),
      render: (r) =>
        r.model.discontinued ? (
          <span className="flex flex-col items-start gap-1">
            <Badge tone="neutral">Discontinued</Badge>
            {r.successor && (
              <Link to={paths.model(r.successor.id)} className="focus-ring rounded text-xs font-semibold text-ink-soft hover:underline">
                Replaced by <span className="font-mono">{r.successor.modelNo}</span>
              </Link>
            )}
          </span>
        ) : (
          <span className="text-muted">Current</span>
        ),
    },
  ];

  return (
    <div>
      <Breadcrumb items={[{ to: paths.catalogue(), label: "Brands & models" }, { label: brand.name }]} />
      <PageHeader
        eyebrow={`Brand · ${brand.country}`}
        title={
          <span className="flex items-center gap-4">
            <Monogram name={brand.name} size="lg" />
            <span className="min-w-0 break-words">{brand.name}</span>
          </span>
        }
        lede={brand.note}
        actions={
          assets.length > 0 && (
            <Button to={registry} variant="primary">
              <Boxes aria-hidden="true" className="size-4" strokeWidth={2} />
              View {plural(assets.length, "asset")}
            </Button>
          )
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <TierBadge tier={best} />
          {brand.disciplineIds.map((d) => (
            <Badge key={d} tone="neutral">{db.disciplines[d]?.name ?? d}</Badge>
          ))}
        </div>
      </PageHeader>

      {restricted.length > 0 && (
        <Notice tone={restricted.some((r) => r.tier === "prohibited") ? "danger" : "warn"} className="mb-6">
          {restricted.map((r, i) => (
            <span key={r.standard.id}>
              {i > 0 && " "}
              {sentence(r.tier)} under{" "}
              <Link to={paths.standard(r.standard.id)} className="focus-ring rounded font-mono underline">{r.standard.code}</Link>
              {r.note ? `: ${r.note}` : "."}
            </span>
          ))}
          {assets.length > 0 && ` ${plural(assets.length, "installed asset")} ${assets.length === 1 ? "is" : "are"} affected.`}
        </Notice>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:grid-rows-[auto_1fr]">
        <Card title="Phase-out impact" className="lg:col-start-2 lg:row-start-1">
          <p className="type-small mb-4 text-ink-soft">What replacing this brand would touch today, across every tower.</p>
          {impact.assets === 0 ? (
            <Notice tone="info">Nothing from this brand is installed, so phasing it out would affect no asset.</Notice>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <StatTile label="Assets affected" value={fmtNumber(impact.assets)} tone={restricted.length > 0 ? "hot" : "default"} />
                <StatTile label="Towers" value={fmtNumber(impact.towerIds.length)} delta={impact.towerIds.map(towerCode).join(" · ")} />
                <StatTile label="Warranty left" value={fmtNumber(impact.warrantyAssetMonths)} delta="asset-months" />
                <StatTile label="Open work orders" value={fmtNumber(impact.openWos)} />
              </div>
              <KV className="mt-4" items={[{ k: "Oldest install", v: impact.oldestInstall ? fmtDate(impact.oldestInstall) : "—" }]} />
              {openWos.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {openWos.slice(0, 6).map((w) => (
                    <Link
                      key={w.id}
                      to={paths.workOrder(w.id)}
                      className="focus-ring rounded-full bg-surface-2 px-2.5 py-1 font-mono text-[11px] font-bold text-ink-soft transition-colors duration-150 hover:text-ink"
                    >
                      {w.number}
                    </Link>
                  ))}
                  {openWos.length > 6 && <span className="px-1 py-1 text-[11px] font-bold text-muted">+{openWos.length - 6} more</span>}
                </div>
              )}
            </>
          )}
        </Card>
        <div className="min-w-0 space-y-6 lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <Section title="Approval by standard" count={approvals.length}>
            <DataTable
              columns={approvalColumns}
              rows={approvals}
              rowKey={(r) => r.standard.id}
              onRowClick={(r) => navigate(paths.standard(r.standard.id))}
              empty={<EmptyState icon={Ruler} title="Not listed in any standard" body="No design standard names this brand yet, so no approval tier applies." />}
            />
          </Section>

          <Section title="Models" count={models.length}>
            <DataTable
              columns={modelColumns}
              rows={models}
              rowKey={(r) => r.model.id}
              onRowClick={(r) => navigate(paths.model(r.model.id))}
              empty={<EmptyState icon={Tags} title="No models" body="No model of this brand is in the catalogue." />}
            />
          </Section>

          <Section
            title="Where used"
            count={assets.length}
            actions={assets.length > 0 && <Button to={registry} variant="ghost" size="sm">Open in registry</Button>}
          >
            {assets.length === 0 ? (
              <EmptyState icon={Boxes} title="Not installed" body="No asset in any tower uses a model from this brand." />
            ) : (
              <div className="space-y-4">
                <Card tight title="Installed per tower">
                  <WhereUsedBars rows={perTower} hrefFor={(towerId) => paths.assets({ brand: brand.id, tower: towerId })} />
                </Card>
                <AssetsTable db={db} assets={assets} show={{ tower: true, model: true }} />
              </div>
            )}
          </Section>
        </div>

        <div className="min-w-0 space-y-4 lg:col-start-2 lg:row-start-2">
          <Card title="Brand facts">
            <KV
              items={[
                { k: "Country", v: brand.country },
                { k: "Disciplines", v: brand.disciplineIds.map((d) => db.disciplines[d]?.name ?? d).join(", ") },
                { k: "Models", v: discontinued > 0 ? `${models.length} (${discontinued} discontinued)` : String(models.length) },
                {
                  k: "Installed",
                  v: assets.length > 0 ? <Link to={registry} className={inlineLink}>{plural(assets.length, "asset")}</Link> : "None",
                },
                { k: "Towers", v: impact.towerIds.length > 0 ? impact.towerIds.map(towerCode).join(", ") : "—" },
              ]}
            />
          </Card>

          <Card title="Vendors" actions={<span className="type-small tabular-nums text-muted">{vendors.length}</span>}>
            {vendors.length === 0 ? (
              <p className="type-small text-muted">No vendor on file represents this brand.</p>
            ) : (
              <ul className="divide-y divide-line">
                {vendors.map((v) => {
                  const contact = v.contacts[0];
                  return (
                    <li key={v.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-start justify-between gap-3">
                        <Link to={paths.vendor(v.id)} className="focus-ring rounded text-[14px] font-bold text-ink hover:underline">{v.name}</Link>
                        <Badge tone="neutral">{words(v.kind)}</Badge>
                      </div>
                      {contact && (
                        <p className="type-small mt-1 text-ink-soft">
                          {contact.name} · {contact.role}
                        </p>
                      )}
                      {contact && (
                        <p className="type-small text-muted">
                          <a href={`tel:${contact.phone.replace(/\s+/g, "")}`} className="focus-ring rounded hover:text-ink">{contact.phone}</a>
                          {v.contract && ` · SLA ${v.contract.slaResponseHours} h response`}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
