import { ChevronRight } from "lucide-react";
import { Link } from "react-router";
import { Card } from "@/components/ui";
import { plural } from "@/lib/format";
import type { TourStep } from "../lib";

/** "Ten-minute tour": ordered stops, each a deep link into a seeded record. Two columns on wide screens, reading down then across. */
export function TourCard({ steps }: { steps: TourStep[] }) {
  return (
    <div id="tour" className="scroll-mt-6">
      <Card
        title="Ten-minute tour"
        actions={<span className="text-xs font-semibold text-muted">{plural(steps.length, "stop")} · dashboard to document history</span>}
      >
        <ol className="md:columns-2 md:gap-x-6">
          {steps.map((step, i) => (
            <li key={step.to} className="break-inside-avoid">
              <Link
                to={step.to}
                aria-current={i === 0 ? "page" : undefined}
                className="focus-ring group flex min-h-11 items-start gap-3 rounded-ctl p-3 transition-colors duration-150 hover:bg-surface-2"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-2 text-[12px] font-black tabular-nums text-ink transition-colors duration-150 group-hover:bg-gold group-hover:text-on-gold">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-bold text-ink">{step.title}</span>
                  <span className="block text-[13px] leading-snug text-ink-soft">{step.caption}</span>
                </span>
                <ChevronRight aria-hidden="true" className="mt-1 size-4 shrink-0 text-muted transition-colors duration-150 group-hover:text-ink" />
              </Link>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
