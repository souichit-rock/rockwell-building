import { FileText, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { NotFound } from "@/app/NotFound";
import {
  Badge, Breadcrumb, Button, Card, DataTable, DocumentCard, EmptyState, KV, PageHeader, StatTile, selectClass, type Column,
} from "@/components/ui";
import { complianceMatrix, docsFor } from "@/data/selectors";
import { upsert, useDb } from "@/data/store";
import type { ApprovalTier, BrandApproval, Id, Standard } from "@/data/types";
import { fmtDate, todayISO } from "@/lib/dates";
import { fmtNumber, plural } from "@/lib/format";
import { paths } from "@/lib/paths";
import { complianceTone } from "@/lib/status";
import { AdoptionBar, ComplianceBadge, LinkChip, TierBadge } from "../components/parts";
import { TIERS, governedAssets, placeOf, sentence, severity, sharePct, sumCells, waiverActive, type Governed } from "../lib";

interface AssetRow extends Governed {
  typeName: string;
  brandId: Id | undefined;
  brandName: string;
  modelNo: string;
  where: string;
}

function Section({ title, hint, children }: { title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="type-heading text-ink">{title}</h2>
        {hint && <p className="type-small mt-1 text-muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export default function StandardDetail() {
  const { standardId = "" } = useParams();
  const standard = useDb((db) => (Object.hasOwn(db.standards, standardId) ? db.standards[standardId] : undefined));
  if (!standard) return <NotFound what="standard" id={standardId} />;
  return <Detail standard={standard} />;
}

function Detail({ standard }: { standard: Standard }) {
  const navigate = useNavigate();
  const view = useDb((db) => {
    const assets: AssetRow[] = governedAssets(db, standard.id).map(({ asset, c }) => {
      const model = db.models[asset.modelId];
      const place = placeOf(db, asset);
      return {
        asset, c,
        typeName: db.equipmentTypes[asset.equipmentTypeId]?.name ?? asset.equipmentTypeId,
        brandId: model?.brandId,
        brandName: (model && db.brands[model.brandId]?.name) ?? "Unknown brand",
        modelNo: model?.modelNo ?? "",
        where: [place.tower?.code, place.floor?.label, place.space?.name].filter(Boolean).join(" · "),
      };
    });
    return {
      discipline: db.disciplines[standard.disciplineId],
      types: standard.equipmentTypeIds.map((id) => db.equipmentTypes[id]).filter((t) => t !== undefined),
      towers: Object.values(db.towers),
      brands: db.brands,
      cells: complianceMatrix(db).filter((c) => c.standardId === standard.id),
      docs: docsFor(db, "standard", standard.id),
      assets,
      waivers: Object.values(db.waivers)
        .filter((w) => w.standardId === standard.id)
        .sort((a, b) => b.approvedAt.localeCompare(a.approvedAt))
        .map((w) => ({ w, tag: db.assets[w.assetId]?.tag ?? w.assetId, tower: db.towers[w.towerId]?.name ?? w.towerId })),
    };
  });
  const today = todayISO();
  const totals = sumCells(view.cells);
  const pct = sharePct(totals);
  const appliesTo = standard.appliesToTowerIds.length === 0 ? view.towers : view.towers.filter((t) => standard.appliesToTowerIds.includes(t.id));

  const setTier = (brandId: Id, tier: ApprovalTier) =>
    upsert("standards", { ...standard, approvals: standard.approvals.map((a) => (a.brandId === brandId ? { ...a, tier } : a)) });

  const approvalColumns: Column<BrandApproval>[] = [
    {
      key: "brand", label: "Brand", sort: (a) => view.brands[a.brandId]?.name ?? a.brandId,
      render: (a) => (
        <Link to={paths.brand(a.brandId)} className="focus-ring rounded hover:underline">{view.brands[a.brandId]?.name ?? a.brandId}</Link>
      ),
    },
    { key: "tier", label: "Tier", sort: (a) => TIERS.indexOf(a.tier), render: (a) => <TierBadge tier={a.tier} /> },
    { key: "note", label: "Note", render: (a) => <span className="block min-w-48 whitespace-normal font-normal text-ink-soft">{a.note ?? "—"}</span> },
    {
      key: "demo", label: "Demo tier",
      render: (a) => (
        <select
          aria-label={`Tier for ${view.brands[a.brandId]?.name ?? a.brandId}`}
          value={a.tier}
          onChange={(e) => {
            const tier = TIERS.find((t) => t === e.target.value);
            if (tier) setTier(a.brandId, tier);
          }}
          className={`${selectClass} sm:w-40 text-[13px] font-semibold`}
        >
          {TIERS.map((t) => (
            <option key={t} value={t}>{sentence(t)}</option>
          ))}
        </select>
      ),
    },
  ];

  const assetColumns: Column<AssetRow>[] = [
    {
      key: "tag", label: "Tag", mono: true, sort: (r) => r.asset.tag,
      render: (r) => <Link to={paths.asset(r.asset.id)} className="focus-ring rounded font-bold text-ink hover:underline">{r.asset.tag}</Link>,
    },
    { key: "type", label: "Equipment", sort: (r) => r.typeName, render: (r) => r.typeName },
    {
      key: "brand", label: "Brand · model", sort: (r) => r.brandName,
      render: (r) => (
        <span className="whitespace-nowrap">
          {r.brandId ? <Link to={paths.brand(r.brandId)} className="focus-ring rounded hover:underline">{r.brandName}</Link> : r.brandName}
          <span className="ml-1.5 font-mono text-[12px] font-normal text-muted">{r.modelNo}</span>
        </span>
      ),
    },
    { key: "where", label: "Location", sort: (r) => r.where, render: (r) => <span className="whitespace-nowrap font-normal text-ink-soft">{r.where}</span> },
    { key: "tier", label: "Tier", sort: (r) => (r.c.tier ? TIERS.indexOf(r.c.tier) : TIERS.length), render: (r) => <TierBadge tier={r.c.tier} /> },
    { key: "status", label: "Compliance", sort: (r) => severity(r.c.status), render: (r) => <ComplianceBadge status={r.c.status} /> },
  ];

  return (
    <>
      <Breadcrumb items={[{ to: paths.standards(), label: "Design standards" }, { label: standard.code }]} />
      <PageHeader
        eyebrow={view.discipline?.name ?? standard.disciplineId}
        title={standard.title}
        lede={
          <>
            <span className="font-mono text-[13px] font-bold text-ink">{standard.code}</span> · Revision {standard.revision} · Effective {fmtDate(standard.effectiveDate)} · Owned by the {standard.ownerTeam} team
          </>
        }
        actions={<Button to={paths.compliance()} variant="ghost">Compliance matrix</Button>}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Governed assets" value={fmtNumber(totals.total)} delta="Installed under this standard" />
            <StatTile label="Compliance" value={pct === null ? "n/a" : `${pct}%`} tone="gold" delta={`${fmtNumber(totals.compliant + totals.waived)} compliant or waived`} />
            <StatTile label="Phase-out" value={fmtNumber(totals.phaseOut)} delta="Assets on a phase-out brand" />
            <StatTile label="Deviations" value={fmtNumber(totals.deviations)} tone={totals.deviations > 0 ? "hot" : "default"} delta="Prohibited or unlisted brand" />
          </div>

          <Card title="Clauses">
            <ol className="space-y-3">
              {standard.clauses.map((clause, i) => (
                <li key={clause} className="flex gap-3">
                  <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-surface-2 text-[11px] font-black tabular-nums text-ink-soft">{i + 1}</span>
                  <p className="type-body min-w-0 text-ink">{clause}</p>
                </li>
              ))}
            </ol>
          </Card>

          <Section
            title="Approved brands"
            hint="Demo control: change a tier and every badge, adoption bar and matrix cell recalculates. Edits stay in this browser until the demo data is reset."
          >
            <DataTable columns={approvalColumns} rows={standard.approvals} rowKey={(a) => a.brandId} />
          </Section>

          <Section title="Installed assets" hint={`${plural(totals.total, "asset")} governed by ${standard.code}, worst first.`}>
            <DataTable
              columns={assetColumns}
              rows={view.assets}
              rowKey={(r) => r.asset.id}
              onRowClick={(r) => navigate(paths.asset(r.asset.id))}
              empty={<EmptyState icon={ShieldCheck} title="No installed assets" body="No installed asset falls under this standard yet." />}
            />
          </Section>

          <Section title="Waivers" hint="Approved exceptions for a single asset. A waived asset counts as compliant while the waiver is in force.">
            {view.waivers.length === 0 ? (
              <EmptyState icon={ShieldCheck} title="No waivers" body="No asset is exempt from this standard." />
            ) : (
              <DataTable
                columns={[
                  {
                    key: "asset", label: "Asset", mono: true, sort: (x) => x.tag,
                    render: (x) => <Link to={paths.asset(x.w.assetId)} className="focus-ring rounded font-bold text-ink hover:underline">{x.tag}</Link>,
                  },
                  { key: "tower", label: "Tower", sort: (x) => x.tower, render: (x) => x.tower },
                  { key: "reason", label: "Reason", render: (x) => <span className="block min-w-64 whitespace-normal font-normal text-ink-soft">{x.w.reason}</span> },
                  { key: "by", label: "Approved by", render: (x) => <span className="whitespace-nowrap">{x.w.approvedBy}</span> },
                  { key: "at", label: "Approved", sort: (x) => x.w.approvedAt, render: (x) => <span className="whitespace-nowrap">{fmtDate(x.w.approvedAt)}</span> },
                  { key: "exp", label: "Expires", sort: (x) => x.w.expiresAt ?? "9999", render: (x) => <span className="whitespace-nowrap">{x.w.expiresAt ? fmtDate(x.w.expiresAt) : "No expiry"}</span> },
                  {
                    key: "status", label: "Status",
                    render: (x) => (waiverActive(x.w, today) ? <Badge tone={complianceTone("waived")}>Active</Badge> : <Badge tone="neutral">Expired</Badge>),
                  },
                ]}
                rows={view.waivers}
                rowKey={(x) => x.w.id}
              />
            )}
          </Section>
        </div>

        <aside className="min-w-0 space-y-4">
          <Card title="Standard" tight>
            <KV
              items={[
                { k: "Code", v: standard.code, mono: true },
                { k: "Discipline", v: view.discipline?.name ?? standard.disciplineId },
                { k: "Revision", v: standard.revision },
                { k: "Effective", v: fmtDate(standard.effectiveDate) },
                { k: "Owner", v: `${standard.ownerTeam} team` },
              ]}
            />
          </Card>

          <Card title="Covers equipment" tight>
            <div className="flex flex-wrap gap-2">
              {view.types.map((t) => (
                <LinkChip key={t.id} to={paths.assets({ type: t.id })}>{t.name}</LinkChip>
              ))}
            </div>
          </Card>

          <Card title="Applies to" tight>
            <p className="type-small mb-3 text-muted">{standard.appliesToTowerIds.length === 0 ? "Whole portfolio" : plural(appliesTo.length, "tower")}</p>
            <div className="flex flex-wrap gap-2">
              {appliesTo.map((t) => (
                <LinkChip key={t.id} to={paths.tower(t.id)}>{t.name}</LinkChip>
              ))}
            </div>
          </Card>

          <Card title="Adoption by tower" tight>
            <ul className="space-y-3">
              {appliesTo.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3">
                  <Link to={paths.tower(t.id)} className="focus-ring rounded font-mono text-[12px] font-bold text-ink hover:underline">{t.code}</Link>
                  <AdoptionBar totals={sumCells(view.cells.filter((c) => c.towerId === t.id))} />
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Linked documents" tight>
            {view.docs.length === 0 ? (
              <EmptyState icon={FileText} title="No linked documents" body="No document references this standard yet." className="py-6!" />
            ) : (
              <div className="space-y-3">
                {view.docs.map((d) => (
                  <DocumentCard key={d.id} doc={d} />
                ))}
              </div>
            )}
          </Card>
        </aside>
      </div>
    </>
  );
}
