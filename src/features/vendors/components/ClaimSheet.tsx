import type { ReactNode } from "react";
import { Badge, KV } from "@/components/ui";
import { fmtDate, todayISO } from "@/lib/dates";
import { plural } from "@/lib/format";
import { priorityTone, warrantyTone, woStatusTone } from "@/lib/status";
import { BAND_LABEL, CLAIM_SHEET_MAX_WOS, sentence, signedDays, words, type ClaimData } from "../lib";

const TH = "pb-1.5 pr-3 text-[10px] font-extrabold uppercase tracking-[.11em] text-muted";
const TD = "border-t border-line py-1.5 pr-3 align-top print:py-1";

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="break-inside-avoid pt-5 print:pt-3">
      <h3 className="type-eyebrow mb-2.5 print:mb-1.5">{title}</h3>
      {children}
    </section>
  );
}

/**
 * The printable claim sheet: asset identity, warranty terms, vendor contact, certificate reference and the asset's work order history.
 * Compact by construction (two-column facts, at most CLAIM_SHEET_MAX_WOS orders) so it stays on one A4 page.
 */
export function ClaimSheet({ data }: { data: ClaimData }) {
  const { row, where, orders } = data;
  const { warranty, asset, vendor, doc, brand, model, band, days, typeName } = row;
  const shown = orders.slice(0, CLAIM_SHEET_MAX_WOS);
  const rev = doc?.revisions[doc.revisions.length - 1];
  const contract = vendor?.contract;

  return (
    <article
      aria-label={`Warranty claim sheet for ${asset.tag}`}
      className="mx-auto w-full max-w-[820px] rounded-card border border-line bg-surface p-4 text-[13px] text-ink sm:p-6 print:max-w-none print:rounded-none print:border-0 print:p-0 print:text-[11px] print:leading-snug"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-ink pb-3">
        <div className="min-w-0">
          <p className="type-eyebrow">Rockwell Building · Warranty claim sheet</p>
          <h2 className="type-title mt-1.5 text-ink">{typeName}</h2>
          <p className="mt-1 font-mono text-[13px] text-ink-soft print:text-[12px]">{asset.tag}</p>
        </div>
        <div className="text-right">
          <Badge tone={warrantyTone(band)} dot>{BAND_LABEL[band]}</Badge>
          <p className="mt-1.5 text-xs text-muted">Prepared {fmtDate(todayISO())}</p>
        </div>
      </header>

      <Block title="Asset identity">
        <div className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
          <KV
            items={[
              { k: "Tag", v: asset.tag, mono: true },
              { k: "Type", v: typeName },
              { k: "Brand", v: brand?.name ?? "—" },
              { k: "Model", v: model?.modelNo ?? "—", mono: true },
            ]}
          />
          <KV
            items={[
              { k: "Serial", v: asset.serial, mono: true },
              { k: "Rating", v: asset.rating || "—" },
              { k: "Location", v: where || "—" },
              { k: "Installed", v: `${fmtDate(asset.installDate)} · commissioned ${fmtDate(asset.commissionDate)}` },
            ]}
          />
        </div>
      </Block>

      <Block title="Warranty terms">
        <div className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
          <KV
            items={[
              { k: "Warranty", v: warranty.id, mono: true },
              { k: "Starts", v: fmtDate(warranty.start) },
              { k: "Ends", v: `${fmtDate(warranty.end)} · ${signedDays(days)} days` },
              { k: "Coverage", v: warranty.coverage },
            ]}
          />
          <KV
            items={
              doc
                ? [
                    { k: "Certificate", v: doc.docNo, mono: true },
                    { k: "Title", v: doc.title },
                    { k: "Revision", v: rev ? `${rev.rev} · ${fmtDate(rev.date)}` : "—" },
                    { k: "Issued by", v: rev?.issuedBy ?? "—" },
                  ]
                : [{ k: "Certificate", v: "No certificate on file" }]
            }
          />
        </div>
      </Block>

      <Block title="Vendor contact">
        {vendor ? (
          <>
            <p className="font-bold text-ink">
              {vendor.name} <span className="font-medium text-muted">· {sentence(vendor.kind)}</span>
            </p>
            {contract && (
              <p className="mt-0.5 text-xs text-ink-soft">
                Contract <span className="font-mono">{contract.ref}</span> · response within {contract.slaResponseHours} h
              </p>
            )}
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left">
                <thead>
                  <tr>
                    <th scope="col" className={TH}>Name</th>
                    <th scope="col" className={TH}>Role</th>
                    <th scope="col" className={TH}>Phone</th>
                    <th scope="col" className={TH}>Email</th>
                  </tr>
                </thead>
                <tbody>
                  {vendor.contacts.map((c) => (
                    <tr key={c.email}>
                      <td className={`${TD} font-semibold`}>{c.name}</td>
                      <td className={TD}>{c.role}</td>
                      <td className={`${TD} whitespace-nowrap`}>{c.phone}</td>
                      <td className={TD}>{c.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-muted">No vendor on record for this warranty.</p>
        )}
      </Block>

      <Block title="Work order history">
        {shown.length === 0 ? (
          <p className="text-muted">No work orders are recorded against this asset.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left">
              <thead>
                <tr>
                  <th scope="col" className={TH}>Number</th>
                  <th scope="col" className={TH}>Reported</th>
                  <th scope="col" className={TH}>Priority</th>
                  <th scope="col" className={TH}>Status</th>
                  <th scope="col" className={TH}>Title</th>
                  <th scope="col" className={TH}>In cover</th>
                </tr>
              </thead>
              <tbody>
                {shown.map(({ wo, inCover }) => (
                  <tr key={wo.id}>
                    <td className={`${TD} whitespace-nowrap font-mono text-[12px] print:text-[10.5px]`}>{wo.number}</td>
                    <td className={`${TD} whitespace-nowrap`}>{fmtDate(wo.reportedAt)}</td>
                    <td className={TD}><Badge tone={priorityTone(wo.priority)}>{wo.priority}</Badge></td>
                    <td className={TD}><Badge tone={woStatusTone(wo.status)}>{words(wo.status)}</Badge></td>
                    <td className={TD}>{wo.title}</td>
                    <td className={`${TD} font-semibold`}>{inCover ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {orders.length > shown.length && (
          <p className="mt-1.5 text-xs text-muted">
            Latest {shown.length} of {plural(orders.length, "work order")} shown; the rest are in the work order register.
          </p>
        )}
      </Block>

      <Block title="Claim details (to complete)">
        <p className="text-xs text-muted">Describe the fault and when it was first seen.</p>
        <div aria-hidden="true" className="mt-1">
          <div className="h-7 border-b border-muted print:h-6" />
          <div className="h-7 border-b border-muted print:h-6" />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-6 text-[10px] font-extrabold uppercase tracking-[.11em] text-muted">
          {["Reported by", "Date", "Signature"].map((label) => (
            <div key={label}>
              <div aria-hidden="true" className="h-8 border-b border-muted print:h-6" />
              <span className="mt-1 block">{label}</span>
            </div>
          ))}
        </div>
      </Block>

      <p className="mt-5 border-t border-line pt-2 text-center text-[10px] text-muted print:mt-3">
        Sample data for demonstration · Rockwell Building · not a submitted claim
      </p>
    </article>
  );
}
