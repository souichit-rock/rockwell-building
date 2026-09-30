import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { Badge, Button, Card, cn } from "@/components/ui";
import type { BadgeTone, DueStatus, ISODate } from "@/data/types";
import { fmtDate, monthGrid, todayISO } from "@/lib/dates";
import { plural } from "@/lib/format";
import { paths } from "@/lib/paths";
import { dueTone } from "@/lib/status";
import { calendarCells, dueNote, FREQUENCY_LABEL, monthLabel, shiftMonth, words, type PlanRow } from "../lib";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const STATUSES: DueStatus[] = ["overdue", "due", "on-track"];
// phone counters carry a letter so status never rests on colour alone
const LETTER: Record<DueStatus, string> = { overdue: "O", due: "D", "on-track": "T" };
// chip fills follow the badge tones; the tone itself always comes from dueTone
const FILL: Partial<Record<BadgeTone, string>> = { ok: "bg-ok-soft text-ok-deep", warn: "bg-warn-soft text-warn-deep", danger: "bg-danger-soft text-danger-deep" };
const fill = (status: DueStatus) => FILL[dueTone(status)] ?? "bg-surface-2 text-ink-soft";

/**
 * Native month grid (Mon-Sun) over the same filtered rows the list shows. Wide screens list up to 3 plan chips per day plus "+n";
 * on a phone each day shows per-status counts and a tap selects it, and the panel under the grid lists every plan of the selected day.
 */
export function CalendarView({ rows, month: monthParam, onMonth }: {
  rows: PlanRow[];
  month: string | undefined;
  onMonth: (month: string | null) => void;
}) {
  const today = todayISO();
  const { month, weeks } = monthGrid(monthParam ?? "");
  const days = weeks.flat();
  const cells = calendarCells(rows, weeks, today);
  const current = month === today.slice(0, 7);
  const [picked, setPicked] = useState<ISODate | null>(null);
  const selected = picked && days.includes(picked) ? picked : current ? today : `${month}-01`;
  const selectedItems = cells.get(selected) ?? [];
  const dueInMonth = rows.filter((r) => r.plan.nextDue.startsWith(month)).length;
  const carriedToday = (cells.get(today) ?? []).filter((i) => i.carried).length;
  const go = (m: string) => onMonth(m === today.slice(0, 7) ? null : m);

  return (
    <section aria-label={`Calendar for ${monthLabel(month)}`}>
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" icon aria-label="Previous month" onClick={() => go(shiftMonth(month, -1))}>
            <ChevronLeft className="size-4" strokeWidth={2} />
          </Button>
          <h2 aria-live="polite" className="type-title min-w-[9.5rem] text-center text-ink sm:min-w-[12rem]">{monthLabel(month)}</h2>
          <Button variant="ghost" icon aria-label="Next month" onClick={() => go(shiftMonth(month, 1))}>
            <ChevronRight className="size-4" strokeWidth={2} />
          </Button>
        </div>
        <Button variant="ghost" size="sm" disabled={current} onClick={() => onMonth(null)}>Today</Button>
        <p className="type-small text-muted sm:ml-auto" aria-live="polite">
          {plural(dueInMonth, "plan")} due in {monthLabel(month)}
          {carriedToday > 0 && ` · ${carriedToday} overdue shown on today`}
        </p>
        <div className="hidden items-center gap-1.5 md:flex" aria-hidden="true">
          {STATUSES.map((s) => (
            <Badge key={s} tone={dueTone(s)}>{words(s)}</Badge>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-card border border-line bg-surface">
        <div className="grid grid-cols-7 border-b border-line">
          {WEEKDAYS.map((d) => (
            <div key={d} className="px-1 py-2.5 text-center text-[10px] font-extrabold uppercase tracking-[.11em] text-muted">
              <span className="sm:hidden">{d[0]}</span>
              <span className="hidden sm:inline">{d}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px bg-line">
          {days.map((date) => {
            const items = cells.get(date) ?? [];
            const carried = items.filter((i) => i.carried).length;
            const counts = STATUSES.map((s) => [s, items.filter((i) => i.row.status === s).length] as const).filter(([, n]) => n > 0);
            const shown = items.slice(0, 3);
            const inMonth = date.startsWith(month);
            const isToday = date === today;
            return (
              <div
                key={date}
                className={cn(
                  "relative flex min-h-[64px] min-w-0 flex-col gap-1 p-1 sm:min-h-[112px] sm:p-1.5",
                  inMonth ? "bg-surface" : "bg-surface-2",
                  date === selected && "ring-2 ring-inset ring-gold",
                )}
              >
                <button
                  type="button"
                  aria-pressed={date === selected}
                  aria-label={`${fmtDate(date)}, ${plural(items.length, "plan")}${counts.length > 0 ? ` (${counts.map(([s, n]) => `${n} ${words(s)}`).join(", ")})` : ""}${carried > 0 ? `, ${carried} overdue carried` : ""}`}
                  onClick={() => setPicked(date)}
                  className="focus-ring flex w-full items-start justify-between gap-1 rounded text-left after:absolute after:inset-0 after:content-['']"
                >
                  <span
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-full text-[12px] font-bold tabular-nums",
                      isToday ? "bg-navy text-nav-text" : inMonth ? "text-ink" : "text-muted",
                    )}
                  >
                    {Number(date.slice(8))}
                  </span>
                  {carried > 0 && (
                    <Badge tone="danger" className="max-sm:px-1">
                      {carried}
                      <span className="hidden sm:inline">overdue</span>
                    </Badge>
                  )}
                </button>

                <ul className="hidden min-w-0 flex-col gap-1 sm:flex">
                  {shown.map(({ row, carried: isCarried }) => (
                    <li key={`${row.plan.id}${isCarried ? "-carried" : ""}`} className="relative z-10 min-w-0">
                      <Link
                        to={paths.plan(row.plan.id)}
                        title={`${row.asset.tag} · ${row.plan.task}${isCarried ? ` · ${dueNote(row.plan.nextDue)}` : ""}`}
                        className={cn(
                          "focus-ring block truncate rounded-md px-1.5 py-0.5 font-mono text-[11px] font-bold leading-4 transition-colors duration-150 hover:opacity-80",
                          fill(row.status),
                        )}
                      >
                        {row.asset.tag}
                      </Link>
                    </li>
                  ))}
                  {items.length > shown.length && (
                    <li className="relative z-10">
                      <button
                        type="button"
                        onClick={() => setPicked(date)}
                        className="focus-ring rounded px-1 text-[11px] font-bold text-ink-soft hover:text-ink"
                      >
                        +{items.length - shown.length} more
                      </button>
                    </li>
                  )}
                </ul>

                <div className="flex flex-wrap gap-0.5 sm:hidden" aria-hidden="true">
                  {counts.map(([s, n]) => (
                    <span key={s} className={cn("min-w-4 rounded px-1 text-center text-[10px] font-extrabold tabular-nums leading-4", fill(s))}>
                      {LETTER[s]}{n}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="type-small mt-2 text-muted sm:hidden" aria-hidden="true">
        {STATUSES.map((s) => `${LETTER[s]} ${words(s)}`).join(" · ")}
      </p>

      <Card
        tight
        className="mt-4"
        title={fmtDate(selected)}
        actions={<Badge tone="neutral">{plural(selectedItems.length, "plan")}</Badge>}
      >
        {selectedItems.length === 0 ? (
          <p className="type-small text-muted">No plans fall on this day.</p>
        ) : (
          <ul className="divide-y divide-line">
            {selectedItems.map(({ row, carried }) => (
              <li key={`${row.plan.id}${carried ? "-carried" : ""}`}>
                <Link
                  to={paths.plan(row.plan.id)}
                  className="focus-ring flex min-h-12 flex-wrap items-center gap-x-3 gap-y-1 rounded py-2.5 transition-colors duration-150 hover:bg-surface-2 sm:flex-nowrap"
                >
                  <Badge tone={dueTone(row.status)}>{words(row.status)}</Badge>
                  <span className="min-w-0 flex-1 basis-40">
                    <span className="block font-mono text-[12px] text-ink-soft">{row.asset.tag}</span>
                    <span className="block font-semibold text-ink">{row.plan.task}</span>
                    <span className="block text-xs font-medium text-muted">
                      {row.vendor?.name ?? `${row.plan.assigneeTeam} team`} · {FREQUENCY_LABEL[row.plan.frequency]}
                    </span>
                  </span>
                  <span className="text-xs font-semibold text-muted">
                    {carried ? `Due ${fmtDate(row.plan.nextDue)} · ` : ""}
                    {dueNote(row.plan.nextDue)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
