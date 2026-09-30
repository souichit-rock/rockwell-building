import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { Badge, Button, Drawer, Field, Modal, Notice, inputClass, textareaClass } from "@/components/ui";
import { complianceMatrix } from "@/data/selectors";
import { newId, upsert, useDb } from "@/data/store";
import type { Id, Standard, Waiver } from "@/data/types";
import { daysFromNow, fmtDate, todayISO } from "@/lib/dates";
import { plural } from "@/lib/format";
import { paths } from "@/lib/paths";
import { complianceTone } from "@/lib/status";
import { governedAssets, heatTone, placeOf, sharePct, sumCells, type Governed } from "../lib";
import { ComplianceBadge, TierBadge } from "./parts";

export interface OpenCell { towerId: Id; standardId: Id }

interface Row extends Governed {
  typeName: string;
  brandId: Id | undefined;
  brandName: string;
  modelNo: string;
  floorLabel: string;
  spaceName: string;
  waiver: Waiver | undefined;
}

const FORM_ID = "raise-waiver-form";
type Errors = Partial<Record<"reason" | "approvedBy" | "approvedAt" | "expiresAt", string>>;

function WaiverForm({ row, standard, approver, onSaved }: { row: Row; standard: Standard; approver: string; onSaved: () => void }) {
  const [reason, setReason] = useState("");
  const [approvedBy, setApprovedBy] = useState(approver);
  const [approvedAt, setApprovedAt] = useState(todayISO());
  const [expiresAt, setExpiresAt] = useState(daysFromNow(180));
  const [errors, setErrors] = useState<Errors>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: Errors = {};
    if (!reason.trim()) next.reason = "Give the reason for the exception.";
    if (!approvedBy.trim()) next.approvedBy = "Name the approver.";
    if (!approvedAt) next.approvedAt = "Pick the approval date.";
    if (expiresAt && (expiresAt < todayISO() || (approvedAt && expiresAt < approvedAt))) next.expiresAt = "The expiry must be today or later, and not before the approval date.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    upsert("waivers", {
      id: newId("waiver"), towerId: row.asset.towerId, assetId: row.asset.id, standardId: standard.id,
      reason: reason.trim(), approvedBy: approvedBy.trim(), approvedAt, ...(expiresAt ? { expiresAt } : {}),
    });
    onSaved();
  };

  return (
    <form id={FORM_ID} onSubmit={submit} noValidate className="space-y-4">
      <div className="rounded-ctl bg-surface-2 px-4 py-3">
        <p className="font-mono text-[12px] font-bold text-ink">{row.asset.tag}</p>
        <p className="text-sm font-semibold text-ink">{row.typeName}</p>
        <p className="mt-0.5 text-xs text-ink-soft">
          {row.brandName} <span className="font-mono">{row.modelNo}</span> · exception to {standard.code}
        </p>
      </div>
      <Field label="Reason" error={errors.reason} hint="Why the exception is acceptable and what will end it.">
        <textarea className={textareaClass} rows={4} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
      <Field label="Approved by" error={errors.approvedBy}>
        <input className={inputClass} value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Approved on" error={errors.approvedAt}>
          <input type="date" className={inputClass} value={approvedAt} onChange={(e) => setApprovedAt(e.target.value)} />
        </Field>
        <Field label="Expires" error={errors.expiresAt} hint="Clear the date for no expiry.">
          <input type="date" className={inputClass} value={expiresAt} min={todayISO()} onChange={(e) => setExpiresAt(e.target.value)} />
        </Field>
      </div>
    </form>
  );
}

/** Right-hand panel for one heatmap cell: the assets that keep it below 100 % (deviations, phase-out) plus the waived ones, with the actions to act on them. */
export function ComplianceDrawer({ cell, onClose }: { cell: OpenCell | null; onClose: () => void }) {
  const [waiverFor, setWaiverFor] = useState<Id | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const view = useDb((db) => {
    const standard = cell && db.standards[cell.standardId];
    const tower = cell && db.towers[cell.towerId];
    if (!cell || !standard || !tower) return null;
    const rows: Row[] = governedAssets(db, standard.id, tower.id)
      .filter((g) => g.c.status !== "compliant")
      .map((g) => {
        const model = db.models[g.asset.modelId];
        const place = placeOf(db, g.asset);
        return {
          ...g,
          typeName: db.equipmentTypes[g.asset.equipmentTypeId]?.name ?? g.asset.equipmentTypeId,
          brandId: model?.brandId,
          brandName: (model && db.brands[model.brandId]?.name) ?? "Unknown brand",
          modelNo: model?.modelNo ?? "",
          floorLabel: place.floor?.label ?? g.asset.floorId,
          spaceName: place.space?.name ?? g.asset.spaceId,
          waiver: g.c.waiverId ? db.waivers[g.c.waiverId] : undefined,
        };
      });
    return {
      standard, tower, rows,
      totals: sumCells(complianceMatrix(db).filter((c) => c.standardId === standard.id && c.towerId === tower.id)),
      approver: Object.values(db.teamMembers).find((m) => m.team === "Design & Technical")?.name ?? "",
    };
  });

  const close = () => {
    setFlash(null);
    setWaiverFor(null);
    onClose();
  };
  const target = view?.rows.find((r) => r.asset.id === waiverFor);
  const pct = view ? sharePct(view.totals) : null;

  return (
    <>
      <Drawer open={view !== null} onClose={close} title={view ? `${view.standard.code} · ${view.tower.name}` : "Compliance"}>
        {view && (
          <>
            <div className="space-y-2">
              <Link to={paths.standard(view.standard.id)} className="focus-ring rounded text-[14px] font-bold text-ink hover:underline">{view.standard.title}</Link>
              <p className="text-xs text-ink-soft">{plural(view.totals.total, "governed asset")} in {view.tower.name}</p>
              <div className="flex flex-wrap gap-2">
                <Badge tone={heatTone(pct)}>{pct === null ? "n/a" : `${pct}% compliant`}</Badge>
                {view.totals.deviations > 0 && <Badge tone={complianceTone("deviation")}>{plural(view.totals.deviations, "deviation")}</Badge>}
                {view.totals.phaseOut > 0 && <Badge tone={complianceTone("phase-out")}>{view.totals.phaseOut} phase-out</Badge>}
                {view.totals.waived > 0 && <Badge tone={complianceTone("waived")}>{view.totals.waived} waived</Badge>}
              </div>
            </div>

            {flash && <Notice tone="ok">{flash}</Notice>}

            {view.rows.length === 0 ? (
              <Notice tone="ok">Every governed asset in this cell complies with the standard.</Notice>
            ) : (
              <ul className="space-y-3">
                {view.rows.map((r) => (
                  <li key={r.asset.id} className="rounded-card border border-line bg-surface p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link to={paths.asset(r.asset.id)} className="focus-ring rounded font-mono text-[12px] font-bold text-ink hover:underline">{r.asset.tag}</Link>
                        <p className="text-[14px] font-bold text-ink">{r.typeName}</p>
                        <p className="text-xs text-ink-soft">
                          {r.brandId ? <Link to={paths.brand(r.brandId)} className="focus-ring rounded hover:underline">{r.brandName}</Link> : r.brandName}{" "}
                          <span className="font-mono">{r.modelNo}</span>
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <ComplianceBadge status={r.c.status} />
                        <TierBadge tier={r.c.tier} />
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-ink-soft">
                      <Link to={paths.floor(r.asset.towerId, r.asset.floorId, { highlight: `asset:${r.asset.id}` })} className="focus-ring rounded font-semibold text-ink hover:underline">{r.floorLabel}</Link>
                      {" / "}
                      <Link to={paths.space(r.asset.spaceId)} className="focus-ring rounded hover:underline">{r.spaceName}</Link>
                    </p>
                    {r.waiver ? (
                      <div className="mt-3 rounded-ctl bg-surface-2 px-3 py-2 text-xs text-ink-soft">
                        <p className="font-bold text-ink">Waiver in force</p>
                        <p>
                          Approved by {r.waiver.approvedBy} on {fmtDate(r.waiver.approvedAt)} · {r.waiver.expiresAt ? `expires ${fmtDate(r.waiver.expiresAt)}` : "no expiry"}
                        </p>
                        <p className="mt-1">{r.waiver.reason}</p>
                      </div>
                    ) : (
                      <p className="mt-2 text-xs font-semibold text-muted">No waiver</p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {r.c.status !== "waived" && (
                        <Button variant="ghost" size="sm" onClick={() => setWaiverFor(r.asset.id)}>Raise waiver</Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        to={paths.newWorkOrder({
                          assetId: r.asset.id,
                          towerId: r.asset.towerId,
                          title: `${r.asset.tag}: ${r.brandName} does not meet ${view.standard.code}`,
                        })}
                      >
                        Raise work order
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Drawer>

      <Modal
        open={target !== undefined}
        onClose={() => setWaiverFor(null)}
        title="Raise waiver"
        footer={
          <>
            <Button variant="ghost" onClick={() => setWaiverFor(null)}>Cancel</Button>
            <Button variant="primary" type="submit" form={FORM_ID}>Record waiver</Button>
          </>
        }
      >
        {target && view && (
          <WaiverForm
            row={target}
            standard={view.standard}
            approver={view.approver}
            onSaved={() => {
              setWaiverFor(null);
              setFlash(`Waiver recorded for ${target.asset.tag}. The matrix and every badge now count it as waived.`);
            }}
          />
        )}
      </Modal>
    </>
  );
}
