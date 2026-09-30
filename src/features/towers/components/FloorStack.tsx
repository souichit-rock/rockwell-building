import { ArrowRight, Layers } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { FloorPlanSvg } from "@/components/plan/FloorPlanSvg";
import { Button, Card, Chip, EmptyState, cn } from "@/components/ui";
import { PLAN_TEMPLATES } from "@/data/seed/plans";
import { pinsForFloor } from "@/data/selectors";
import type { Db, DisciplineCode, Floor, Id, Tone } from "@/data/types";
import { plural } from "@/lib/format";
import { paths } from "@/lib/paths";
import { FLOOR_KIND_LABEL } from "../lib";

// literal class names so Tailwind can see them; same discipline tones as the plan pins
const DOT: Record<Tone, string> = {
  navy: "bg-navy", gold: "bg-gold", info: "bg-info", ok: "bg-ok", warn: "bg-warn", danger: "bg-danger", muted: "bg-muted", "ink-soft": "bg-ink-soft",
};

/**
 * Roof-to-basement list of floor pills with asset counts; the selected floor (`?floor=`, default the lowest basement, where the plant is)
 * shows a compact plan beside it. Pins come from pinsForFloor, so they agree with every other plan in the app.
 */
export function FloorStack({ db, towerId, floors, counts }: { db: Db; towerId: Id; floors: Floor[]; counts: Map<Id, number> }) {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const listRef = useRef<HTMLUListElement>(null);
  const selected = floors.find((f) => f.id === params.get("floor")) ?? floors[floors.length - 1];
  const selectedId = selected?.id;

  const select = (id: Id) =>
    setParams((p) => {
      const next = new URLSearchParams(p);
      next.set("floor", id);
      return next;
    }, { replace: true });

  // Centre the selected pill inside the list only. scrollIntoView would also drag the whole page down to the card.
  useEffect(() => {
    const list = listRef.current;
    const pill = list?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!list || !pill) return;
    list.scrollTop = pill.offsetTop - list.clientHeight / 2 + pill.offsetHeight / 2;
    list.scrollLeft = pill.offsetLeft - list.clientWidth / 2 + pill.offsetWidth / 2;
  }, [selectedId]);

  const plan = useMemo(() => {
    if (!selectedId) return null;
    const pins = pinsForFloor(db, selectedId);
    const byDiscipline = new Map<DisciplineCode, number>();
    for (const p of pins) byDiscipline.set(p.disciplineId, (byDiscipline.get(p.disciplineId) ?? 0) + 1);
    const legend = [...byDiscipline]
      .flatMap(([id, n]) => (db.disciplines[id] ? [{ d: db.disciplines[id], n }] : []))
      .sort((a, b) => a.d.order - b.d.order);
    return { pins, legend, spaces: Object.values(db.spaces).filter((s) => s.floorId === selectedId) };
  }, [db, selectedId]);

  if (!selected || !plan) {
    return (
      <Card title="Floor stack">
        <EmptyState icon={Layers} title="No floors" body="This tower has no levels on record." />
      </Card>
    );
  }

  const template = PLAN_TEMPLATES[selected.templateId];
  const assetCount = counts.get(selected.id) ?? 0;

  return (
    <Card title="Floor stack" actions={<span className="type-small text-muted">{plural(floors.length, "level")}</span>}>
      {/* Container query, not a viewport breakpoint: beside the 340 px aside this card can be narrower than a plan needs, so the pills
          lie in a row above the plan until the card itself is wide enough for the vertical stack. */}
      <div className="@container">
        <div className="grid gap-4 @lg:grid-cols-[136px_minmax(0,1fr)]">
          <ul
            ref={listRef}
            aria-label="Floors, roof to lowest basement"
            className="relative flex gap-2 overflow-x-auto p-1 [scrollbar-width:none] @lg:max-h-[26rem] @lg:flex-col @lg:overflow-x-hidden @lg:overflow-y-auto"
          >
            {floors.map((f) => (
              <li key={f.id} className="shrink-0">
                <Chip label={f.label} count={counts.get(f.id) ?? 0} active={f.id === selected.id} onClick={() => select(f.id)} className="@lg:w-full @lg:justify-between" />
              </li>
            ))}
          </ul>

          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <div className="min-w-0">
                <p className="text-[14px] font-bold text-ink">
                  {selected.label} <span className="font-medium text-ink-soft">· {FLOOR_KIND_LABEL[selected.kind]}</span>
                </p>
                <p className="type-small text-muted">{plural(assetCount, "asset")} · {plural(template.rooms.length, "room")}</p>
              </div>
              <Button to={paths.floor(towerId, selected.id)} variant="ghost" size="sm">
                Open plan
                <ArrowRight aria-hidden="true" className="size-4" strokeWidth={2} />
              </Button>
            </div>
            <FloorPlanSvg compact template={template} spaces={plan.spaces} pins={plan.pins} onPinClick={(assetId) => navigate(paths.asset(assetId))} />
            {plan.legend.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5" aria-label="Assets on this floor by discipline">
                {plan.legend.map(({ d, n }) => (
                  <li key={d.id} className="flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
                    <span aria-hidden="true" className={cn("size-2.5 rounded-full", DOT[d.tone])} />
                    {d.name}
                    <span className="tabular-nums text-muted">{n}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="type-small mt-3 text-muted">No equipment is registered on this floor.</p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
