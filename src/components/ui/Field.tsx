import { cloneElement, isValidElement, useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "./cn";

// The recipe shared by SearchInput, <input>, <select> and <textarea> (design-system §4.7). Padding and height are added per control.
// 16 px below sm: iOS Safari zooms the page on focus into any control under 16 px and never zooms back. Desktop stays 14 px.
// Focus: the border turns navy (gold is 1.6:1 on white, too weak alone) and the gold halo stays as the house accent.
export const inputBox =
  "w-full rounded-ctl border-[1.5px] border-line-strong bg-surface text-[16px] text-ink outline-none transition-colors placeholder:text-muted focus:border-ink focus:ring-3 focus:ring-gold/40 sm:text-[14px]";

/** For native `<input>`. */
export const inputClass = `${inputBox} h-10 px-3`;
/** For native `<select>`. Keeps the browser's own arrow, so do not add a ChevronDown next to it. */
export const selectClass = `${inputBox} h-10 px-3 pr-9`;
/** For native `<textarea>`. */
export const textareaClass = `${inputBox} min-h-[110px] resize-y px-3 py-3`;

type Control = { id?: string; "aria-describedby"?: string; "aria-invalid"?: boolean };

/**
 * design-system §4.7. `children` is the control. When it is a single native element (input / select / textarea) and
 * `htmlFor` is not given, Field ties the label, hint and error to it through generated ids.
 *
 * An error is announced (role="alert"), and when it appears the first invalid Field in its form or dialog takes focus, so a failed
 * submit lands on the problem. Focus is not taken while the user is typing in some other control (live validation), and
 * `autoFocusOnError={false}` opts a Field out.
 */
export function Field({ label, hint, error, htmlFor, className, autoFocusOnError = true, children }: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  className?: string;
  autoFocusOnError?: boolean;
  children: ReactNode;
}) {
  const auto = useId();
  const box = useRef<HTMLDivElement>(null);
  const seen = useRef(error);
  const note = error ?? hint;
  let id = htmlFor;
  let control = children;
  if (!htmlFor && isValidElement<Control>(children) && typeof children.type === "string") {
    id = children.props.id ?? auto;
    control = cloneElement(children, {
      id,
      "aria-describedby": note ? `${id}-note` : children.props["aria-describedby"],
      "aria-invalid": error ? true : children.props["aria-invalid"],
    });
  }

  useEffect(() => {
    const changed = seen.current !== error;
    seen.current = error;
    const me = box.current;
    if (!error || !changed || !autoFocusOnError || !me) return;
    const scope = me.closest("form, dialog, [role=dialog]") ?? document;
    if (scope.querySelector("[data-invalid]") !== me) return; // an earlier invalid Field takes the focus
    const target = id ? document.getElementById(id) : null;
    const active = document.activeElement;
    if (!target || (active !== target && active?.matches("input, select, textarea") && scope.contains(active))) return;
    target.focus();
  }, [error, autoFocusOnError, id]);

  return (
    <div ref={box} data-invalid={error ? "" : undefined} className={className}>
      <label htmlFor={id} className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-[.12em] text-muted">{label}</label>
      {control}
      {note && (
        // key: hint to error remounts the <p>, so the alert is inserted (and read out) rather than merely restyled
        <p
          key={error ? "error" : "hint"}
          id={id ? `${id}-note` : undefined}
          role={error ? "alert" : undefined}
          className={cn("mt-1.5 text-xs font-medium", error ? "text-danger" : "text-muted")}
        >
          {note}
        </p>
      )}
    </div>
  );
}
