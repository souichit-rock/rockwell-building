import { useId, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Button, Field, Modal, inputClass, selectClass, textareaClass } from "@/components/ui";
import { newId, upsert, useDb } from "@/data/store";
import type { Document, Id } from "@/data/types";
import { todayISO } from "@/lib/dates";
import { DISCIPLINE_CODES, DOC_TYPES, DOC_TYPE_LABEL, cmp, focusFirstInvalid, isISODate, latestRev, nextRev, relationFor } from "../lib";

type Change = ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;

// --- Add document ---------------------------------------------------------------------------------------------------------------

interface DocValues {
  docNo: string; title: string; type: string; disciplineId: string; towerId: string; floorId: string;
  rev: string; issuedBy: string; date: string; assetTag: string;
}

function AddDocumentForm({ formId, defaultTowerId, onSaved }: { formId: string; defaultTowerId: Id; onSaved: (doc: Document) => void }) {
  const db = useDb((d) => d);
  const listId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [v, setV] = useState<DocValues>({
    docNo: "", title: "", type: "as-built", disciplineId: "ELEC", towerId: defaultTowerId, floorId: "", rev: "R0", issuedBy: "", date: todayISO(), assetTag: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof DocValues, string>>>({});

  const assetFor = (raw: string) => {
    const tag = raw.trim().toLowerCase();
    return tag ? Object.values(db.assets).find((a) => a.tag.toLowerCase() === tag) : undefined;
  };
  // a sheet only governs an asset of its own discipline (governingSheet, asBuiltCoverage), so the discipline follows the linked asset
  const disciplineOf = (asset: { equipmentTypeId: Id } | undefined) => (asset ? db.equipmentTypes[asset.equipmentTypeId]?.disciplineId : undefined);

  const bind = (k: keyof DocValues) => ({
    value: v[k],
    onChange: (e: Change) => {
      const value = e.target.value;
      const discipline = k === "assetTag" ? disciplineOf(assetFor(value)) : undefined;
      setV((p) => ({ ...p, [k]: value, ...(k === "towerId" ? { floorId: "" } : {}), ...(discipline ? { disciplineId: discipline } : {}) }));
    },
  });

  const floors = Object.values(db.floors).filter((f) => f.towerId === v.towerId).sort((a, b) => b.level - a.level);
  const tags = Object.values(db.assets).filter((a) => !v.towerId || a.towerId === v.towerId).sort((a, b) => cmp(a.tag, b.tag));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const docNo = v.docNo.trim();
    const rev = v.rev.trim();
    const tag = v.assetTag.trim();
    const asset = assetFor(tag);
    const assetDiscipline = disciplineOf(asset);
    const next: Partial<Record<keyof DocValues, string>> = {};
    if (!docNo) next.docNo = "Enter the document number.";
    else if (Object.values(db.documents).some((d) => d.docNo.toLowerCase() === docNo.toLowerCase())) next.docNo = "That number is already on the register.";
    if (!v.title.trim()) next.title = "Enter a title.";
    if (!rev) next.rev = "Enter the revision.";
    if (!v.issuedBy.trim()) next.issuedBy = "Enter who issued it.";
    if (!isISODate(v.date)) next.date = "Pick a valid revision date.";
    if (tag && !asset) next.assetTag = "No asset has that tag.";
    else if (asset && v.towerId && asset.towerId !== v.towerId) next.assetTag = `${asset.tag} is in a different tower.`;
    else if (asset && assetDiscipline && assetDiscipline !== v.disciplineId) {
      next.assetTag = `${asset.tag} is a ${db.disciplines[assetDiscipline]?.name ?? assetDiscipline} asset. Set Discipline to match.`;
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return focusFirstInvalid(formRef.current);

    const type = DOC_TYPES.find((t) => t === v.type) ?? "as-built";
    const disciplineId = DISCIPLINE_CODES.find((c) => c === v.disciplineId) ?? "ELEC";
    const towerId = v.towerId || asset?.towerId || "";
    const row: Document = {
      id: newId("doc"), docNo, title: v.title.trim(), type, disciplineId,
      ...(towerId ? { towerId } : {}), ...(v.floorId ? { floorId: v.floorId } : {}),
      revisions: [{ rev, date: v.date, issuedBy: v.issuedBy.trim(), reason: "Added to the register" }],
      status: "current", links: asset ? [{ kind: "asset", id: asset.id, relation: relationFor(type) }] : [],
      fileName: `${docNo}-${rev}.pdf`, fileSizeKb: 0, pages: 0,
    };
    upsert("documents", row);
    onSaved(row);
  };

  return (
    <form ref={formRef} id={formId} onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
      <Field label="Document no" error={errors.docNo}>
        <input className={inputClass} autoComplete="off" maxLength={24} placeholder="EDS-E-AB-01" {...bind("docNo")} />
      </Field>
      <Field label="Revision" error={errors.rev}>
        <input className={inputClass} autoComplete="off" {...bind("rev")} />
      </Field>
      <Field label="Title" error={errors.title} className="sm:col-span-2">
        <input className={inputClass} autoComplete="off" {...bind("title")} />
      </Field>
      <Field label="Type">
        <select className={selectClass} {...bind("type")}>
          {DOC_TYPES.map((t) => (
            <option key={t} value={t}>{DOC_TYPE_LABEL[t]}</option>
          ))}
        </select>
      </Field>
      <Field label="Discipline">
        <select className={selectClass} {...bind("disciplineId")}>
          {DISCIPLINE_CODES.map((c) => (
            <option key={c} value={c}>{db.disciplines[c]?.name ?? c}</option>
          ))}
        </select>
      </Field>
      <Field label="Tower">
        <select className={selectClass} {...bind("towerId")}>
          <option value="">Portfolio (no tower)</option>
          {Object.values(db.towers).map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Floor">
        <select className={`${selectClass} disabled:opacity-50`} disabled={!v.towerId} {...bind("floorId")}>
          <option value="">{v.towerId ? "Whole tower" : "Choose a tower first"}</option>
          {floors.map((f) => (
            <option key={f.id} value={f.id}>{f.label}</option>
          ))}
        </select>
      </Field>
      <Field label="Issued by" error={errors.issuedBy}>
        <input className={inputClass} autoComplete="off" {...bind("issuedBy")} />
      </Field>
      <Field label="Revision date" error={errors.date}>
        <input type="date" className={inputClass} {...bind("date")} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Linked asset (tag)" hint="Optional. Links the document to one asset and takes that asset's discipline; more links can follow." error={errors.assetTag}>
          <input className={inputClass} autoComplete="off" list={listId} placeholder="EDS-B3-FP-01" {...bind("assetTag")} />
        </Field>
        <datalist id={listId}>
          {tags.map((a) => (
            <option key={a.id} value={a.tag} />
          ))}
        </datalist>
      </div>
    </form>
  );
}

/** `defaultTowerId` preselects the tower the list is filtered to, so a new document does not vanish from the list it was added from. */
export function AddDocumentModal({ open, defaultTowerId = "", onClose, onSaved }: {
  open: boolean;
  defaultTowerId?: Id;
  onClose: () => void;
  onSaved: (doc: Document) => void;
}) {
  const formId = useId();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add document"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form={formId}>Add document</Button>
        </>
      }
    >
      <AddDocumentForm formId={formId} defaultTowerId={defaultTowerId} onSaved={onSaved} />
    </Modal>
  );
}

// --- Add revision ---------------------------------------------------------------------------------------------------------------

interface RevValues { rev: string; date: string; issuedBy: string; reason: string }

function AddRevisionForm({ formId, doc, onSaved }: { formId: string; doc: Document; onSaved: (rev: string) => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [v, setV] = useState<RevValues>({ rev: nextRev(doc), date: todayISO(), issuedBy: latestRev(doc)?.issuedBy ?? "", reason: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof RevValues, string>>>({});

  const bind = (k: keyof RevValues) => ({
    value: v[k],
    onChange: (e: Change) => {
      const value = e.target.value;
      setV((p) => ({ ...p, [k]: value }));
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const rev = v.rev.trim();
    const next: Partial<Record<keyof RevValues, string>> = {};
    if (!rev) next.rev = "Enter the revision.";
    else if (doc.revisions.some((r) => r.rev.toLowerCase() === rev.toLowerCase())) next.rev = `${rev} is already in the history.`;
    if (!isISODate(v.date)) next.date = "Pick a valid issue date.";
    if (!v.issuedBy.trim()) next.issuedBy = "Enter who issued it.";
    if (!v.reason.trim()) next.reason = "Say what changed.";
    setErrors(next);
    if (Object.keys(next).length > 0) return focusFirstInvalid(formRef.current);

    // the file name follows the newest revision (docNo-rev.pdf, as in the seed); a back-dated entry leaves it alone
    const latest = latestRev(doc);
    upsert("documents", {
      ...doc,
      revisions: [...doc.revisions, { rev, date: v.date, issuedBy: v.issuedBy.trim(), reason: v.reason.trim() }],
      fileName: !latest || v.date >= latest.date ? `${doc.docNo}-${rev}.pdf` : doc.fileName,
    });
    onSaved(rev);
  };

  return (
    <form ref={formRef} id={formId} onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
      <Field label="Revision" error={errors.rev}>
        <input className={inputClass} autoComplete="off" {...bind("rev")} />
      </Field>
      <Field label="Issue date" error={errors.date}>
        <input type="date" className={inputClass} {...bind("date")} />
      </Field>
      <Field label="Issued by" error={errors.issuedBy} className="sm:col-span-2">
        <input className={inputClass} autoComplete="off" {...bind("issuedBy")} />
      </Field>
      <Field label="Reason for revision" error={errors.reason} className="sm:col-span-2">
        <textarea className={textareaClass} {...bind("reason")} />
      </Field>
    </form>
  );
}

export function AddRevisionModal({ doc, open, onClose, onSaved }: { doc: Document; open: boolean; onClose: () => void; onSaved: (rev: string) => void }) {
  const formId = useId();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Add revision to ${doc.docNo}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form={formId}>Add revision</Button>
        </>
      }
    >
      <AddRevisionForm formId={formId} doc={doc} onSaved={onSaved} />
    </Modal>
  );
}
