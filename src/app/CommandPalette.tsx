import { CornerDownLeft, Search } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router";
import { useDb } from "@/data/store";
import type { SearchHit } from "@/data/types";
import { buildIndex, search } from "@/lib/search";
import { cn } from "@/components/ui";

// Identifiers read as data, so they get the mono treatment (design-system §0.5); names stay in Montserrat.
const MONO_KINDS = new Set(["Asset", "Work order", "Document", "Standard", "Model", "Permit"]);

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  // Global Ctrl/Cmd-K toggles the palette from anywhere, including while a form field has focus.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  // Layout effect: the dialog opens / closes in the same commit that mounts / unmounts its body, so there is never an empty frame.
  useLayoutEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label="Search"
      // Escape: let state close the dialog (the layout effect above) so React and the DOM cannot disagree; onClose covers any other native close.
      onCancel={(e) => {
        e.preventDefault();
        onOpenChange(false);
      }}
      onClose={() => onOpenChange(false)}
      onClick={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false); // backdrop
      }}
      className="mx-auto mt-[10vh] mb-auto max-h-[min(72dvh,600px)] w-[min(640px,calc(100vw-32px))] flex-col overflow-hidden rounded-lg border border-line bg-surface p-0 text-ink shadow-pop backdrop:bg-navy-deep/60 backdrop:backdrop-blur-[2px] open:flex"
    >
      {open && <PaletteBody onDone={() => onOpenChange(false)} />}
    </dialog>
  );
}

function PaletteBody({ onDone }: { onDone: () => void }) {
  const navigate = useNavigate();
  const db = useDb((d) => d);
  const index = useMemo(() => buildIndex(db), [db]);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const results = useMemo(() => search(index, query), [index, query]);
  // Grouped by kind in order of first appearance, so the best match's kind leads; arrows walk the flat, displayed order.
  const groups = useMemo(() => {
    const byKind = new Map<string, SearchHit[]>();
    for (const hit of results) {
      const list = byKind.get(hit.kind);
      if (list) list.push(hit);
      else byKind.set(hit.kind, [hit]);
    }
    return [...byKind];
  }, [results]);
  const flat = useMemo(() => groups.flatMap(([, hits]) => hits), [groups]);
  const current = Math.min(active, Math.max(flat.length - 1, 0));

  useEffect(() => {
    document.getElementById(`palette-opt-${current}`)?.scrollIntoView({ block: "nearest" });
  }, [current]);

  const go = (hit: SearchHit) => {
    navigate(hit.href);
    onDone();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(flat.length ? (current + 1) % flat.length : 0);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(flat.length ? (current - 1 + flat.length) % flat.length : 0);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hit = flat[current];
      if (hit) go(hit);
    }
  };

  const trimmed = query.trim();
  let position = -1;

  return (
    <>
      <div className="flex shrink-0 items-center gap-3 border-b border-line px-4">
        <Search className="size-5 shrink-0 text-muted" strokeWidth={2} />
        <input
          type="text"
          role="combobox"
          aria-expanded={flat.length > 0}
          aria-controls="palette-list"
          aria-activedescendant={flat.length ? `palette-opt-${current}` : undefined}
          aria-label="Search towers, assets, documents and more"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="Search towers, assets, tags, documents, work orders…"
          className="h-14 min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-muted sm:text-[15px]"
        />
        <kbd className="hidden shrink-0 rounded-md border border-line-strong px-1.5 py-0.5 font-sans text-[10px] font-bold uppercase tracking-[.08em] text-muted sm:block">Esc</kbd>
      </div>

      <div id="palette-list" role="listbox" aria-label="Search results" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
        {!trimmed && (
          <p className="type-small px-3 py-8 text-center text-muted">
            Type a tag, document number, work order, brand or room. For example EDS-B3-FP-01 or Kestrel.
          </p>
        )}
        {trimmed && flat.length === 0 && <p className="type-small px-3 py-8 text-center text-muted">{`Nothing matches "${trimmed}".`}</p>}
        {groups.map(([kind, hits]) => (
          <div key={kind} role="group" aria-label={kind} className="mb-1 last:mb-0">
            <p aria-hidden="true" className="type-eyebrow px-3 pb-1 pt-2">{kind}</p>
            {hits.map((hit) => {
              position += 1;
              const i = position;
              const on = i === current;
              return (
                <div
                  key={`${hit.kind}:${hit.id}`}
                  id={`palette-opt-${i}`}
                  role="option"
                  aria-selected={on}
                  onMouseMove={() => setActive(i)}
                  onClick={() => go(hit)}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-ctl px-3 py-2 transition-colors duration-150",
                    on ? "bg-surface-2 ring-[1.5px] ring-inset ring-gold" : "",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className={cn("truncate font-bold text-ink", MONO_KINDS.has(hit.kind) ? "font-mono text-[12px]" : "text-[14px]")}>{hit.title}</p>
                    <p className="truncate text-xs text-ink-soft">{hit.subtitle}</p>
                  </div>
                  {on && <CornerDownLeft className="size-4 shrink-0 text-muted" strokeWidth={2} />}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <p className="shrink-0 border-t border-line px-4 py-2 text-[11px] font-medium text-muted">
        {index.length.toLocaleString("en-PH")} records indexed
        <span className="hidden sm:inline"> · Up and Down to move · Enter to open · Esc to close</span>
      </p>
    </>
  );
}
