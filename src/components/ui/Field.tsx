import { cloneElement, isValidElement, useId, type ReactNode } from "react";
import { cn } from "./cn";

// The recipe shared by SearchInput, <input>, <select> and <textarea> (design-system §4.7). Padding and height are added per control.
export const inputBox =
  "w-full rounded-ctl border-[1.5px] border-line-strong bg-surface text-[14px] text-ink outline-none transition-colors placeholder:text-muted focus:border-gold focus:ring-3 focus:ring-gold/25";

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
 */
export function Field({ label, hint, error, htmlFor, className, children }: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
}) {
  const auto = useId();
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
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-[.12em] text-muted">{label}</label>
      {control}
      {note && <p id={id ? `${id}-note` : undefined} className={cn("mt-1.5 text-xs font-medium", error ? "text-danger" : "text-muted")}>{note}</p>}
    </div>
  );
}
