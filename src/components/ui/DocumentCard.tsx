import { BadgeCheck, BookOpen, ClipboardCheck, ExternalLink, FileSignature, FileText, ShieldCheck, type LucideIcon } from "lucide-react";
import { Link } from "react-router";
import type { Document as DocRow, DocType } from "@/data/types";
import { fmtDate } from "@/lib/dates";
import { fmtNumber } from "@/lib/format";
import { paths } from "@/lib/paths";
import { docStatusTone } from "@/lib/status";
import { Badge } from "./Badge";
import { Button } from "./Button";

const ICONS: Record<DocType, LucideIcon> = {
  "as-built": FileText,
  "shop-drawing": FileText,
  "finish-schedule": FileText,
  "om-manual": BookOpen,
  datasheet: BookOpen,
  "tc-report": ClipboardCheck,
  "inspection-report": ClipboardCheck,
  permit: BadgeCheck,
  "warranty-cert": ShieldCheck,
  contract: FileSignature,
};

const words = (s: string) => s.replace(/-/g, " ");
const fileSize = (kb: number) => (kb >= 1024 ? `${fmtNumber(kb / 1024, 1)} MB` : `${fmtNumber(kb)} KB`);

/** design-system §4.13. The title and the open button both link to `href` (default: the document detail route). */
export function DocumentCard({ doc, href }: { doc: DocRow; href?: string }) {
  const to = href ?? paths.document(doc.id);
  const Icon = ICONS[doc.type] ?? FileText;
  // newest revision by date; on a tie the later array entry wins, so it works whichever way the seed orders them
  const latest = doc.revisions.reduce<DocRow["revisions"][number] | undefined>((a, r) => (!a || r.date >= a.date ? r : a), undefined);
  const ext = (doc.fileName.split(".").pop() ?? "").toUpperCase();
  // documents added through "Add document" carry no file, so fileSizeKb is 0: leave the size out rather than print "0 KB"
  const meta = [ext, doc.fileSizeKb > 0 && fileSize(doc.fileSizeKb), latest && `Rev ${latest.rev} ${fmtDate(latest.date)}`, doc.disciplineId].filter(Boolean).join(" · ");

  return (
    <article className="flex min-w-0 gap-3 rounded-card border border-line bg-surface p-4 transition-colors duration-150 hover:border-line-strong">
      <div className="grid size-11 shrink-0 place-items-center rounded-ctl bg-surface-2 text-ink-soft">
        <Icon aria-hidden="true" className="size-5" strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[.06em] text-muted">
          {doc.docNo}{latest && ` · REV ${latest.rev}`}
        </p>
        <h3 className="truncate text-[14px] font-bold text-ink">
          <Link to={to} className="focus-ring rounded hover:underline">{doc.title}</Link>
        </h3>
        <p className="mt-0.5 text-xs text-ink-soft">{meta}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge tone={docStatusTone(doc.status)}>{words(doc.status)}</Badge>
          <Badge tone="neutral">{words(doc.type)}</Badge>
        </div>
      </div>
      <Button to={to} variant="ghost" size="sm" icon aria-label={`Open ${doc.docNo}`}>
        <ExternalLink className="size-4" strokeWidth={2} />
      </Button>
    </article>
  );
}
