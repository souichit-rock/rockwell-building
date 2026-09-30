import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";

/**
 * A text box whose value lives in the route query. The router applies URL changes in a transition, so a controlled input fed straight
 * from the URL would drop keystrokes; the box keeps a draft and writes it to the query once typing pauses. A change the box did not
 * make (Clear filters, the back button) is adopted back into the draft.
 */
export function useQueryText(key: string, delay = 200): [string, (value: string) => void] {
  const [params, setParams] = useSearchParams();
  const url = params.get(key) ?? "";
  const [draft, setDraft] = useState(url);
  const pushed = useRef(url);

  useEffect(() => {
    if (url !== pushed.current) {
      pushed.current = url;
      setDraft(url);
    }
  }, [url]);

  useEffect(() => {
    if (draft === pushed.current) return;
    const timer = setTimeout(() => {
      pushed.current = draft;
      setParams((p) => {
        const next = new URLSearchParams(p);
        if (draft) next.set(key, draft);
        else next.delete(key);
        return next;
      }, { replace: true });
    }, delay);
    return () => clearTimeout(timer);
  }, [draft, key, delay, setParams]);

  return [draft, setDraft];
}
