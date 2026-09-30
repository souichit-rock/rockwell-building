import { useState, type FormEvent } from "react";
import { Button, Field, Modal, Notice, selectClass, textareaClass } from "@/components/ui";
import { useDb } from "@/data/store";
import type { InspectionResult, WorkOrder } from "@/data/types";
import { addFrequency, fmtDate, todayISO } from "@/lib/dates";
import { changeStatus, RESULT_LABEL, RESULTS } from "../lib";

export type DialogTarget = "done" | "cancelled";
const FORM_ID = "wo-status-form";

function StatusForm({ wo, to, onClose }: { wo: WorkOrder; to: DialogTarget; onClose: () => void }) {
  const db = useDb((d) => d);
  const [result, setResult] = useState<InspectionResult>("pass");
  const [notes, setNotes] = useState("");
  const [tried, setTried] = useState(false);

  const needsNotes = to === "done" && result !== "pass";
  const error = tried && needsNotes && !notes.trim() ? "Describe what was found." : undefined;
  const asset = wo.assetId ? db.assets[wo.assetId] : undefined;
  const logsInspection = to === "done" && !!asset && (wo.kind === "preventive" || wo.kind === "inspection");
  const plan = to === "done" && wo.planId ? db.pmPlans[wo.planId] : undefined;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (needsNotes && !notes.trim()) return;
    changeStatus(wo.id, to, { note: notes, ...(to === "done" ? { result } : {}) });
    onClose();
  };

  return (
    <form id={FORM_ID} onSubmit={submit} noValidate className="space-y-4">
      <p className="type-small text-ink-soft">
        <span className="font-mono">{wo.number}</span> · {wo.title}
      </p>
      {to === "done" ? (
        <>
          <Field label="Result">
            <select className={selectClass} value={result} onChange={(e) => setResult(e.target.value as InspectionResult)}>
              {RESULTS.map((r) => <option key={r} value={r}>{RESULT_LABEL[r]}</option>)}
            </select>
          </Field>
          <Field label={result === "pass" ? "Notes (optional)" : "Findings"} error={error}>
            <textarea className={textareaClass} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What was done, what was found." />
          </Field>
          {logsInspection && asset && <Notice tone="info">An inspection log entry will be added for {asset.tag}.</Notice>}
          {plan && (
            <Notice tone="info">
              The PM plan rolls forward: last done today, next due {fmtDate(addFrequency(todayISO(), plan.frequency))}.
            </Notice>
          )}
        </>
      ) : (
        <Field label="Reason (optional)">
          <textarea className={textareaClass} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Why is this work order being cancelled?" />
        </Field>
      )}
    </form>
  );
}

/**
 * Close-out (done) and cancel dialog, shared by the board and the detail page. `wo` and `to` are both set while it is open;
 * the form is mounted only then, so it starts fresh every time.
 */
export function StatusDialog({ wo, to, onClose }: { wo: WorkOrder | undefined; to: DialogTarget | null; onClose: () => void }) {
  const done = to === "done";
  return (
    <Modal
      open={!!wo && !!to}
      onClose={onClose}
      title={done ? "Close out work order" : "Cancel work order"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{done ? "Not yet" : "Keep open"}</Button>
          <Button type="submit" form={FORM_ID} variant={done ? "primary" : "danger"}>{done ? "Mark done" : "Cancel work order"}</Button>
        </>
      }
    >
      {wo && to && <StatusForm wo={wo} to={to} onClose={onClose} />}
    </Modal>
  );
}
