import { BookX, ChevronRight, CircleCheck, FileX2, History, type LucideIcon } from "lucide-react";
import { Link } from "react-router";
import { Card, EmptyState } from "@/components/ui";
import type { RecordGapKind } from "@/data/types";
import type { GapSection } from "../lib";

const KIND: Record<RecordGapKind, { icon: LucideIcon; heading: string }> = {
  "missing-asbuilt": { icon: FileX2, heading: "Floors missing a current as-built" },
  "no-om": { icon: BookX, heading: "Assets without an O&M reference" },
  "stale-sheet": { icon: History, heading: "Assets on a superseded sheet only" },
};

/** "Record gaps": the selector's rows per kind and tower, each a link to the register that lists the offenders. */
export function GapsCard({ sections }: { sections: GapSection[] }) {
  return (
    <Card title="Record gaps">
      {sections.length === 0 ? (
        <EmptyState icon={CircleCheck} title="No record gaps" body="Every floor has a current as-built and every critical asset an O&M manual." />
      ) : (
        <div className="space-y-4">
          {sections.map(({ kind, rows }) => {
            const { icon: Icon, heading } = KIND[kind];
            return (
              <section key={kind} aria-label={heading}>
                <h3 className="type-eyebrow mb-1 flex items-center gap-2 px-2">
                  <Icon aria-hidden="true" className="size-3.5" />
                  {heading}
                </h3>
                <ul>
                  {rows.map(({ gap, tower, missing }) => (
                    <li key={`${gap.kind}-${gap.towerId}`}>
                      <Link
                        to={gap.href}
                        className="focus-ring group flex min-h-11 items-start gap-3 rounded-ctl px-2 py-2 transition-colors duration-150 hover:bg-surface-2"
                      >
                        <span className="grid size-9 shrink-0 place-items-center rounded-ctl bg-surface-2 font-mono text-[11px] font-bold text-ink-soft">
                          {tower.code}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[14px] font-bold text-ink">{tower.name}</span>
                          <span className="block text-xs text-ink-soft">{gap.title}</span>
                          {missing.map((line) => (
                            <span key={line} className="block text-xs text-muted">{line}</span>
                          ))}
                        </span>
                        <ChevronRight aria-hidden="true" className="mt-2.5 size-4 shrink-0 text-muted transition-colors duration-150 group-hover:text-ink" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </Card>
  );
}
