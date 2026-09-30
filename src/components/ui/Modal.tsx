import { X } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useRef, type MouseEvent, type ReactNode, type SyntheticEvent } from "react";
import { Button } from "./Button";
import { cn } from "./cn";

export type DialogProps = { open: boolean; onClose: () => void; title: string; footer?: ReactNode; children?: ReactNode };

/**
 * Shared by Modal and Drawer. The dialog is controlled: `open` drives showModal() / close(), and Escape, the backdrop and
 * the native close event all go through `onClose`, so the parent decides. showModal() gives focus containment and Escape
 * for free. The page behind does not scroll while a dialog is open.
 */
export function useDialog(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDialogElement>(null);
  const pressedBackdrop = useRef(false);

  // layout effect: the content unmounts with `open`, so the dialog must close before the browser paints an empty box
  useLayoutEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = before;
    };
  }, [open]);

  const handlers = {
    onCancel: (e: SyntheticEvent<HTMLDialogElement>) => {
      e.preventDefault();
      onClose();
    },
    // only while still open: this is the path where Chrome closes on a second Escape and cancel cannot be prevented
    onClose: () => {
      if (open) onClose();
    },
    // a drag that starts inside the panel and ends on the backdrop is not a backdrop click
    onMouseDown: (e: MouseEvent<HTMLDialogElement>) => {
      pressedBackdrop.current = e.target === e.currentTarget;
    },
    onClick: (e: MouseEvent<HTMLDialogElement>) => {
      if (pressedBackdrop.current && e.target === e.currentTarget) onClose();
      pressedBackdrop.current = false;
    },
  };
  return { ref, handlers };
}

/** design-system §4.11 shared body: header (title + close), scrolling body, optional footer. */
export function DialogFrame({ title, titleId, onClose, footer, className, children }: {
  title: string;
  titleId: string;
  onClose: () => void;
  footer?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
        <h2 id={titleId} className="type-title min-w-0 text-ink">{title}</h2>
        <Button variant="ghost" size="sm" icon aria-label="Close" onClick={onClose}>
          <X className="size-4" strokeWidth={2} />
        </Button>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">{children}</div>
      {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-4">{footer}</div>}
    </div>
  );
}

/** Centred dialog. Children are mounted only while open, so a form inside starts fresh every time. */
export function Modal({ open, onClose, title, footer, children }: DialogProps) {
  const titleId = useId();
  const { ref, handlers } = useDialog(open, onClose);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      {...handlers}
      className="m-auto w-[min(560px,calc(100vw-32px))] max-w-none overflow-hidden rounded-lg border border-line bg-surface p-0 text-ink shadow-pop transition-opacity duration-150 backdrop:bg-navy-deep/60 backdrop:backdrop-blur-[2px] starting:open:opacity-0"
    >
      {open && (
        <DialogFrame title={title} titleId={titleId} onClose={onClose} footer={footer} className="max-h-[calc(100dvh-32px)]">
          {children}
        </DialogFrame>
      )}
    </dialog>
  );
}
