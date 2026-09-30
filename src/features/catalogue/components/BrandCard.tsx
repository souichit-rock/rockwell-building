import { Link } from "react-router";
import { Badge, Monogram } from "@/components/ui";
import type { Id } from "@/data/types";
import { plural } from "@/lib/format";
import { paths } from "@/lib/paths";
import type { BrandRow } from "../lib";
import { TierBadge } from "./TierBadge";

/** One card per brand. The title link is stretched over the card; the installed count is its own link above it (never a link inside a link). */
export function BrandCard({ row, towerId }: { row: BrandRow; towerId: Id | null }) {
  const { brand, disciplineNames, installed, models, best } = row;
  return (
    <article className="relative flex min-w-0 flex-col gap-3 rounded-card border border-line bg-surface p-4 transition-colors duration-150 focus-within:border-ink-soft hover:border-line-strong">
      <div className="flex items-start gap-3">
        <Monogram name={brand.name} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[14px] font-bold text-ink">
            <Link to={paths.brand(brand.id)} className="focus-ring rounded after:absolute after:inset-0 after:rounded-card after:content-['']">
              {brand.name}
            </Link>
          </h3>
          <p className="text-xs text-ink-soft">{brand.country}</p>
        </div>
        <TierBadge tier={best} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {disciplineNames.map((name) => (
          <Badge key={name} tone="neutral">{name}</Badge>
        ))}
      </div>
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-3 text-xs text-ink-soft">
        <span>{plural(models, "model")}</span>
        {installed > 0 ? (
          <Link
            to={paths.assets({ brand: brand.id, tower: towerId ?? undefined })}
            className="focus-ring relative z-10 -my-2 rounded py-2 font-bold text-ink hover:underline"
          >
            {plural(installed, "asset")} installed
          </Link>
        ) : (
          <span className="text-muted">None installed</span>
        )}
      </div>
    </article>
  );
}
