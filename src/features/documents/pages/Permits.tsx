import { Download, RefreshCw, SearchX } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { Badge, Button, DataTable, EmptyState, Notice, StatTile, type Column } from "@/components/ui";
import { PERMIT_DUE_DAYS } from "@/data/selectors";
import { useDb } from "@/data/store";
import type { Document, Permit, PermitStatus, PMPlan } from "@/data/types";
import { downloadCsv, type CsvColumn } from "@/lib/csv";
import { fmtDate } from "@/lib/dates";
import { fmtNumber, plural } from "@/lib/format";
import { paths } from "@/lib/paths";
import { permitTone } from "@/lib/status";
import { DocsHeader } from "../components/DocsHeader";
import { ChipRow, FilterSelect, ScopeChip } from "../components/Filters";
import { RenewPermitModal } from "../components/RenewPermitModal";
import {
  PERMIT_LABEL, PERMIT_STATE_LABEL, PERMIT_TYPES, cmp, expiryNote, hasExpiry, linkClass, permitState, pick, renewalPlans, useQuery, useTowerFilter, words,
} from "../lib";

interface Row {
  permit: Permit;
  towerName: string;
  state: PermitStatus;
  plans: PMPlan[];
  planTag: string;
  cert: Document | undefined;
}

const FILTER_KEYS = ["tower", "type"];
const LINK = "focus-ring rounded hover:underline";
const NONE = <span className="text-muted">—</span>;

const expiryText = (p: Permit) => (hasExpiry(p) ? fmtDate(p.expiryDate) : "No expiry");

const CSV_COLUMNS: CsvColumn<Row>[] = [
  { label: "Tower", value: (r) => r.towerName },
  { label: "Permit type", value: (r) => PERMIT_LABEL[r.permit.type] },
  { label: "Number", value: (r) => r.permit.number },
  { label: "Issuer", value: (r) => r.permit.issuer },
  { label: "Issued", value: (r) => r.permit.issuedDate },
  { label: "Expires", value: (r) => (hasExpiry(r.permit) ? r.permit.expiryDate : "No expiry") },
  { label: "Status", value: (r) => PERMIT_STATE_LABEL[r.state] },
  { label: "Renewal PM plan", value: (r) => r.plans.map((p) => p.task).join("; ") },
  { label: "Certificate", value: (r) => r.cert?.docNo },
];

export default function Permits() {
  const db = useDb((d) => d);
  const { params, set } = useQuery();
  const { tower, towerName, scoped, choose, clearScope } = useTowerFilter();
  const [renewing, setRenewing] = useState<Permit | null>(null);
  const [renewed, setRenewed] = useState<Permit | null>(null);

  const type = pick(params.get("type"), PERMIT_TYPES);

  const inTower = Object.values(db.permits)
    .filter((p) => !tower || p.towerId === tower)
    .map(
      (permit): Row => {
        const plans = renewalPlans(db, permit.id);
        return {
          permit, plans, state: permitState(permit),
          towerName: db.towers[permit.towerId]?.name ?? permit.towerId,
          planTag: plans[0] ? (db.assets[plans[0].assetId]?.tag ?? plans[0].assetId) : "",
          cert: permit.docId ? db.documents[permit.docId] : undefined,
        };
      },
    );
  // most urgent first: the earliest expiry leads, permits that never lapse close the list
  const rows = inTower.filter((r) => !type || r.permit.type === type).sort((a, b) => cmp(a.permit.expiryDate, b.permit.expiryDate) || cmp(a.towerName, b.towerName));

  const count = (s: PermitStatus) => inTower.filter((r) => r.state === s).length;
  const expired = count("expired");

  const typeItems = PERMIT_TYPES.map((t) => ({ value: t, label: PERMIT_LABEL[t], count: inTower.filter((r) => r.permit.type === t).length })).filter(
    (i) => i.count > 0 || i.value === type,
  );
  const towers = Object.values(db.towers).sort((a, b) => cmp(a.name, b.name));

  const anyFilter = FILTER_KEYS.some((k) => params.has(k));
  const clearFilters = () => set(Object.fromEntries(FILTER_KEYS.map((k) => [k, null])));

  const columns: Column<Row>[] = [
    { key: "tower", label: "Tower", sort: (r) => r.towerName, render: (r) => <span className="whitespace-nowrap">{r.towerName}</span> },
    { key: "type", label: "Permit", sort: (r) => PERMIT_LABEL[r.permit.type], render: (r) => <span className="whitespace-nowrap">{PERMIT_LABEL[r.permit.type]}</span> },
    { key: "number", label: "Number", mono: true, sort: (r) => r.permit.number, render: (r) => <span className="whitespace-nowrap">{r.permit.number}</span> },
    { key: "issuer", label: "Issuer", sort: (r) => r.permit.issuer, render: (r) => <span className="block min-w-40">{r.permit.issuer}</span> },
    { key: "issued", label: "Issued", sort: (r) => r.permit.issuedDate, render: (r) => <span className="whitespace-nowrap">{fmtDate(r.permit.issuedDate)}</span> },
    {
      key: "expires", label: "Expires", sort: (r) => r.permit.expiryDate,
      render: (r) => {
        const note = expiryNote(r.permit);
        return (
          <div className="whitespace-nowrap">
            <p>{expiryText(r.permit)}</p>
            {note && <p className="text-xs text-muted">{note}</p>}
          </div>
        );
      },
    },
    { key: "status", label: "Status", sort: (r) => r.state, render: (r) => <Badge tone={permitTone(r.state)}>{words(r.state)}</Badge> },
    {
      key: "plan", label: "Renewal PM plan",
      render: (r) => {
        const [first, ...rest] = r.plans;
        if (!first) return NONE;
        return (
          <div className="min-w-48">
            <Link to={paths.plan(first.id)} className={LINK}>
              <span className="font-mono text-[12px]">{r.planTag}</span> · {first.task}
            </Link>
            <p className="text-xs text-muted">Next due {fmtDate(first.nextDue)}</p>
            {rest.length > 0 && (
              // this permit's other plans, each linked; the maintenance list cannot be filtered to one permit
              <details className="mt-1 text-xs">
                <summary className={`${linkClass} relative inline-block cursor-pointer after:absolute after:-inset-x-2 after:-inset-y-2 after:content-['']`}>
                  {`+${plural(rest.length, "more plan")}`}
                </summary>
                <ul className="mt-3 space-y-2">
                  {rest.map((p) => (
                    <li key={p.id}>
                      <Link to={paths.plan(p.id)} className={LINK}>
                        <span className="font-mono text-[12px]">{db.assets[p.assetId]?.tag ?? p.assetId}</span> · {p.task}
                      </Link>
                      <p className="text-muted">Next due {fmtDate(p.nextDue)}</p>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        );
      },
    },
    {
      key: "cert", label: "Certificate",
      render: (r) =>
        r.cert ? (
          <Link to={paths.document(r.cert.id)} className={`${LINK} whitespace-nowrap font-mono text-[12px]`}>{r.cert.docNo}</Link>
        ) : (
          NONE
        ),
    },
    {
      key: "renew", label: "Action",
      render: (r) =>
        hasExpiry(r.permit) ? (
          <Button variant="ghost" size="sm" aria-label={`Renew ${PERMIT_LABEL[r.permit.type]} permit, ${r.towerName}`} onClick={() => setRenewing(r.permit)}>
            <RefreshCw aria-hidden="true" className="size-3.5" strokeWidth={2} />
            Renew
          </Button>
        ) : (
          NONE
        ),
    },
  ];

  return (
    <div>
      <DocsHeader
        actions={
          <Button variant="ghost" disabled={rows.length === 0} onClick={() => downloadCsv("permits", CSV_COLUMNS, rows)}>
            <Download aria-hidden="true" className="size-4" strokeWidth={2} />
            Export CSV
          </Button>
        }
      />

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatTile label="Valid" value={fmtNumber(count("valid"))} delta={`of ${plural(inTower.length, "permit")}`} />
          <StatTile label={`Due ≤ ${PERMIT_DUE_DAYS} d`} value={fmtNumber(count("due"))} tone={count("due") > 0 ? "gold" : "default"} delta="Start the renewal now" />
          <StatTile
            label="Expired" value={fmtNumber(expired)} tone={expired > 0 ? "hot" : "default"} className="col-span-2 sm:col-span-1"
            delta={expired > 0 ? "Renew before the next inspection" : "None lapsed"}
          />
        </div>

        {renewed && (
          <Notice tone="ok">
            {PERMIT_LABEL[renewed.type]} permit for {db.towers[renewed.towerId]?.name ?? renewed.towerId} renewed as{" "}
            <span className="font-mono">{renewed.number}</span>, valid to {fmtDate(renewed.expiryDate)}.
          </Notice>
        )}

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <FilterSelect
              className="w-full sm:w-auto" label="Tower" allLabel="All towers" value={tower} onChange={choose}
              options={towers.map((t) => ({ value: t.id, label: t.name }))}
            />
          </div>
          <ChipRow label="Permit type" allCount={inTower.length} value={type} items={typeItems} onPick={(v) => set({ type: v })} />
          <div className="flex flex-wrap items-center gap-2">
            {scoped && <ScopeChip name={towerName} onClear={clearScope} />}
            {anyFilter && <Button variant="ghost" size="sm" onClick={clearFilters}>Clear filters</Button>}
            <p className="type-small ml-auto text-muted" aria-live="polite">{plural(rows.length, "permit")}</p>
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.permit.id}
          empty={
            <EmptyState
              icon={SearchX}
              title="No permits match"
              body="Try removing a filter or widening the tower scope."
              action={
                anyFilter || scoped ? (
                  <Button variant="ghost" size="sm" onClick={() => { clearFilters(); if (scoped) clearScope(); }}>Clear filters</Button>
                ) : undefined
              }
            />
          }
        />
      </div>

      <RenewPermitModal
        permit={renewing}
        onClose={() => setRenewing(null)}
        onSaved={(p) => {
          setRenewing(null);
          setRenewed(p);
        }}
      />
    </div>
  );
}
