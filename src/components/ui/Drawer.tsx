import { useId } from "react";
import { DialogFrame, useDialog, type DialogProps } from "./Modal";

/** Right-hand quick-view panel (asset / document). Same contract as Modal. */
export function Drawer({ open, onClose, title, footer, children }: DialogProps) {
  const titleId = useId();
  const { ref, handlers } = useDialog(open, onClose);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      {...handlers}
      className="m-0 ml-auto h-dvh max-h-dvh w-[min(480px,100vw)] max-w-none overflow-hidden rounded-none border-l border-line bg-surface p-0 text-ink shadow-pop transition-transform duration-200 backdrop:bg-navy-deep/60 starting:open:translate-x-full"
    >
      {open && (
        <DialogFrame title={title} titleId={titleId} onClose={onClose} footer={footer} className="h-full">
          {children}
        </DialogFrame>
      )}
    </dialog>
  );
}
