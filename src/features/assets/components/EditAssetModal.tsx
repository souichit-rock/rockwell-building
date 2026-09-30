import { useId, useState, type FormEvent } from "react";
import { Button, Field, Modal, cn, inputClass, selectClass, textareaClass } from "@/components/ui";
import { getDb, upsert } from "@/data/store";
import type { Asset, AssetStatus, Condition } from "@/data/types";
import { CONDITIONS, STATUSES, cap, words } from "../lib";

// Modal mounts its children only while open, so this form starts from the stored row every time.
function EditForm({ asset, formId, onSaved }: { asset: Asset; formId: string; onSaved: () => void }) {
  const [status, setStatus] = useState<AssetStatus>(asset.status);
  const [condition, setCondition] = useState<Condition>(asset.condition);
  const [serial, setSerial] = useState(asset.serial);
  const [notes, setNotes] = useState(asset.notes);
  const [error, setError] = useState<string>();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = serial.trim();
    if (!trimmed) {
      setError("Serial number is required.");
      return;
    }
    // full row, taken from the newest snapshot so a change made elsewhere in the meantime is not overwritten
    upsert("assets", { ...(getDb().assets[asset.id] ?? asset), status, condition, serial: trimmed, notes: notes.trim() });
    onSaved();
  };

  return (
    <form id={formId} onSubmit={submit} className="space-y-4">
      <Field label="Status">
        <select className={selectClass} value={status} onChange={(e) => setStatus(e.target.value as AssetStatus)}>
          {STATUSES.map((s) => <option key={s} value={s}>{cap(words(s))}</option>)}
        </select>
      </Field>
      <Field label="Condition">
        <select className={selectClass} value={condition} onChange={(e) => setCondition(e.target.value as Condition)}>
          {CONDITIONS.map((c) => <option key={c} value={c}>{cap(c)}</option>)}
        </select>
      </Field>
      <Field label="Serial number" error={error}>
        <input
          className={cn(inputClass, "font-mono")} value={serial} autoComplete="off" spellCheck={false}
          onChange={(e) => {
            setSerial(e.target.value);
            setError(undefined);
          }}
        />
      </Field>
      <Field label="Notes" hint="Demo edits are stored in this browser only and clear with Reset demo data.">
        <textarea className={textareaClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
    </form>
  );
}

export function EditAssetModal({ asset, open, onClose, onSaved }: { asset: Asset; open: boolean; onClose: () => void; onSaved: () => void }) {
  const formId = useId();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Edit ${asset.tag}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form={formId}>Save changes</Button>
        </>
      }
    >
      <EditForm asset={asset} formId={formId} onSaved={onSaved} />
    </Modal>
  );
}
