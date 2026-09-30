import { useId } from "react";
import type { Document } from "@/data/types";
import { fmtDate } from "@/lib/dates";
import { latestRev, revisionsNewestFirst, wrapText } from "../lib";

const LABEL = { className: "fill-muted", fontSize: 6.5, fontWeight: 800, letterSpacing: 0.9 } as const;
const RULE = "stroke-line-strong";

/**
 * Inline SVG stand-in for the drawing sheet: a hatched drawing area with the sample notice and a title block built from
 * the register record (tower, number, title, revision, date, revision list). Every fill and stroke is a token class.
 */
export function TitleBlock({ doc, towerName, disciplineName }: { doc: Document; towerName: string; disciplineName: string }) {
  const hatch = `sheet-hatch-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const rev = latestRev(doc);
  const revs = revisionsNewestFirst(doc).slice(0, 6);
  const title = wrapText(doc.title, 44, 2);
  const noSize = doc.docNo.length > 16 ? 8.5 : 11;

  return (
    <svg
      viewBox="0 0 400 264"
      role="img"
      aria-label={`Title block for ${doc.docNo}, ${doc.title}. Sample, no file attached.`}
      className="block w-full rounded-ctl border border-line bg-surface-2"
    >
      <defs>
        <pattern id={hatch} width={8} height={8} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1={0} y1={0} x2={0} y2={8} className="stroke-line" strokeWidth={0.8} />
        </pattern>
      </defs>

      {/* sheet and drawing area */}
      <rect x={8} y={8} width={384} height={248} className="fill-surface stroke-ink-soft" strokeWidth={1.2} />
      <rect x={8} y={8} width={384} height={142} fill={`url(#${hatch})`} />
      <rect x={84} y={62} width={232} height={34} rx={6} className="fill-surface stroke-line-strong" strokeWidth={0.8} />
      <text x={200} y={79} textAnchor="middle" dominantBaseline="central" className="fill-ink-soft" fontSize={12} fontWeight={700}>
        Sample — no file attached
      </text>

      {/* title block frame */}
      <rect x={8} y={150} width={384} height={106} className="fill-surface stroke-ink-soft" strokeWidth={1} />
      <line x1={120} y1={150} x2={120} y2={256} className={RULE} strokeWidth={0.8} />
      <line x1={120} y1={184} x2={392} y2={184} className={RULE} strokeWidth={0.8} />
      <line x1={120} y1={224} x2={392} y2={224} className={RULE} strokeWidth={0.8} />
      <line x1={250} y1={150} x2={250} y2={184} className={RULE} strokeWidth={0.8} />
      <line x1={170} y1={224} x2={170} y2={256} className={RULE} strokeWidth={0.8} />
      <line x1={260} y1={224} x2={260} y2={256} className={RULE} strokeWidth={0.8} />

      {/* revisions */}
      <text x={16} y={161} {...LABEL}>REVISIONS</text>
      {revs.map((r, i) => (
        <g key={`${r.rev}-${i}`}>
          <text x={16} y={176 + i * 13} className="fill-ink" fontSize={9} fontWeight={800}>{r.rev.slice(0, 6)}</text>
          <text x={46} y={176 + i * 13} className="fill-ink-soft" fontSize={8} fontWeight={600}>{fmtDate(r.date)}</text>
        </g>
      ))}

      {/* tower and drawing number */}
      <text x={128} y={160} {...LABEL}>TOWER</text>
      <text x={128} y={176} className="fill-ink" fontSize={10} fontWeight={700}>{towerName}</text>
      <text x={258} y={160} {...LABEL}>DRAWING NO.</text>
      <text x={258} y={176} className="fill-ink font-mono" fontSize={noSize} fontWeight={700}>{doc.docNo}</text>

      {/* title */}
      <text x={128} y={194} {...LABEL}>TITLE</text>
      {title.map((line, i) => (
        <text key={i} x={128} y={207 + i * 12} className="fill-ink" fontSize={9.5} fontWeight={700}>{line}</text>
      ))}

      {/* revision, date, discipline */}
      <text x={128} y={234} {...LABEL}>REV</text>
      <text x={128} y={248} className="fill-ink" fontSize={10} fontWeight={800}>{rev?.rev.slice(0, 6) ?? "—"}</text>
      <text x={178} y={234} {...LABEL}>DATE</text>
      <text x={178} y={248} className="fill-ink" fontSize={9.5} fontWeight={700}>{rev ? fmtDate(rev.date) : "—"}</text>
      <text x={268} y={234} {...LABEL}>DISCIPLINE</text>
      <text x={268} y={248} className="fill-ink" fontSize={9.5} fontWeight={700}>{disciplineName}</text>
    </svg>
  );
}
