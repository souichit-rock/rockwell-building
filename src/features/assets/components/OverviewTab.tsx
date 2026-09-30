import { History, MapPin, Phone } from "lucide-react";
import { Link } from "react-router";
import { Badge, Button, Card, EmptyState, KV, Notice, Timeline, cn } from "@/components/ui";
import { FloorPlanSvg } from "@/components/plan/FloorPlanSvg";
import { fmtDate } from "@/lib/dates";
import { paths } from "@/lib/paths";
import { assetStatusTone, complianceTone, conditionTone, tierTone, warrantyTone } from "@/lib/status";
import { LINK, telHref, timelineOf, warrantyLeft, words, type Passport, type TabKey } from "../lib";
import { QrCard } from "./QrCard";

// The overview is the one-page print: on paper the two columns melt into a two-column flow of unbreakable cards.
const PRINT_CARD = "print:mb-3 print:break-inside-avoid";

function LocationCard({ p }: { p: Passport }) {
  const { asset, tower, floor, space } = p;
  return (
    <Card
      title="Location"
      className={PRINT_CARD}
      actions={
        <Button to={paths.floor(tower.id, floor.id, { highlight: `asset:${asset.id}` })} variant="ghost" size="sm" className="print:hidden">
          <MapPin aria-hidden="true" className="size-4" strokeWidth={2} />
          Show on plan
        </Button>
      }
    >
      {p.template ? (
        <FloorPlanSvg compact template={p.template} spaces={p.floorSpaces} pins={p.pins} selectedAssetId={asset.id} highlightSpaceIds={[space.id]} />
      ) : (
        <p className="type-small text-muted">No plan is drawn for this floor.</p>
      )}
      <p className="type-small mt-3 text-ink-soft">
        <Link to={paths.tower(tower.id)} className={LINK}>{tower.name}</Link>
        {" · "}
        <Link to={paths.floor(tower.id, floor.id)} className={LINK}>{floor.label}</Link>
        {" · "}
        <Link to={paths.space(space.id)} className={LINK}>{space.name}</Link>
        <span className="font-mono text-[12px]"> ({space.code})</span>
      </p>
    </Card>
  );
}

function ActivityCard({ p, onTab }: { p: Passport; onTab: (tab: TabKey) => void }) {
  return (
    <Card
      title="Recent activity"
      className="print:hidden"
      actions={p.history.length > 4 ? <Button variant="ghost" size="sm" onClick={() => onTab("history")}>View all {p.history.length}</Button> : undefined}
    >
      {p.history.length > 0 ? <Timeline items={timelineOf(p.history.slice(0, 4))} /> : <EmptyState icon={History} title="No activity yet" body="No work order or inspection has been recorded against this asset." className="py-8" />}
    </Card>
  );
}

function SpecsCard({ p }: { p: Passport }) {
  const { asset, type, model, brand, parent, installer, serviceVendor } = p;
  const vendorLink = (v: typeof installer) => (v ? <Link to={paths.vendor(v.id)} className={LINK}>{v.name}</Link> : "—");
  const head = [
    { k: "Type", v: <Link to={paths.catalogue({ type: type.id })} className={LINK}>{type.name}</Link> },
    { k: "Brand", v: brand ? <Link to={paths.brand(brand.id)} className={LINK}>{brand.name}</Link> : "—" },
    { k: "Model", v: model ? <Link to={paths.model(model.id)} className={LINK}>{model.modelNo}</Link> : "—", mono: true },
  ];
  const tail = [
    { k: "Rating", v: asset.rating || "—" },
    { k: "Serial", v: asset.serial, mono: true },
    { k: "Installed", v: fmtDate(asset.installDate) },
    { k: "Commissioned", v: fmtDate(asset.commissionDate) },
    { k: "Criticality", v: asset.criticality },
    { k: "Condition", v: <Badge tone={conditionTone(asset.condition)}>{asset.condition}</Badge> },
    { k: "Status", v: <Badge tone={assetStatusTone(asset.status)}>{words(asset.status)}</Badge> },
    { k: "Parent asset", v: parent ? <Link to={paths.asset(parent.id)} className={cn(LINK, "font-mono text-[12px]")}>{parent.tag}</Link> : "—" },
    { k: "Installer", v: vendorLink(installer) },
    { k: "Service vendor", v: vendorLink(serviceVendor) },
    ...(asset.notes ? [{ k: "Notes", v: asset.notes }] : []),
  ];
  // a model spec named like a fixed row ("Rating", "Type") would repeat the label and the KV row key, so it reads "Model rating" instead
  const taken = new Set([...head, ...tail].map((i) => i.k));
  const specs = Object.entries(model?.specs ?? {}).map(([k, v]) => ({ k: taken.has(k) ? `Model ${k.toLowerCase()}` : k, v }));
  return (
    <Card title="Specifications" className={PRINT_CARD}>
      <KV items={[...head, ...specs, ...tail]} />
    </Card>
  );
}

function WarrantyCard({ p }: { p: Passport }) {
  const { warranty, warrantyVendor: vendor, warrantyDoc: doc, band } = p;
  const contact = vendor?.contacts[0];
  return (
    <Card title="Warranty" className={PRINT_CARD} actions={<Badge tone={warrantyTone(band)}>{words(band)}</Badge>}>
      {warranty ? (
        <div className="space-y-4">
          <KV
            items={[
              { k: "Status", v: warrantyLeft(warranty.end) },
              { k: "Ends", v: fmtDate(warranty.end) },
              { k: "Started", v: fmtDate(warranty.start) },
              { k: "Coverage", v: warranty.coverage },
              { k: "Vendor", v: vendor ? <Link to={paths.vendor(vendor.id)} className={LINK}>{vendor.name}</Link> : "—" },
              ...(contact ? [{ k: "Contact", v: `${contact.name} · ${contact.phone}` }] : []),
              { k: "Certificate", v: doc ? <Link to={paths.document(doc.id)} className={cn(LINK, "font-mono text-[12px]")}>{doc.docNo}</Link> : "None on file" },
            ]}
          />
          {contact && (
            <Button to={telHref(contact.phone)} variant="ghost" size="sm" className="print:hidden">
              <Phone aria-hidden="true" className="size-4" strokeWidth={2} />
              Call {contact.name}
            </Button>
          )}
        </div>
      ) : (
        <p className="type-small text-muted">No warranty is on record for this asset.</p>
      )}
    </Card>
  );
}

function ComplianceCard({ p }: { p: Passport }) {
  const { compliance: c, standard, waiver, brand } = p;
  const who = brand?.name ?? "This brand";
  const why = standard && (c.tier ? `${who} is ${words(c.tier)} under ${standard.code}.` : `${who} is not on the approved brand list of ${standard.code}.`);
  return (
    <Card title="Compliance" className={PRINT_CARD} actions={<Badge tone={complianceTone(c.status)}>{words(c.status)}</Badge>}>
      {standard ? (
        <div className="space-y-3">
          <KV
            items={[
              {
                k: "Standard",
                v: (
                  <>
                    <Link to={paths.standard(standard.id)} className={cn(LINK, "font-mono text-[12px]")}>{standard.code}</Link>
                    <span className="block font-medium text-ink-soft">{standard.title}</span>
                  </>
                ),
              },
              { k: "Tier", v: c.tier ? <Badge tone={tierTone(c.tier)}>{words(c.tier)}</Badge> : "Brand not listed" },
            ]}
          />
          {(c.status === "deviation" || c.status === "phase-out") && <Notice tone={c.status === "deviation" ? "danger" : "warn"}>{why}</Notice>}
          {waiver && (
            <>
              <Notice tone="info">{waiver.reason}</Notice>
              <KV
                items={[
                  { k: "Waiver", v: `Approved by ${waiver.approvedBy}, ${fmtDate(waiver.approvedAt)}` },
                  { k: "Expires", v: waiver.expiresAt ? fmtDate(waiver.expiresAt) : "No expiry" },
                ]}
              />
            </>
          )}
        </div>
      ) : (
        <p className="type-small text-muted">No design standard governs this equipment type in this tower.</p>
      )}
    </Card>
  );
}

export function OverviewTab({ p, onTab }: { p: Passport; onTab: (tab: TabKey) => void }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px] print:block print:columns-2 print:gap-3">
      <div className="flex min-w-0 flex-col gap-4 print:contents">
        <LocationCard p={p} />
        <ActivityCard p={p} onTab={onTab} />
      </div>
      <div className="flex min-w-0 flex-col gap-4 print:contents">
        <SpecsCard p={p} />
        <WarrantyCard p={p} />
        <ComplianceCard p={p} />
        <QrCard tag={p.asset.tag} />
      </div>
    </div>
  );
}
