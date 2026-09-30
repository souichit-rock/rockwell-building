import { useEffect, useRef, useState } from "react";
import { SearchInput } from "@/components/ui";

/**
 * SearchInput bound to one query value. The route query stays the only source of truth; `draft` is just the input's typing
 * buffer (the router applies location changes as a transition, which would otherwise drop keystrokes and move the caret).
 * The query is written 150 ms after the last keystroke, and an outside change (Clear filters, Back) replaces the draft.
 */
export function QuerySearch({ value, onCommit, placeholder, className }: {
  value: string;
  onCommit: (value: string) => void;
  placeholder: string;
  className?: string;
}) {
  const [draft, setDraft] = useState(value);
  const sent = useRef(value);
  const timer = useRef<number | undefined>(undefined);
  const latest = useRef(onCommit); // the timer must call the newest handler, which closes over the newest query

  useEffect(() => {
    if (value !== sent.current) {
      sent.current = value;
      setDraft(value);
    }
  }, [value]);
  useEffect(() => {
    latest.current = onCommit;
  });
  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <SearchInput
      className={className}
      placeholder={placeholder}
      value={draft}
      onChange={(next) => {
        setDraft(next);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => {
          sent.current = next;
          latest.current(next);
        }, 150);
      }}
    />
  );
}
