import { Ban, CircleCheck, Pause, Play, UserCheck, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import NotFound from "@/app/NotFound";
import { Badge, Breadcrumb, Button, Card, Notice, PageHeader, cn } from "@/components/ui";
import { isOverdueWo } from "@/data/selectors";
import { useDb } from "@/data/store";
import type { WOStatus, WorkOrder } from "@/data/types";
import { fmtDateTime } from "@/lib/dates";
import { paths } from "@/lib/paths";
import { priorityTone, woStatusTone } from "@/lib/status";
import { ActivityCard } from "../components/ActivityCard";
import { ContactCard, FactsCard, InspectionCard, PlanCard, PlaceCard } from "../components/DetailCards";
import { StatusDialog, type DialogTarget } from "../components/StatusDialog";
import {
  ageLine, badgeText, changeStatus, defaultEngineer, dueLine, isFinal, KIND_LABEL, lookup, nextStatuses, STATUS_LABEL, transitionLabel, whereOf,
} from "../lib";

const ICON: Record<WOStatus, LucideIcon> = { open: Play, assigned: UserCheck, "in-progress": Play, "on-hold": Pause, done: CircleCheck, cancelled: Ban };

// The four steps a job normally walks. On hold sits on the in-progress step; cancelled leaves every step unreached.
const STEPS: WOStatus[] = ["open", "assigned", "in-progress", "done"];

function Progress({ status }: { status: WOStatus }) {
  const at = status === "on-hold" ? 2 : STEPS.indexOf(status);
  return (
    <ol aria-label="Progress" className="grid max-w-xl grid-cols-4 gap-2">
      {STEPS.map((step, i) => {
        const current = i === at && status !== "done";
        const reached = i <= at;
        return (
          <li
            key={step}
            aria-current={current ? "step" : undefined}
            className={cn(
              "border-t-4 pt-1.5 text-[10.5px] font-extrabold uppercase tracking-[.08em]",
              !reached ? "border-line text-muted" : current ? (status === "on-hold" ? "border-warn text-ink" : "border-ink text-ink") : "border-ok text-ink-soft",
            )}
          >
            {STATUS_LABEL[step]}
            {current && status === "on-hold" && <span className="sr-only"> (on hold)</span>}
          </li>
        );
      })}
    </ol>
  );
}

function Actions({ wo, onDialog }: { wo: WorkOrder; onDialog: (t: DialogTarget) => void }) {
  const next = nextStatuses(wo.status);
  const forward = next.filter((s) => s !== "cancelled");
  const lead = forward.includes("done") ? "done" : forward[0];
  const ordered = lead ? [lead, ...forward.filter((s) => s !== lead)] : [];
  const go = (to: WOStatus) => (to === "done" ? onDialog("done") : changeStatus(wo.id, to));
  return (
    <>
      {ordered.map((to) => {
        const Icon = ICON[to];
        return (
          <Button key={to} variant={to === lead ? "primary" : "ghost"} onClick={() => go(to)}>
            <Icon aria-hidden="true" className="size-4" strokeWidth={2.5} />
            {transitionLabel(wo.status, to)}
          </Button>
        );
      })}
      {next.includes("cancelled") && (
        <Button variant="ghost" onClick={() => onDialog("cancelled")}>
          <Ban aria-hidden="true" className="size-4" strokeWidth={2.5} />
          {transitionLabel(wo.status, "cancelled")}
        </Button>
      )}
    </>
  );
}

/** /work-orders/:woId. Everything derives from the store row, so a change made here or on the board shows at once. */
export default function WorkOrderDetail() {
  const { woId } = useParams();
  const db = useDb((d) => d);
  const location = useLocation();
  const navigate = useNavigate();
  const [dialog, setDialog] = useState<DialogTarget | null>(null);
  // "Raised" arrives once in the navigation state: keep it for this visit, then drop it from history so reload and Back do not replay it.
  const [createdId] = useState(() => ((location.state as { created?: boolean } | null)?.created === true ? woId : undefined));
  useEffect(() => {
    if ((location.state as { created?: boolean } | null)?.created) navigate(location.pathname + location.search, { replace: true, state: null });
  }, [location, navigate]);

  const wo = lookup(db.workOrders, woId);

  // After a transition the button that was clicked is gone (or the dialog unmounted it), so focus would fall to <body>: hand it to the status badge.
  const statusRef = useRef<HTMLSpanElement>(null);
  const shown = useRef<{ id: string; status: WOStatus } | undefined>(undefined);
  useEffect(() => {
    const prev = shown.current;
    shown.current = wo ? { id: wo.id, status: wo.status } : undefined;
    if (wo && prev?.id === wo.id && prev.status !== wo.status) statusRef.current?.focus();
  });

  if (!wo) return <NotFound what="work order" id={woId} />;

  const now = Date.now();
  const overdue = isOverdueWo(wo, now);
  const { tower, floor, space } = whereOf(db, wo);
  const reporter = db.teamMembers[wo.reportedById];
  const engineer = defaultEngineer(db, wo.towerId);
  const eyebrow = [tower?.name, floor?.label, space?.name].filter(Boolean).join(" · ") || "Work order";

  return (
    <div>
      <Breadcrumb items={[{ to: paths.workOrders(), label: "Work orders" }, { label: wo.number }]} />
      <PageHeader
        eyebrow={eyebrow}
        title={wo.title}
        lede={
          <>
            <span className="font-mono text-[13px]">{wo.number}</span>
            {" · "}
            {ageLine(wo, now)}
          </>
        }
        actions={isFinal(wo.status) ? undefined : <Actions wo={wo} onDialog={setDialog} />}
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span ref={statusRef} tabIndex={-1} className="focus-ring rounded-full">
              <Badge tone={woStatusTone(wo.status, overdue)} dot>{badgeText(wo.status)}</Badge>
            </span>
            <Badge tone={priorityTone(wo.priority)}>{wo.priority}</Badge>
            <Badge>{KIND_LABEL[wo.kind]}</Badge>
            {overdue && <Badge tone="danger">{dueLine(wo, now)}</Badge>}
          </div>
          <Progress status={wo.status} />
        </div>
      </PageHeader>

      <div className="mb-4 space-y-3 empty:hidden">
        {createdId === wo.id && <Notice tone="ok">Work order {wo.number} raised. It is on the board now.</Notice>}
        {wo.status === "done" && wo.completedAt && <Notice tone="ok">Completed {fmtDateTime(wo.completedAt)}.</Notice>}
        {wo.status === "cancelled" && <Notice tone="warn">This work order was cancelled and is closed.</Notice>}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-4">
          <Card title="Description">
            {wo.description.trim() ? (
              <p className="type-body whitespace-pre-line text-ink-soft">{wo.description}</p>
            ) : (
              <p className="type-small text-muted">No description was given.</p>
            )}
            {reporter && <p className="type-small mt-3 text-muted">Reported by {reporter.name}, {reporter.role}.</p>}
          </Card>
          <ActivityCard key={wo.id} wo={wo} actor={engineer?.name} />
        </div>
        <aside className="min-w-0 space-y-4">
          <ContactCard db={db} wo={wo} />
          <PlaceCard db={db} wo={wo} />
          <PlanCard db={db} wo={wo} />
          <InspectionCard db={db} wo={wo} />
          <FactsCard db={db} wo={wo} now={now} overdue={overdue} />
        </aside>
      </div>

      <StatusDialog wo={wo} to={dialog} onClose={() => setDialog(null)} />
    </div>
  );
}
