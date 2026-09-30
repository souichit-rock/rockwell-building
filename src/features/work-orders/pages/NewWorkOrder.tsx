import { useRef, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useTowerScope } from "@/app/useTowerScope";
import { Breadcrumb, Button, Card, Field, inputClass, PageHeader, selectClass, textareaClass } from "@/components/ui";
import { assetsIn } from "@/data/selectors";
import { nextNumber, newId, upsert, useDb } from "@/data/store";
import type { Db, Id, WOEvent, WOKind, WOPriority, WorkOrder } from "@/data/types";
import { paths } from "@/lib/paths";
import {
  assetLabel, byName, defaultEngineer, dueFor, fromLocalInput, KIND_LABEL, KINDS, lookup, manilaIso, PRIORITIES, priorityLabel, targetText,
} from "../lib";

interface FormState {
  towerId: Id; floorId: Id; spaceId: Id; assetId: Id; planId: Id;
  kind: WOKind; priority: WOPriority; title: string; description: string;
  assigneeId: Id; vendorId: Id; due: string; reporterId: Id;
}

/** Prefill from the query string (assetId wins over spaceId, which wins over towerId); the tower scope only fills a missing tower. */
function initialState(db: Db, sp: URLSearchParams, scope: Id | null): FormState {
  const asset = lookup(db.assets, sp.get("assetId"));
  const space = asset ? db.spaces[asset.spaceId] : lookup(db.spaces, sp.get("spaceId"));
  const queryTower = lookup(db.towers, sp.get("towerId"))?.id;
  return {
    towerId: asset?.towerId ?? space?.towerId ?? queryTower ?? scope ?? "",
    floorId: asset?.floorId ?? space?.floorId ?? "",
    spaceId: space?.id ?? "",
    assetId: asset?.id ?? "",
    planId: "",
    kind: "corrective",
    priority: "P3",
    title: sp.get("title") ?? "",
    description: "",
    assigneeId: "",
    vendorId: "",
    due: dueFor("P3"),
    reporterId: "",
  };
}

function Form() {
  const db = useDb((d) => d);
  const [sp] = useSearchParams();
  const { towerId: scope } = useTowerScope();
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);
  const [f, setF] = useState<FormState>(() => initialState(db, sp, scope));
  const [submitted, setSubmitted] = useState(false);
  const patch = (next: Partial<FormState>) => setF((prev) => ({ ...prev, ...next }));

  // cascading pickers: a change resets whatever below it no longer fits
  const pickTower = (towerId: Id) => patch({ towerId, floorId: "", spaceId: "", assetId: "", planId: "", assigneeId: "", reporterId: "" });
  const pickFloor = (floorId: Id) => {
    const a = db.assets[f.assetId];
    patch({ floorId, spaceId: "", ...(a && a.floorId === floorId ? {} : { assetId: "", planId: "" }) });
  };
  const pickSpace = (spaceId: Id) => {
    const a = db.assets[f.assetId];
    patch({ spaceId, ...(a && (!spaceId || a.spaceId === spaceId) ? {} : { assetId: "", planId: "" }) });
  };
  const pickAsset = (assetId: Id) => {
    const a = db.assets[assetId];
    patch(a ? { assetId, floorId: a.floorId, spaceId: a.spaceId, planId: "" } : { assetId: "", planId: "" });
  };
  const pickPriority = (priority: WOPriority) => patch({ priority, due: dueFor(priority) });

  const floors = Object.values(db.floors).filter((x) => x.towerId === f.towerId).sort((a, b) => b.level - a.level);
  const spaces = Object.values(db.spaces).filter((s) => s.floorId === f.floorId).sort((a, b) => a.code.localeCompare(b.code));
  const assets = f.towerId
    ? assetsIn(db, { towerId: f.towerId, ...(f.floorId ? { floorId: f.floorId } : {}), ...(f.spaceId ? { spaceId: f.spaceId } : {}) }).sort((a, b) =>
        a.tag.localeCompare(b.tag),
      )
    : [];
  const asset = db.assets[f.assetId];
  const plans = f.assetId ? Object.values(db.pmPlans).filter((p) => p.assetId === f.assetId) : [];
  const showPlan = (f.kind === "preventive" || f.kind === "inspection") && plans.length > 0;
  const people = Object.values(db.teamMembers).filter((m) => !f.towerId || m.towerIds.includes(f.towerId)).sort(byName);
  const vendors = Object.values(db.vendors).sort(byName);
  const allPeople = Object.values(db.teamMembers).sort(byName);
  const serviceVendor = asset?.serviceVendorId ? db.vendors[asset.serviceVendorId] : undefined;

  const reporterId = f.reporterId || (f.towerId ? defaultEngineer(db, f.towerId)?.id : undefined) || "";
  const reporter = db.teamMembers[reporterId];
  const dueAt = fromLocalInput(f.due);

  const errors: Partial<Record<"tower" | "title" | "asset" | "due" | "reporter", string>> = {};
  if (!f.towerId) errors.tower = "Choose a tower.";
  if (!f.title.trim()) errors.title = "Give the work order a title.";
  if ((f.kind === "preventive" || f.kind === "inspection") && !f.assetId) errors.asset = "Choose the asset this work is for.";
  if (!dueAt) errors.due = "Enter a valid due date and time.";
  if (!reporter) errors.reporter = "Choose who is reporting this.";
  const shown = (key: keyof typeof errors) => (submitted ? errors[key] : undefined);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length > 0 || !dueAt || !reporter) {
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());
      return;
    }
    const now = Date.now();
    const at = manilaIso(now);
    const assignee = f.assigneeId ? db.teamMembers[f.assigneeId] : undefined;
    const vendor = f.vendorId ? db.vendors[f.vendorId] : undefined;
    const assigned = Boolean(assignee || vendor);
    const timeline: WOEvent[] = [{ at, by: reporter.name, note: "Work order raised.", status: "open" }];
    if (assigned) {
      timeline.push({ at, by: reporter.name, note: `Assigned to ${[assignee?.name, vendor?.name].filter(Boolean).join(" and ")}.`, status: "assigned" });
    }
    const id = newId("wo");
    const wo: WorkOrder = {
      id,
      number: nextNumber("WO-2026-"),
      title: f.title.trim(),
      towerId: f.towerId,
      ...(f.assetId ? { assetId: f.assetId } : {}),
      ...(f.spaceId ? { spaceId: f.spaceId } : {}),
      kind: f.kind,
      priority: f.priority,
      status: assigned ? "assigned" : "open",
      reportedById: reporter.id,
      reportedAt: at,
      ...(assignee ? { assignedToId: assignee.id } : {}),
      ...(vendor ? { vendorId: vendor.id } : {}),
      ...(showPlan && f.planId ? { planId: f.planId } : {}),
      dueAt,
      description: f.description.trim(),
      timeline,
    };
    upsert("workOrders", wo);
    navigate(paths.workOrder(id), { state: { created: true } });
  };

  return (
    <div>
      <Breadcrumb items={[{ to: paths.workOrders(), label: "Work orders" }, { label: "New" }]} />
      <PageHeader eyebrow="Facilities" title="New work order" lede="Raise a job against an asset or a room. It lands on the board straight away." />
      <form ref={formRef} onSubmit={submit} noValidate className="max-w-3xl space-y-4">
        <Card title="Where">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tower" error={shown("tower")}>
              <select className={selectClass} value={f.towerId} onChange={(e) => pickTower(e.target.value)}>
                <option value="">Choose a tower</option>
                {Object.values(db.towers).sort(byName).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </Field>
            <Field label="Floor" hint="Narrows the space and asset lists.">
              <select className={selectClass} value={f.floorId} disabled={!f.towerId} onChange={(e) => pickFloor(e.target.value)}>
                <option value="">{f.towerId ? "Any floor" : "Choose a tower first"}</option>
                {floors.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
              </select>
            </Field>
            <Field label="Space">
              <select className={selectClass} value={f.spaceId} disabled={!f.floorId} onChange={(e) => pickSpace(e.target.value)}>
                <option value="">{f.floorId ? "Any space" : "Choose a floor first"}</option>
                {spaces.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Asset" error={shown("asset")}>
              <select className={selectClass} value={f.assetId} disabled={!f.towerId} onChange={(e) => pickAsset(e.target.value)}>
                <option value="">{f.towerId ? "No specific asset" : "Choose a tower first"}</option>
                {assets.map((a) => <option key={a.id} value={a.id}>{assetLabel(db, a.id)}</option>)}
              </select>
            </Field>
          </div>
        </Card>

        <Card title="What">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Kind">
              <select className={selectClass} value={f.kind} onChange={(e) => patch({ kind: e.target.value as WOKind, planId: "" })}>
                {KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
              </select>
            </Field>
            <Field label="Priority" hint={`Response target ${targetText(f.priority)}. Changing it resets the due time.`}>
              <select className={selectClass} value={f.priority} onChange={(e) => pickPriority(e.target.value as WOPriority)}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{priorityLabel(p)}</option>)}
              </select>
            </Field>
            <Field label="Title" error={shown("title")} className="sm:col-span-2">
              <input className={inputClass} value={f.title} onChange={(e) => patch({ title: e.target.value })} placeholder="What needs doing" />
            </Field>
            <Field label="Description" className="sm:col-span-2">
              <textarea
                className={textareaClass}
                value={f.description}
                onChange={(e) => patch({ description: e.target.value })}
                placeholder="What was seen or reported, and anything the assignee should know."
              />
            </Field>
            {showPlan && (
              <Field label="PM plan" hint="Linking a plan lets close-out roll its next due date." className="sm:col-span-2">
                <select className={selectClass} value={f.planId} onChange={(e) => patch({ planId: e.target.value })}>
                  <option value="">No PM plan</option>
                  {plans.map((p) => <option key={p.id} value={p.id}>{p.task} ({p.frequency.replace(/-/g, " ")})</option>)}
                </select>
              </Field>
            )}
          </div>
        </Card>

        <Card title="Who and when">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Assign to">
              <select className={selectClass} value={f.assigneeId} onChange={(e) => patch({ assigneeId: e.target.value })}>
                <option value="">Unassigned</option>
                {people.map((m) => <option key={m.id} value={m.id}>{m.name} · {m.role}</option>)}
              </select>
            </Field>
            <Field label="Vendor" hint={serviceVendor ? `Service vendor for this asset: ${serviceVendor.name}.` : undefined}>
              <select className={selectClass} value={f.vendorId} onChange={(e) => patch({ vendorId: e.target.value })}>
                <option value="">No vendor</option>
                {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </Field>
            <Field label="Due" error={shown("due")}>
              <input type="datetime-local" className={inputClass} value={f.due} onChange={(e) => patch({ due: e.target.value })} />
            </Field>
            <Field label="Reported by" error={shown("reporter")}>
              <select className={selectClass} value={reporterId} onChange={(e) => patch({ reporterId: e.target.value })}>
                {!reporterId && <option value="">Choose a reporter</option>}
                {allPeople.map((m) => <option key={m.id} value={m.id}>{m.name} · {m.role}</option>)}
              </select>
            </Field>
          </div>
        </Card>

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" to={paths.workOrders()}>Cancel</Button>
          <Button type="submit" variant="primary">Raise work order</Button>
        </div>
      </form>
    </div>
  );
}

/** /work-orders/new. Keyed by the query string so a new prefill (for example from the palette) starts a fresh form. */
export default function NewWorkOrder() {
  const [sp] = useSearchParams();
  return <Form key={sp.toString()} />;
}
