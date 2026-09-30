import { FilePlus2 } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { NotFound } from "@/app/NotFound";
import { Badge, Breadcrumb, Button, Card, KV, Notice, PageHeader, Timeline } from "@/components/ui";
import { useDb } from "@/data/store";
import type { Document } from "@/data/types";
import { fmtDate } from "@/lib/dates";
import { fmtNumber, plural } from "@/lib/format";
import { paths } from "@/lib/paths";
import { docStatusTone } from "@/lib/status";
import { AddRevisionModal } from "../components/DocumentModals";
import { TitleBlock } from "../components/TitleBlock";
import { WhereUsed } from "../components/WhereUsed";
import { DOC_TYPE_LABEL, docPlace, fileSize, governedFloors, latestRev, linkClass, revisionsNewestFirst, supersession, words } from "../lib";

/** One side of the supersession chain: each issue links to its own page. The whole row is the click target. */
function ChainGroup({ label, docs }: { label: string; docs: Document[] }) {
  return (
    <div>
      <p className="type-eyebrow mb-2">{label}</p>
      <ul className="divide-y divide-line rounded-ctl border border-line">
        {docs.map((d) => {
          const rev = latestRev(d);
          return (
            <li key={d.id} className="relative flex items-center gap-3 px-3 py-2.5 transition-colors duration-150 hover:bg-surface-2">
              <div className="min-w-0 flex-1">
                <Link
                  to={paths.document(d.id)}
                  className="focus-ring rounded font-mono text-[12px] font-bold text-ink hover:underline after:absolute after:inset-0 after:content-['']"
                >
                  {d.docNo}
                </Link>
                <p className="truncate text-xs text-ink-soft">
                  {d.title}
                  {rev && ` · Rev ${rev.rev}, ${fmtDate(rev.date)}`}
                </p>
              </div>
              <Badge tone={docStatusTone(d.status)}>{words(d.status)}</Badge>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function DocumentDetail() {
  const { docId = "" } = useParams();
  const db = useDb((d) => d);
  const [addingRev, setAddingRev] = useState(false);

  const doc = Object.hasOwn(db.documents, docId) ? db.documents[docId] : undefined;
  if (!doc) return <NotFound what="document" id={docId} />;

  const tower = doc.towerId ? db.towers[doc.towerId] : undefined;
  const floor = doc.floorId ? db.floors[doc.floorId] : undefined;
  const disciplineName = db.disciplines[doc.disciplineId]?.name ?? doc.disciplineId;
  const rev = latestRev(doc);
  const { newer, older } = supersession(db, doc);
  const planFloor = governedFloors(db, doc)[0];
  const planHref = planFloor ? paths.floor(planFloor.towerId, planFloor.id, { highlight: `doc:${doc.id}` }) : undefined;
  const stale = doc.status === "superseded" && doc.links.length > 0;
  const n = doc.links.length;

  const details = [
    { k: "Document no", v: doc.docNo, mono: true },
    { k: "Type", v: DOC_TYPE_LABEL[doc.type] },
    { k: "Discipline", v: disciplineName },
    { k: "Tower", v: tower ? <Link to={paths.tower(tower.id)} className={linkClass}>{tower.name}</Link> : "Portfolio" },
    ...(floor ? [{ k: "Floor", v: <Link to={paths.floor(floor.towerId, floor.id)} className={linkClass}>{floor.label}</Link> }] : []),
    { k: "Status", v: <Badge tone={docStatusTone(doc.status)}>{words(doc.status)}</Badge> },
    { k: "Revision", v: rev ? `${rev.rev} · ${fmtDate(rev.date)}` : "—" },
    { k: "Issued by", v: rev?.issuedBy ?? "—" },
    { k: "File", v: doc.fileName, mono: true },
    { k: "Size", v: doc.fileSizeKb > 0 ? fileSize(doc.fileSizeKb) : "—" },
    { k: "Pages", v: doc.pages > 0 ? fmtNumber(doc.pages) : "—" },
    { k: "Linked records", v: plural(n, "record") },
  ];

  return (
    <div>
      <Breadcrumb items={[{ to: paths.documents(), label: "Documents" }, { label: doc.docNo }]} />
      <PageHeader
        eyebrow={docPlace(db, doc)}
        title={doc.title}
        lede={
          <>
            <span className="font-mono text-[13px] font-bold text-ink">{doc.docNo}</span>
            {rev && ` · Rev ${rev.rev}, ${fmtDate(rev.date)}`}
            <Badge tone={docStatusTone(doc.status)} className="ml-3 align-middle">{words(doc.status)}</Badge>
          </>
        }
        actions={
          <Button variant="primary" onClick={() => setAddingRev(true)}>
            <FilePlus2 aria-hidden="true" className="size-4" strokeWidth={2} />
            Add revision
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_340px] lg:items-start">
        <div className="min-w-0 space-y-4">
          {stale && (
            <Notice tone="warn">
              This issue is superseded
              {newer[0] && (
                <>
                  {" by "}
                  <Link to={paths.document(newer[0].id)} className="focus-ring rounded font-mono font-extrabold underline">{newer[0].docNo}</Link>
                </>
              )}
              , yet {plural(n, "record")} still {n === 1 ? "points" : "point"} at it. Check each one under Where used and move it to the current issue.
            </Notice>
          )}

          <Card title="Title block">
            <TitleBlock doc={doc} towerName={tower?.name ?? "Portfolio"} disciplineName={disciplineName} />
            <p className="type-small mt-3 text-muted">
              A placeholder drawn from the register record. The register holds the details of the sheet, not the file itself.
            </p>
          </Card>

          <Card title="Supersession">
            {newer.length === 0 && older.length === 0 ? (
              <p className="type-small text-muted">No other issue of this document is on record. Nothing supersedes it and it supersedes nothing.</p>
            ) : (
              <div className="space-y-4">
                {newer.length > 0 && <ChainGroup label="Superseded by" docs={newer} />}
                {older.length > 0 && <ChainGroup label="Supersedes" docs={older} />}
              </div>
            )}
          </Card>

          <WhereUsed doc={doc} planHref={planHref} />
        </div>

        <aside className="min-w-0 space-y-4">
          <Card title="Details">
            <KV items={details} />
          </Card>
          <Card title="Revision history">
            {doc.revisions.length === 0 ? (
              <p className="type-small text-muted">No revision is recorded for this document.</p>
            ) : (
              <Timeline
                items={revisionsNewestFirst(doc).map((r) => ({ when: fmtDate(r.date), what: `${r.rev} · ${r.issuedBy}`, note: r.reason }))}
              />
            )}
          </Card>
        </aside>
      </div>

      <AddRevisionModal doc={doc} open={addingRev} onClose={() => setAddingRev(false)} onSaved={() => setAddingRev(false)} />
    </div>
  );
}
