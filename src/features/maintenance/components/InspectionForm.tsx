import { Plus, Trash2 } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useTowerScope } from "@/app/useTowerScope";
import {
  Button, Card, Chip, cn, EquipmentIcon, Field, inputClass, Notice, SearchInput, selectClass, textareaClass,
} from "@/components/ui";
import { PRIORITY_TARGET_HOURS, readingsSeries } from "@/data/selectors";
import { newId, nextNumber, upsert, useDb } from "@/data/store";
import type { Id, InspectionResult, InspectionType, ISODate, Reading, WOPriority } from "@/data/types";
import { addFrequency, fmtDate, todayISO } from "@/lib/dates";
import { paths } from "@/lib/paths";
import {
  FREQUENCY_LABEL, hoursFrom, INSPECTION_TYPE_LABEL, INSPECTION_TYPES, inspectorsFor, manilaIso, pick, PRIORITIES, priorityLabel,
  RESULT_LABEL, RESULTS, type SavedState,
} from "../lib";

interface Draft { key: number; label: string; value: string; unit: string }
interface Errors { asset?: string; date?: string; inspector?: string; readings?: string; findings?: string }

const SECTION_LABEL = "mb-1.5 block text-[11px] font-extrabold uppercase tracking-[.12em] text-muted";

/**
 * Phone-first new-inspection form (spec 6.8). Saving writes the inspection, reschedules the chosen PM plan from the visit date and,
 * when asked, raises a corrective work order reported by the inspector; then it opens the new inspection.
 */
export function InspectionForm({ initialAssetId, initialPlanId }: { initialAssetId?: Id; initialPlanId?: Id }) {
  const db = useDb((d) => d);
  const navigate = useNavigate();
  const today = todayISO();

  const initialPlan = pick(db.pmPlans, initialPlanId);
  const [assetId, setAssetId] = useState<Id>(initialAssetId ?? initialPlan?.assetId ?? "");
  const [picking, setPicking] = useState(assetId === "");
  const [search, setSearch] = useState("");
  const [allTowers, setAllTowers] = useState(false);
  const [planId, setPlanId] = useState<Id>(initialPlan && initialPlan.assetId === assetId ? initialPlan.id : "");
  const [type, setType] = useState<InspectionType>(initialPlan?.regulatory ? "regulatory" : "pm-visit");
  const [date, setDate] = useState<ISODate>(today);
  const [inspectorId, setInspectorId] = useState<Id>("");
  const [result, setResult] = useState<InspectionResult>("pass");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [findings, setFindings] = useState("");
  const [raise, setRaise] = useState(false);
  const [priority, setPriority] = useState<WOPriority | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const keys = useRef(0);
  const summary = useRef<HTMLDivElement>(null);
  const saving = useRef(false);
  const [busy, setBusy] = useState(false);

  const asset = pick(db.assets, assetId);
  const tower = pick(db.towers, asset?.towerId);
  const floor = pick(db.floors, asset?.floorId);
  const space = pick(db.spaces, asset?.spaceId);
  const equipment = pick(db.equipmentTypes, asset?.equipmentTypeId);
  const plans = asset ? Object.values(db.pmPlans).filter((p) => p.assetId === asset.id).sort((a, b) => (a.nextDue < b.nextDue ? -1 : 1)) : [];
  const plan = plans.find((p) => p.id === planId);
  const { people, fallback } = asset ? inspectorsFor(db, asset.towerId) : { people: [], fallback: undefined };
  const inspector = people.find((m) => m.id === inspectorId) ?? fallback;
  const failing = result !== "pass";
  const raising = raise && failing;
  const wantPriority: WOPriority = priority ?? (result === "fail" ? "P2" : "P3");
  const known = asset
    ? Object.entries(readingsSeries(db, asset.id))
        .map(([label, points]) => ({ label, unit: points[points.length - 1]?.unit ?? "" }))
        .filter((k) => !drafts.some((d) => d.label === k.label))
    : [];

  // the rail's tower scope narrows the asset search; "Search all towers" lifts it for this form only
  const { towerId: scopeId } = useTowerScope();
  const scope = allTowers ? undefined : pick(db.towers, scopeId);
  const q = search.trim().toLowerCase();
  const matches = q
    ? Object.values(db.assets)
        .filter((a) => !scope || a.towerId === scope.id)
        .filter((a) => `${a.tag} ${db.equipmentTypes[a.equipmentTypeId]?.name ?? ""} ${db.spaces[a.spaceId]?.name ?? ""} ${db.towers[a.towerId]?.name ?? ""}`.toLowerCase().includes(q))
        .sort((a, b) => (a.tag < b.tag ? -1 : 1))
    : [];

  const pickAsset = (id: Id) => {
    setAssetId(id);
    setPlanId("");
    setInspectorId("");
    setPicking(false);
    setSearch("");
    setErrors((e) => ({ ...e, asset: undefined }));
  };
  const pickPlan = (id: Id) => {
    setPlanId(id);
    const p = plans.find((x) => x.id === id);
    if (p) setType(p.regulatory ? "regulatory" : "pm-visit");
  };
  const addDraft = (label = "", unit = "") => {
    const key = ++keys.current;
    setDrafts((d) => [...d, { key, label, value: "", unit }]);
  };
  const patchDraft = (key: number, patch: Partial<Draft>) => setDrafts((d) => d.map((x) => (x.key === key ? { ...x, ...patch } : x)));

  function submit(e: FormEvent) {
    e.preventDefault();
    const next: Errors = {};
    if (!asset) next.asset = "Choose the asset that was inspected.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) next.date = "Enter the inspection date.";
    else if (date > today) next.date = "The inspection date cannot be in the future.";
    if (!inspector) next.inspector = "Choose an asset to see the team members for its tower.";
    const readings: Reading[] = [];
    for (const d of drafts) {
      const label = d.label.trim();
      const raw = d.value.trim();
      if (!label && !raw && !d.unit.trim()) continue;
      const value = Number(raw);
      if (!label || raw === "" || !Number.isFinite(value)) {
        next.readings = "Give every reading a label and a numeric value, or remove the row.";
        break;
      }
      // labels key plain-object series elsewhere: "constructor" or "__proto__" would crash every page that reads this asset's readings
      if (label in {}) {
        next.readings = `"${label}" is a reserved name. Choose a different reading label.`;
        break;
      }
      readings.push({ label, value, unit: d.unit.trim() });
    }
    const text = findings.trim();
    if (failing && !text) next.findings = "Describe what was found.";
    setErrors(next);
    if (Object.keys(next).length > 0 || !asset || !inspector) {
      requestAnimationFrame(() => summary.current?.focus());
      return;
    }

    // navigate() waits on the lazy inspection chunk, so the form stays tappable: one save per mount
    if (saving.current) return;
    saving.current = true;
    setBusy(true);

    const now = Date.now();
    let workOrderId: Id | undefined;
    let workOrderNumber: string | undefined;
    if (raising) {
      const reportedAt = manilaIso(now);
      workOrderId = newId("wo");
      workOrderNumber = nextNumber("WO-2026-");
      upsert("workOrders", {
        id: workOrderId,
        number: workOrderNumber,
        title: `${INSPECTION_TYPE_LABEL[type]} ${result === "fail" ? "failed" : "findings"}: ${asset.tag}`,
        towerId: asset.towerId,
        assetId: asset.id,
        spaceId: asset.spaceId,
        kind: "corrective",
        priority: wantPriority,
        status: "open",
        reportedById: inspector.id,
        reportedAt,
        dueAt: hoursFrom(now, PRIORITY_TARGET_HOURS[wantPriority]),
        description: `${text}\n\nRaised from the ${INSPECTION_TYPE_LABEL[type].toLowerCase()} on ${fmtDate(date)}.`,
        timeline: [{ at: reportedAt, by: inspector.name, note: "Work order raised from inspection findings.", status: "open" }],
      });
    }
    const id = newId("insp");
    upsert("inspections", {
      id, assetId: asset.id, ...(plan ? { planId: plan.id } : {}), ...(workOrderId ? { workOrderId } : {}), date, type,
      inspector: inspector.name, ...(plan?.vendorId ? { vendorId: plan.vendorId } : {}), result, readings, findings: text,
    });
    let nextDue: ISODate | undefined;
    // a visit dated before the last one is history, not a reschedule
    if (plan && date >= plan.lastDone) {
      nextDue = addFrequency(date, plan.frequency);
      upsert("pmPlans", { ...plan, lastDone: date, nextDue });
    }
    const saved: SavedState = { inspectionId: id, ...(nextDue ? { nextDue } : {}), ...(workOrderId ? { workOrderId } : {}), ...(workOrderNumber ? { workOrderNumber } : {}) };
    navigate(paths.inspection(id), { state: { saved } });
  }

  const cancelTo = plan ? paths.plan(plan.id) : asset ? paths.asset(asset.id, { tab: "maintenance" }) : paths.inspections();
  const planHint = !plan
    ? plans.length > 0 ? "Choose a plan to reschedule it when you save." : undefined
    : date >= plan.lastDone
      ? `Saving sets last done to ${fmtDate(date)} and next due to ${fmtDate(addFrequency(date, plan.frequency))}.`
      : `This date is before the last visit (${fmtDate(plan.lastDone)}), so the plan keeps its schedule.`;

  return (
    <form onSubmit={submit} noValidate className="max-w-3xl space-y-4">
      {Object.keys(errors).length > 0 && (
        <div ref={summary} tabIndex={-1} className="rounded-ctl outline-none focus-visible:ring-3 focus-visible:ring-gold/25">
          <Notice tone="danger">Some details need attention. Check the marked fields and save again.</Notice>
        </div>
      )}

      <Card title="Asset">
        {asset && !picking ? (
          <div className="flex items-start gap-3 rounded-ctl border border-line bg-surface-2 p-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-ctl bg-surface text-ink-soft">
              {equipment && <EquipmentIcon name={equipment.icon} className="size-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[12px] font-bold text-ink">{asset.tag}</p>
              <p className="text-[14px] font-bold text-ink">{equipment?.name}</p>
              <p className="type-small text-muted">{[tower?.name, floor?.label, space?.name].filter(Boolean).join(" · ")}</p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setPicking(true)}>Change</Button>
          </div>
        ) : (
          <div className="space-y-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Search by tag, equipment type or room" />
            {scope && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <p className="type-small text-muted">Searching {scope.name} only.</p>
                <Button type="button" variant="ghost" size="sm" onClick={() => setAllTowers(true)}>Search all towers</Button>
              </div>
            )}
            {q === "" && <p className="type-small text-muted">Start typing to find the asset that was inspected.</p>}
            {q !== "" && matches.length === 0 && <p className="type-small text-muted">No asset matches "{search.trim()}".</p>}
            {matches.length > 0 && (
              <ul className="space-y-1.5">
                {matches.slice(0, 8).map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => pickAsset(a.id)}
                      className="focus-ring flex min-h-12 w-full items-center gap-3 rounded-ctl border border-line bg-surface px-3 py-2 text-left transition-colors duration-150 hover:border-line-strong hover:bg-surface-2"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block font-mono text-[12px] font-bold text-ink">{a.tag}</span>
                        <span className="block truncate text-xs font-medium text-ink-soft">
                          {db.equipmentTypes[a.equipmentTypeId]?.name} · {db.towers[a.towerId]?.name} · {db.spaces[a.spaceId]?.name}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {matches.length > 8 && <p className="type-small text-muted">Showing 8 of {matches.length}. Keep typing to narrow the list.</p>}
            {asset && (
              <Button type="button" variant="ghost" size="sm" onClick={() => { setPicking(false); setSearch(""); }}>
                Keep {asset.tag}
              </Button>
            )}
          </div>
        )}
        {errors.asset && <p className="mt-1.5 text-xs font-medium text-danger">{errors.asset}</p>}
      </Card>

      <Card title="Visit">
        <div className="grid gap-4 sm:grid-cols-2">
          {plans.length > 0 && (
            <Field label="PM plan" hint={planHint} className="sm:col-span-2">
              <select value={planId} onChange={(e) => pickPlan(e.target.value)} className={selectClass}>
                <option value="">No plan (stand-alone visit)</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>{p.task} · {FREQUENCY_LABEL[p.frequency]} · due {fmtDate(p.nextDue)}</option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Type">
            <select value={type} onChange={(e) => setType(e.target.value as InspectionType)} className={selectClass}>
              {INSPECTION_TYPES.map((t) => (
                <option key={t} value={t}>{INSPECTION_TYPE_LABEL[t]}</option>
              ))}
            </select>
          </Field>
          <Field label="Date" error={errors.date}>
            <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Inspector" hint={inspector ? undefined : "Choose an asset first."} error={errors.inspector} className="sm:col-span-2">
            <select value={inspector?.id ?? ""} disabled={people.length === 0} onChange={(e) => setInspectorId(e.target.value)} className={cn(selectClass, "disabled:opacity-60")}>
              {people.length === 0 && <option value="">Choose an asset first</option>}
              {people.map((m) => (
                <option key={m.id} value={m.id}>{m.name} · {m.role}</option>
              ))}
            </select>
          </Field>
        </div>
      </Card>

      <Card
        title="Readings"
        actions={
          <Button type="button" variant="ghost" size="sm" onClick={() => addDraft()}>
            <Plus aria-hidden="true" className="size-4" strokeWidth={2} />
            Add reading
          </Button>
        }
      >
        {drafts.length === 0 && <p className="type-small text-muted">No readings yet. Add one if the visit measured anything.</p>}
        {drafts.length > 0 && (
          <ul className="space-y-3">
            {drafts.map((d) => (
              <li key={d.key} className="grid grid-cols-[1fr_1fr_auto] gap-2 rounded-ctl border border-line bg-surface-2 p-3 sm:grid-cols-[2fr_1fr_1fr_auto]">
                <Field label="Label" className="col-span-3 sm:col-span-1">
                  <input value={d.label} onChange={(e) => patchDraft(d.key, { label: e.target.value })} placeholder="Reading name" className={inputClass} />
                </Field>
                <Field label="Value">
                  <input type="number" inputMode="decimal" step="any" value={d.value} onChange={(e) => patchDraft(d.key, { value: e.target.value })} className={inputClass} />
                </Field>
                <Field label="Unit">
                  <input value={d.unit} onChange={(e) => patchDraft(d.key, { unit: e.target.value })} placeholder="Unit" className={inputClass} />
                </Field>
                <Button
                  type="button"
                  variant="ghost"
                  icon
                  aria-label={`Remove reading ${d.label}`.trim()}
                  className="self-end"
                  onClick={() => setDrafts((all) => all.filter((x) => x.key !== d.key))}
                >
                  <Trash2 aria-hidden="true" className="size-4" strokeWidth={2} />
                </Button>
              </li>
            ))}
          </ul>
        )}
        {errors.readings && <p className="mt-2 text-xs font-medium text-danger">{errors.readings}</p>}
        {known.length > 0 && (
          <div className="mt-4">
            <p className={SECTION_LABEL}>From this asset's earlier visits</p>
            <div className="flex gap-2 overflow-x-auto py-1 [scrollbar-width:none]">
              {known.map((k) => (
                <Chip key={k.label} label={k.unit ? `${k.label} (${k.unit})` : k.label} active={false} onClick={() => addDraft(k.label, k.unit)} />
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card title="Result and follow-up">
        <div className="space-y-4">
          <div>
            <p id="result-label" className={SECTION_LABEL}>Result</p>
            <div role="group" aria-labelledby="result-label" className="flex flex-wrap gap-2 py-1">
              {RESULTS.map((r) => (
                <Chip key={r} label={RESULT_LABEL[r]} active={result === r} onClick={() => setResult(r)} />
              ))}
            </div>
          </div>
          <Field label="Findings" hint={failing ? "Required when the result is not a pass." : "Optional for a pass."} error={errors.findings}>
            <textarea value={findings} onChange={(e) => setFindings(e.target.value)} rows={4} className={textareaClass} />
          </Field>

          <div>
            <label className={cn("flex min-h-10 items-center gap-3", failing ? "cursor-pointer" : "cursor-not-allowed opacity-60")}>
              <input
                type="checkbox"
                role="switch"
                className="peer sr-only"
                checked={raising}
                disabled={!failing}
                onChange={(e) => setRaise(e.target.checked)}
              />
              <span
                aria-hidden="true"
                className="relative h-6 w-11 shrink-0 rounded-full border-[1.5px] border-line-strong bg-surface-2 transition-colors duration-150 after:absolute after:left-0.5 after:top-0.5 after:size-4 after:rounded-full after:bg-ink-soft after:transition-transform after:duration-150 after:content-[''] peer-checked:border-gold peer-checked:bg-gold peer-checked:after:translate-x-5 peer-checked:after:bg-on-gold peer-focus-visible:ring-3 peer-focus-visible:ring-gold/25"
              />
              <span className="text-[14px] font-semibold text-ink">Raise work order from findings</span>
            </label>
            {!failing && <p className="mt-1 text-xs font-medium text-muted">Available when the result is not a pass.</p>}
          </div>
          {raising && (
            <Field label="Work order priority" hint={`Reported by ${inspector?.name ?? "the inspector"}, linked to ${asset?.tag ?? "the asset"}.`}>
              <select value={wantPriority} onChange={(e) => setPriority(e.target.value as WOPriority)} className={selectClass}>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{priorityLabel(p)}</option>
                ))}
              </select>
            </Field>
          )}
        </div>
      </Card>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button to={cancelTo} variant="ghost" className="w-full sm:w-auto">Cancel</Button>
        <Button type="submit" variant="primary" disabled={busy} className="w-full sm:w-auto">{busy ? "Saving…" : "Save inspection"}</Button>
      </div>
    </form>
  );
}
