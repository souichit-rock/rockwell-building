import { useId, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Button, Field, KV, Modal, inputClass } from "@/components/ui";
import { upsert, useDb } from "@/data/store";
import type { Permit } from "@/data/types";
import { addDays, daysUntil, fmtDate, todayISO } from "@/lib/dates";
import { PERMIT_LABEL, focusFirstInvalid, hasExpiry, nextRev } from "../lib";

interface Values { number: string; issued: string; expires: string }

function RenewForm({ formId, permit, onSaved }: { formId: string; permit: Permit; onSaved: (renewed: Permit) => void }) {
  const permits = useDb((db) => Object.values(db.permits));
  const cert = useDb((db) => (permit.docId ? db.documents[permit.docId] : undefined));
  const formRef = useRef<HTMLFormElement>(null);
  // the suggested expiry repeats the previous term; both dates stay editable
  const term = permit.issuedDate && permit.expiryDate ? daysUntil(permit.expiryDate, permit.issuedDate) : 365;
  const [v, setV] = useState<Values>({ number: "", issued: todayISO(), expires: addDays(todayISO(), term) });
  const [errors, setErrors] = useState<Partial<Record<keyof Values, string>>>({});

  const bind = (k: keyof Values) => ({
    value: v[k],
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setV((p) => ({ ...p, [k]: value }));
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const number = v.number.trim();
    const next: Partial<Record<keyof Values, string>> = {};
    if (!number) next.number = "Enter the new permit number.";
    else if (permits.some((p) => p.id !== permit.id && p.number.toLowerCase() === number.toLowerCase())) next.number = "Another permit already has that number.";
    if (!v.issued) next.issued = "Pick the issue date.";
    if (!v.expires) next.expires = "Pick the expiry date.";
    else if (v.issued && v.expires <= v.issued) next.expires = "Expiry must be after the issue date.";
    setErrors(next);
    if (Object.keys(next).length > 0) return focusFirstInvalid(formRef.current);

    const renewed: Permit = { ...permit, number, issuedDate: v.issued, expiryDate: v.expires };
    upsert("permits", renewed);
    // keep the certificate record in step: the renewal is its next revision
    if (cert) {
      const rev = nextRev(cert) || `R${cert.revisions.length}`;
      upsert("documents", {
        ...cert,
        revisions: [...cert.revisions, { rev, date: v.issued, issuedBy: permit.issuer, reason: `Permit renewed, number ${number}` }],
        fileName: `${cert.docNo}-${rev}.pdf`,
      });
    }
    onSaved(renewed);
  };

  return (
    <form ref={formRef} id={formId} onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-ctl bg-surface-2 px-4 py-3 sm:col-span-2">
        <KV
          items={[
            { k: "Current number", v: permit.number, mono: true },
            { k: "Issued", v: fmtDate(permit.issuedDate) },
            { k: "Expires", v: hasExpiry(permit) ? fmtDate(permit.expiryDate) : "No expiry" },
          ]}
        />
      </div>
      <Field label="New permit number" error={errors.number} className="sm:col-span-2">
        <input className={inputClass} autoComplete="off" {...bind("number")} />
      </Field>
      <Field label="Issued" error={errors.issued}>
        <input type="date" className={inputClass} {...bind("issued")} />
      </Field>
      <Field label="Expires" error={errors.expires}>
        <input type="date" className={inputClass} {...bind("expires")} />
      </Field>
    </form>
  );
}

/** Renewal replaces the permit's number and dates in place, so the renewal PM plans and the certificate keep pointing at it. */
export function RenewPermitModal({ permit, onClose, onSaved }: { permit: Permit | null; onClose: () => void; onSaved: (renewed: Permit) => void }) {
  const formId = useId();
  const tower = useDb((db) => (permit ? db.towers[permit.towerId] : undefined));
  return (
    <Modal
      open={permit !== null}
      onClose={onClose}
      title={permit ? `Renew ${PERMIT_LABEL[permit.type]} permit` : "Renew permit"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form={formId}>Renew permit</Button>
        </>
      }
    >
      {permit && (
        <>
          {tower && <p className="type-small text-muted">{tower.name}</p>}
          <RenewForm formId={formId} permit={permit} onSaved={onSaved} />
        </>
      )}
    </Modal>
  );
}
