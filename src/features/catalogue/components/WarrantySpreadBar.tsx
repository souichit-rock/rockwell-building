import { TONE_FILL, type SpreadBucket } from "../lib";

/**
 * One stacked bar of a model's installed assets by warranty state (expired, ends within 90 days, active, no warranty on file).
 * The tiles beside it carry the labelled counts; the bar is the proportion, with the same numbers as its text alternative.
 */
export function WarrantySpreadBar({ buckets, none }: { buckets: SpreadBucket[]; none: number }) {
  const parts = [
    ...buckets.map((b) => ({ key: b.key, label: b.label, count: b.count, fill: TONE_FILL[b.tone] })),
    { key: "none", label: "No warranty on file", count: none, fill: TONE_FILL.neutral },
  ].filter((p) => p.count > 0);
  const total = parts.reduce((n, p) => n + p.count, 0);
  if (total === 0) return null;

  const segments = parts.map((p, i) => ({ ...p, x: (parts.slice(0, i).reduce((n, q) => n + q.count, 0) / total) * 100, w: (p.count / total) * 100 }));
  return (
    <>
      <svg
        role="img"
        aria-label={`Warranty spread: ${parts.map((p) => `${p.count} ${p.label.toLowerCase()}`).join(", ")}`}
        className="block h-2.5 w-full overflow-hidden rounded-full"
      >
        {segments.map((s) => (
          <rect key={s.key} x={`${s.x}%`} width={`${s.w}%`} height="100%" strokeWidth={2} className={`${s.fill} stroke-surface`} />
        ))}
      </svg>
      {/* colour is never the only key: a dot and the name of each segment (the counts are the tiles beside it) */}
      <ul aria-hidden="true" className="type-small mt-2 flex flex-wrap gap-x-4 gap-y-1 text-ink-soft">
        {parts.map((p) => (
          <li key={p.key} className="flex items-center gap-1.5">
            <svg className="size-2.5 shrink-0">
              <circle cx="5" cy="5" r="5" className={p.fill} />
            </svg>
            {p.label}
          </li>
        ))}
      </ul>
    </>
  );
}
