import { MapPin, Unlink } from "lucide-react";
import { Link } from "react-router";
import { Badge, Button, Card, EmptyState, Tabs, cn } from "@/components/ui";
import { useDb } from "@/data/store";
import type { Document } from "@/data/types";
import { describeLink, groupLinks, pick, useQuery, type LinkGroups } from "../lib";

const TABS: { key: keyof LinkGroups; label: string; empty: string }[] = [
  { key: "assets", label: "Assets", empty: "No asset is linked to this document." },
  { key: "spaces", label: "Spaces", empty: "No space is linked to this document." },
  { key: "floors", label: "Floors", empty: "No floor is linked to this document." },
  { key: "other", label: "Other", empty: "No tower, model, standard, permit or vendor is linked to this document." },
];
const KEYS = TABS.map((t) => t.key);

/** Where the document is used, in four local tabs synced to ?tab=. `planHref` is the first governed floor's plan, when there is one. */
export function WhereUsed({ doc, planHref }: { doc: Document; planHref?: string }) {
  const db = useDb((d) => d);
  const { params, set } = useQuery();
  const groups = groupLinks(doc);

  if (doc.links.length === 0) {
    return (
      <Card title="Where used">
        <EmptyState icon={Unlink} title="Not linked yet" body="No asset, space, floor or other record points at this document." />
      </Card>
    );
  }

  const first = TABS.find((t) => groups[t.key].length > 0)?.key ?? "assets";
  const tab = pick(params.get("tab"), KEYS) || first;
  const current = TABS.find((t) => t.key === tab) ?? TABS[0];
  const rows = groups[current.key];

  return (
    <Card
      title="Where used"
      actions={
        planHref && (
          <Button to={planHref} variant="ghost" size="sm">
            <MapPin className="size-4" strokeWidth={2} /> Show on plan
          </Button>
        )
      }
    >
      <Tabs
        items={TABS.map((t) => ({ key: t.key, label: t.label, count: groups[t.key].length }))}
        value={tab}
        onChange={(key) => set({ tab: key })}
        className="mb-2"
      />
      {rows.length === 0 ? (
        <EmptyState icon={Unlink} title="Nothing here" body={current.empty} className="mt-3" />
      ) : (
        <ul className="-mx-2 divide-y divide-line">
          {rows.map((link) => {
            const view = describeLink(db, link, doc.id);
            return (
              <li key={`${link.kind}-${link.id}`} className="relative flex items-center gap-3 rounded-ctl px-2 py-3 transition-colors duration-150 hover:bg-surface-2">
                <div className="min-w-0 flex-1">
                  {view.href ? (
                    <Link
                      to={view.href}
                      className={cn(
                        "focus-ring rounded text-[14px] font-bold text-ink hover:underline after:absolute after:inset-0 after:content-['']",
                        view.mono && "font-mono text-[12px]",
                      )}
                    >
                      {view.title}
                    </Link>
                  ) : (
                    <span className={cn("text-[14px] font-bold text-ink", view.mono && "font-mono text-[12px]")}>{view.title}</span>
                  )}
                  <p className="truncate text-xs text-ink-soft">{view.sub}</p>
                </div>
                <Badge tone="neutral">{link.relation}</Badge>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
