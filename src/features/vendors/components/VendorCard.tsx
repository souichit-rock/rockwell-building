import type { ReactNode } from "react";
import { Link } from "react-router";
import { Badge, Monogram } from "@/components/ui";
import { permitStatus } from "@/data/selectors";
import { fmtDate } from "@/lib/dates";
import { fmtNumber } from "@/lib/format";
import { paths } from "@/lib/paths";
import { permitTone } from "@/lib/status";
import { CONTRACT_ENDING_DAYS, expiryState, relDays, words, type VendorRow } from "../lib";
import { ContactActions } from "./bits";

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10.5px] font-extrabold uppercase tracking-[.11em] text-muted">{label}</dt>
      <dd className="m-0 mt-0.5 text-[14px] font-bold tabular-nums text-ink">{children}</dd>
    </div>
  );
}

/** Directory card. The name is a stretched link over the whole card; the contact buttons sit above it. */
export function VendorCard({ row }: { row: VendorRow }) {
  const { vendor, disciplines, primary, served, openWos, contractDays, accreditationDays } = row;
  const contract = vendor.contract;
  const accreditation = vendor.accreditationExpiry ? permitStatus(vendor.accreditationExpiry) : "valid";
  const ending = contractDays === undefined ? "valid" : expiryState(contractDays, CONTRACT_ENDING_DAYS);

  return (
    <article className="relative flex h-full flex-col gap-4 rounded-card border border-line bg-surface p-5 transition-colors duration-150 hover:border-line-strong">
      <div className="flex items-start gap-3">
        <Monogram name={vendor.name} />
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-bold leading-snug text-ink">
            <Link to={paths.vendor(vendor.id)} className="focus-ring rounded after:absolute after:inset-0 after:rounded-card after:content-['']">
              {vendor.name}
            </Link>
          </h2>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Badge>{words(vendor.kind)}</Badge>
            {accreditation !== "valid" && accreditationDays !== undefined && (
              <Badge tone={permitTone(accreditation)} dot>
                {accreditationDays < 0 ? "Accreditation expired" : `Accreditation ends in ${accreditationDays} d`}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {disciplines.map((d) => (
          <Badge key={d.id}>{d.name}</Badge>
        ))}
      </div>

      {primary && (
        <div>
          <p className="type-eyebrow mb-1.5">Primary contact</p>
          <p className="text-[14px] font-bold text-ink">{primary.name}</p>
          <p className="type-small text-muted">{primary.role}</p>
          <ContactActions contact={primary} className="relative z-10 mt-2.5" />
        </div>
      )}

      <dl className="mt-auto grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-4">
        <Stat label="Contract ends">
          {contract && contractDays !== undefined ? (
            <>
              {fmtDate(contract.end)}
              <span className="mt-1 block">
                {ending === "valid" ? (
                  <span className="text-xs font-medium text-muted">{relDays(contractDays)}</span>
                ) : (
                  <Badge tone={permitTone(ending)}>{contractDays < 0 ? "Expired" : `${contractDays} d left`}</Badge>
                )}
              </span>
            </>
          ) : (
            <span className="font-medium text-muted">No contract</span>
          )}
        </Stat>
        <Stat label="SLA response">{contract ? `${fmtNumber(contract.slaResponseHours)} h` : <span className="font-medium text-muted">{"—"}</span>}</Stat>
        <Stat label="Assets served">{fmtNumber(served.length)}</Stat>
        <Stat label="Open work orders">{fmtNumber(openWos)}</Stat>
      </dl>
    </article>
  );
}
