import { Mail, Phone } from "lucide-react";
import type { ReactNode } from "react";
import { Button, Chip, Field, cn, selectClass } from "@/components/ui";
import { useDb } from "@/data/store";
import type { Contact } from "@/data/types";
import type { Filters } from "../filters";
import { mailHref, telHref } from "../lib";

/** Inline text link: reads as text until hovered, keeps a visible affordance and the shared focus ring. */
export const linkClass =
  "focus-ring rounded underline decoration-line-strong decoration-1 underline-offset-2 transition-colors duration-150 hover:decoration-ink";

/** Heading row for content that sits directly on the page (its children bring their own borders, e.g. a DataTable). */
export function Section({ title, actions, className, children }: { title: ReactNode; actions?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={cn("min-w-0", className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="type-heading text-ink">{title}</h2>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

/**
 * PageHeader keeps its actions block at max-content width (shrink-0), so four buttons would push the page wider than a phone.
 * Capping the row at the content width (viewport minus the shell's 16 px gutters) lets the buttons wrap inside it.
 */
export function HeaderActions({ children }: { children: ReactNode }) {
  return <div className="flex max-w-[calc(100vw-2rem)] flex-wrap gap-2">{children}</div>;
}

/** Tap-to-call and tap-to-email for one contact (real tel: / mailto: anchors, 40 px hit areas from Button). */
export function ContactActions({ contact, className }: { contact: Contact; className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <Button to={telHref(contact.phone)} size="sm" aria-label={`Call ${contact.name} on ${contact.phone}`}>
        <Phone aria-hidden="true" className="size-4" strokeWidth={2} />
        Call
      </Button>
      <Button to={mailHref(contact.email)} size="sm" aria-label={`Email ${contact.name} at ${contact.email}`}>
        <Mail aria-hidden="true" className="size-4" strokeWidth={2} />
        Email
      </Button>
    </div>
  );
}

/** Tower select bound to `?tower=` plus, when only the rail scope is filtering, the "Scoped to" chip that clears it. */
export function TowerFilter({ filters, className }: { filters: Filters; className?: string }) {
  const towers = useDb((db) => Object.values(db.towers).sort((a, b) => a.name.localeCompare(b.name)));
  const scoped = towers.find((t) => t.id === filters.towerId);
  return (
    <>
      <Field label="Tower" className={className}>
        <select className={selectClass} value={filters.towerId ?? ""} onChange={(e) => filters.setTower(e.target.value)}>
          <option value="">All towers</option>
          {towers.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </Field>
      {filters.scopeOnly && scoped && <Chip label={`Scoped to ${scoped.name} ×`} active onClick={filters.clearScope} className="mb-1" />}
    </>
  );
}
