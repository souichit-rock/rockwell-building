import { useId } from "react";
import type { Document } from "@/data/types";
import { fmtDate } from "@/lib/dates";
import { clip, latestRev, revisionsNewestFirst, wrapText } from "../lib";

// Sizes are set for a phone: the sheet is about 318 px wide there (scale 0.8), so labels land near 7 px and values near 9.5 px.
const LABEL = { className: "fill-muted", fontSize: 9, fontWeight: 800, letterSpacing: 0.9 } as const;
const VALUE = { className: "fill-ink", fontSize: 12, fontWeight: 700 } as const;
const RULE = "stroke-line-strong";

/**
 * Inline SVG stand-in for the drawing sheet: a hatched drawing area with the sample notice and a title block built from
 * the register record (tower, number, title, revision, date, revision list). Every fill and stroke is a token class.
 * The rows are stacked full width so each value keeps room at the larger type size.
 */
export function TitleBlock({ doc, towerName, disciplineName }: { doc: Document; towerName: string; disciplineName: string }) {
  const hatch = `sheet-hatch-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const rev = latestRev(doc);
  const revs = revisionsNewestFirst(doc).slice(0, 6);
  const title = wrapText(doc.title, 44, 2);
  const noSize = doc.docNo.length > 16 ? 10 : 12;

  return (
    <svg
      viewBox="0 0 400 370"
      role="img"
      aria-label={`Title block for ${doc.docNo}, ${doc.title}. Sample, no file attached.`}
      className="mx-auto block w-full max-w-lg rounded-ctl border border-line bg-surface-2"
    >
      <defs>
        <pattern id={hatch} width={8} height={8} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1={0} y1={0} x2={0} y2={8} className="stroke-line" strokeWidth={0.8} />
        </pattern>
      </defs>

      {/* sheet and drawing area */}
      <rect x={8} y={8} width={384} height={354} className="fill-surface stroke-ink-soft" strokeWidth={1.2} />
      <rect x={8} y={8} width={384} height={110} fill={`url(#${hatch})`} />
      <rect x={76} y={47} width={248} height={34} rx={6} className="fill-surface stroke-line-strong" strokeWidth={0.8} />
      <text x={200} y={64} textAnchor="middle" dominantBaseline="central" className="fill-ink-soft" fontSize={13} fontWeight={700}>
        Sample — no file attached
      </text>

      {/* title block frame: tower | number, title, rev | date | discipline, revisions */}
      <rect x={8} y={118} width={384} height={244} className="fill-surface stroke-ink-soft" strokeWidth={1} />
      <line x1={8} y1={158} x2={392} y2={158} className={RULE} strokeWidth={0.8} />
      <line x1={8} y1={212} x2={392} y2={212} className={RULE} strokeWidth={0.8} />
      <line x1={8} y1={252} x2={392} y2={252} className={RULE} strokeWidth={0.8} />
      <line x1={200} y1={118} x2={200} y2={158} className={RULE} strokeWidth={0.8} />
      <line x1={90} y1={212} x2={90} y2={252} className={RULE} strokeWidth={0.8} />
      <line x1={210} y1={212} x2={210} y2={252} className={RULE} strokeWidth={0.8} />

      {/* tower and drawing number */}
      <text x={16} y={132} {...LABEL}>TOWER</text>
      <text x={16} y={149} {...VALUE}>{clip(towerName, 22)}</text>
      <text x={208} y={132} {...LABEL}>DRAWING NO.</text>
      <text x={208} y={149} {...VALUE} className="fill-ink font-mono" fontSize={noSize}>{clip(doc.docNo, 24)}</text>

      {/* title */}
      <text x={16} y={172} {...LABEL}>TITLE</text>
      {title.map((line, i) => (
        <text key={i} x={16} y={190 + i * 15} {...VALUE}>{line}</text>
      ))}

      {/* revision, date, discipline */}
      <text x={16} y={226} {...LABEL}>REV</text>
      <text x={16} y={243} {...VALUE} fontWeight={800}>{rev?.rev.slice(0, 6) ?? "—"}</text>
      <text x={98} y={226} {...LABEL}>DATE</text>
      <text x={98} y={243} {...VALUE}>{rev ? fmtDate(rev.date) : "—"}</text>
      <text x={218} y={226} {...LABEL}>DISCIPLINE</text>
      <text x={218} y={243} {...VALUE}>{clip(disciplineName, 22)}</text>

      {/* revisions */}
      <text x={16} y={266} {...LABEL}>REVISIONS</text>
      {revs.map((r, i) => (
        <g key={`${r.rev}-${i}`}>
          <text x={16} y={283 + i * 14} className="fill-ink" fontSize={11} fontWeight={800}>{r.rev.slice(0, 6)}</text>
          <text x={72} y={283 + i * 14} className="fill-ink-soft" fontSize={11} fontWeight={600}>{fmtDate(r.date)}</text>
        </g>
      ))}
    </svg>
  );
}
