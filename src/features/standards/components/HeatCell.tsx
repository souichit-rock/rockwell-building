import { cn } from "@/components/ui";
import { plural } from "@/lib/format";
import { HEAT, heatTone, sharePct, type Totals } from "../lib";

/**
 * One heatmap cell: (compliant + waived) / governed assets as a whole percent, the deviation count, and the phase-out count when there is one.
 * Tone comes from heatTone (ok 95+, warn 80+, danger below, neutral n/a). With `onOpen` and at least one governed asset it is a button.
 * The words carry the meaning as well as the tone, so colour is never the only cue. `label` is spoken first ("RDS-FP-01, The Grove Tower B").
 */
export function HeatCell({ totals, label, selected, onOpen }: { totals: Totals; label: string; selected?: boolean; onOpen?: () => void }) {
  const pct = sharePct(totals);
  const box = cn("flex min-h-16 w-full min-w-28 flex-col items-center justify-center gap-0.5 rounded-ctl px-2 py-2 text-center", HEAT[heatTone(pct)]);
  const body =
    pct === null ? (
      <>
        <span className="sr-only">{label}: </span>
        <span className="text-xs font-bold">n/a</span>
        <span className="sr-only"> no governed assets</span>
      </>
    ) : (
      <>
        <span className="sr-only">{label}: </span>
        <span className="text-[16px] font-black leading-tight tabular-nums">{pct}%</span>
        <span className="text-[11px] font-semibold tabular-nums">{totals.deviations === 0 ? "No deviations" : plural(totals.deviations, "deviation")}</span>
        {totals.phaseOut > 0 && <span className="text-[11px] font-medium tabular-nums">{totals.phaseOut} phase-out</span>}
      </>
    );

  if (!onOpen || pct === null) return <div className={box}>{body}</div>;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      className={cn(box, "focus-ring transition-shadow duration-150 hover:ring-2 hover:ring-inset hover:ring-ink-soft", selected && "ring-2 ring-inset ring-gold")}
    >
      {body}
    </button>
  );
}
