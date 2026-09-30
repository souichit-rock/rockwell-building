import { useState, type FormEvent } from "react";
import { Button, Card, Field, Timeline, textareaClass, type TimelineItem } from "@/components/ui";
import type { WOStatus, WorkOrder } from "@/data/types";
import { fmtDateTime } from "@/lib/dates";
import { woStatusTone } from "@/lib/status";
import { addNote, STATUS_LABEL } from "../lib";

// Dots follow the status badge tones (lib/status); a status whose badge is neutral or gold keeps the timeline's default gold dot.
const DOT_TONES = ["ok", "warn", "danger", "info"] as const;
const dotTone = (s: WOStatus) => DOT_TONES.find((t) => t === woStatusTone(s));

function NoteForm({ woId, actor }: { woId: string; actor: string | undefined }) {
  const [text, setText] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    addNote(woId, text);
    setText("");
  };
  return (
    <form onSubmit={submit} className="mt-5 border-t border-line pt-4">
      <Field label="Add a note" hint={actor ? `Logged as ${actor}, the tower's Building Engineer.` : undefined}>
        <textarea className={textareaClass} value={text} onChange={(e) => setText(e.target.value)} placeholder="An update, a finding, or a hand-over detail." />
      </Field>
      <div className="mt-3 flex justify-end">
        <Button type="submit" variant="navy" disabled={!text.trim()}>Add note</Button>
      </div>
    </form>
  );
}

/** Every event on the work order, oldest first, then the add-note form (notes are allowed in any status). */
export function ActivityCard({ wo, actor }: { wo: WorkOrder; actor: string | undefined }) {
  const items: TimelineItem[] = [...wo.timeline]
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
    .map((e) => {
      const tone = e.status ? dotTone(e.status) : undefined;
      return {
        when: `${fmtDateTime(e.at)} · ${e.by}`,
        what: e.status ? STATUS_LABEL[e.status] : "Note",
        note: e.note,
        ...(tone ? { tone } : {}),
      };
    });
  return (
    <Card title="Timeline">
      {items.length === 0 ? <p className="type-small text-muted">Nothing has been logged yet.</p> : <Timeline items={items} />}
      <NoteForm woId={wo.id} actor={actor} />
    </Card>
  );
}
