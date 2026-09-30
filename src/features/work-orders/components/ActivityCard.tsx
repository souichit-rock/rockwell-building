import { useState, type FormEvent } from "react";
import { Button, Card, Field, Timeline, textareaClass, type TimelineItem } from "@/components/ui";
import type { WOStatus, WorkOrder } from "@/data/types";
import { fmtDateTime } from "@/lib/dates";
import { addNote, STATUS_LABEL } from "../lib";

const TONE: Partial<Record<WOStatus, TimelineItem["tone"]>> = { done: "ok", "on-hold": "warn", cancelled: "danger" };

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
    .map((e) => ({
      when: `${fmtDateTime(e.at)} · ${e.by}`,
      what: e.status ? STATUS_LABEL[e.status] : "Note",
      note: e.note,
      ...(e.status && TONE[e.status] ? { tone: TONE[e.status] } : {}),
    }));
  return (
    <Card title="Timeline">
      {items.length === 0 ? <p className="type-small text-muted">Nothing has been logged yet.</p> : <Timeline items={items} />}
      <NoteForm woId={wo.id} actor={actor} />
    </Card>
  );
}
