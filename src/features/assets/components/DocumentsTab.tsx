import { FileX } from "lucide-react";
import { Link } from "react-router";
import { DocumentCard, EmptyState, Notice } from "@/components/ui";
import { paths } from "@/lib/paths";
import { LINK, type Passport } from "../lib";

const GROUP_TITLE = { governs: "Governs this asset", certifies: "Certifies this asset", references: "References this asset" } as const;

export function DocumentsTab({ p }: { p: Passport }) {
  const { sheet, successor, groups } = p;
  return (
    <div className="space-y-6">
      <section aria-labelledby="sheet-h" className="space-y-3">
        <h2 id="sheet-h" className="type-eyebrow">Governing as-built</h2>
        {sheet ? (
          <>
            <div className="max-w-2xl"><DocumentCard doc={sheet.doc} /></div>
            {sheet.stale && (
              <Notice tone="warn">
                This sheet is superseded.
                {successor && (
                  <>
                    {" "}The current issue is <Link to={paths.document(successor.id)} className={LINK}>{successor.docNo}</Link>.
                  </>
                )}
              </Notice>
            )}
          </>
        ) : (
          <Notice tone="warn">No as-built sheet governs this asset, its room or its floor yet.</Notice>
        )}
      </section>

      {groups.map((g) => (
        <section key={g.relation} aria-label={GROUP_TITLE[g.relation]} className="space-y-3">
          <h2 className="type-eyebrow">{GROUP_TITLE[g.relation]}</h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {g.docs.map((d) => <DocumentCard key={d.id} doc={d} />)}
          </div>
        </section>
      ))}

      {p.docCount === 0 && <EmptyState icon={FileX} title="No documents linked" body="Nothing in the document register points at this asset." />}
    </div>
  );
}
