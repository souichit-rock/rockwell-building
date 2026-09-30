import { Phone } from "lucide-react";
import { Link } from "react-router";
import { Badge, Button, Drawer, EquipmentIcon, KV } from "@/components/ui";
import { dueStatus } from "@/data/selectors";
import type { Asset } from "@/data/types";
import { useDb } from "@/data/store";
import { fmtDate } from "@/lib/dates";
import { paths } from "@/lib/paths";
import { assetStatusTone, conditionTone, dueTone, warrantyTone } from "@/lib/status";
import { assetBrief, latestRev, words } from "../lib";

// the ::after grows the hit area to a 40px-tall target without moving the text
const LINK = "focus-ring relative rounded text-ink underline-offset-2 hover:underline after:absolute after:-inset-x-1 after:-inset-y-2.5 after:content-['']";

/** Right-hand quick view of one pin. Closed while `asset` is undefined. */
export function AssetDrawer({ asset, onClose }: { asset: Asset | undefined; onClose: () => void }) {
  const db = useDb((d) => d);
  const b = asset ? assetBrief(db, asset) : undefined;

  return (
    <Drawer
      open={!!asset && !!b}
      onClose={onClose}
      title={b?.type?.name ?? "Asset"}
      footer={
        asset && (
          <>
            <Button to={paths.newWorkOrder({ assetId: asset.id, towerId: asset.towerId })} variant="ghost">Raise work order</Button>
            <Button to={paths.asset(asset.id)} variant="primary">Open passport</Button>
          </>
        )
      }
    >
      {asset && b && (
        <>
          <div className="flex items-start gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-ctl bg-surface-2 text-ink-soft">
              {b.type && <EquipmentIcon name={b.type.icon} />}
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[13px] font-bold text-ink">{asset.tag}</p>
              <p className="text-[13px] text-ink-soft">
                {b.brand?.name ?? "Unknown brand"} · <span className="font-mono text-[12px]">{b.model?.modelNo ?? "no model"}</span>
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge tone={assetStatusTone(asset.status)} dot>{words(asset.status)}</Badge>
                <Badge tone={conditionTone(asset.condition)}>{asset.condition} condition</Badge>
              </div>
            </div>
          </div>

          <KV
            items={[
              {
                k: "Location",
                v: b.space ? <Link to={paths.space(b.space.id)} className={LINK}>{b.space.name}{b.floor && ` · ${b.floor.label}`}</Link> : "—",
              },
              {
                k: "Next PM",
                v: b.plan ? (
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Link to={paths.plan(b.plan.id)} className={LINK}>{b.plan.task}</Link>
                    <span className="text-[13px] font-medium text-ink-soft">{fmtDate(b.plan.nextDue)}</span>
                    <Badge tone={dueTone(dueStatus(b.plan.nextDue))}>{words(dueStatus(b.plan.nextDue))}</Badge>
                  </span>
                ) : (
                  <span className="font-medium text-muted">No PM plan</span>
                ),
              },
              {
                k: "Warranty",
                v: (
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Badge tone={warrantyTone(b.band)}>{words(b.band)}</Badge>
                    {b.warranty && <span className="text-[13px] font-medium text-ink-soft">Ends {fmtDate(b.warranty.end)}</span>}
                  </span>
                ),
              },
              {
                k: "Governing sheet",
                v: b.sheet ? (
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Link to={paths.document(b.sheet.doc.id)} className={`${LINK} font-mono text-[12px]`}>
                      {b.sheet.doc.docNo}{latestRev(b.sheet.doc) && ` · Rev ${latestRev(b.sheet.doc)?.rev}`}
                    </Link>
                    {b.sheet.stale && <Badge tone="warn">Superseded sheet</Badge>}
                  </span>
                ) : (
                  <Badge tone="warn">No as-built</Badge>
                ),
              },
              {
                k: b.vendorRole,
                v: b.vendor ? (
                  <span className="block">
                    <Link to={paths.vendor(b.vendor.id)} className={LINK}>{b.vendor.name}</Link>
                    {b.contact && (
                      <a
                        href={`tel:${b.contact.phone.replace(/[^\d+]/g, "")}`}
                        className="focus-ring mt-1 flex min-h-10 items-center gap-2 rounded text-[13px] font-medium text-ink-soft hover:text-ink"
                      >
                        <Phone aria-hidden="true" className="size-4 shrink-0" strokeWidth={2} />
                        {b.contact.phone}
                        <span className="text-muted">· {b.contact.name}</span>
                      </a>
                    )}
                  </span>
                ) : (
                  "—"
                ),
              },
            ]}
          />
        </>
      )}
    </Drawer>
  );
}
