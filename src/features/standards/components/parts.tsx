import type { ReactNode } from "react";
import { Link } from "react-router";
import { Badge, cn } from "@/components/ui";
import type { ApprovalTier, Brand, ComplianceStatus, Finish, Id } from "@/data/types";
import { paths } from "@/lib/paths";
import { complianceTone, tierTone } from "@/lib/status";
import { sharePct, sentence, words, type Totals } from "../lib";

/** The finish swatch tile. The only inline colour in the feature: it is data (Finish.swatch), not a design token. */
export function Swatch({ finish, className }: { finish: Finish; className?: string }) {
  return <span aria-hidden="true" className={cn("inline-block size-6 shrink-0 rounded border border-line-strong", className)} style={{ background: finish.swatch }} />;
}

/** Approved-brand chip: a link to the brand page, coloured by tier through tierTone. The tier is also spoken, so colour is not the only cue. */
export function BrandChip({ brandId, brand, tier }: { brandId: Id; brand: Brand | undefined; tier: ApprovalTier }) {
  const name = brand?.name ?? brandId;
  return (
    <Link to={paths.brand(brandId)} title={`${name}: ${sentence(tier)}`} className="focus-ring rounded-full">
      <Badge tone={tierTone(tier)}>
        {name}
        <span className="sr-only"> ({words(tier)})</span>
      </Badge>
    </Link>
  );
}

export const TierBadge = ({ tier }: { tier: ApprovalTier | undefined }) =>
  tier ? <Badge tone={tierTone(tier)}>{words(tier)}</Badge> : <Badge tone="neutral">Unlisted</Badge>;

export const ComplianceBadge = ({ status }: { status: ComplianceStatus }) => <Badge tone={complianceTone(status)}>{words(status)}</Badge>;

/** A link that looks like a filter chip (Chip itself is a toggle button). */
export function LinkChip({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="focus-ring relative inline-flex h-8 items-center whitespace-nowrap rounded-full border-[1.5px] border-line bg-surface-2 px-3.5 text-xs font-bold text-ink-soft transition-colors duration-150 after:absolute after:-inset-[5px] after:content-[''] hover:border-line-strong hover:text-ink"
    >
      {children}
    </Link>
  );
}

/** Compliant share as an inline SVG bar plus the figures. Single series, so one ink-soft fill on a surface-2 track. */
export function AdoptionBar({ totals }: { totals: Totals }) {
  const pct = sharePct(totals);
  if (pct === null) return <span className="text-xs font-semibold text-muted">n/a</span>;
  const ok = totals.compliant + totals.waived;
  return (
    <div className="flex items-center gap-2.5 whitespace-nowrap">
      <svg viewBox="0 0 96 8" className="h-2 w-24 shrink-0" role="img" aria-label={`${pct}% compliant, ${ok} of ${totals.total} assets`}>
        <rect width="96" height="8" rx="4" className="fill-surface-2" />
        <rect width={(96 * pct) / 100} height="8" rx="4" className="fill-ink-soft" />
      </svg>
      <span className="text-xs font-bold tabular-nums text-ink">{pct}%</span>
      <span className="text-[11px] tabular-nums text-muted">{ok}/{totals.total}</span>
    </div>
  );
}
