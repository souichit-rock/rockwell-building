/** design-system §4.15. Route-level fallback; there are no skeleton loaders this phase. */
export function Loading({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2.5 py-12 font-semibold text-muted">
      <span aria-hidden="true" className="size-4 animate-spin rounded-full border-[2.5px] border-line-strong border-t-gold" />
      {label}
    </div>
  );
}
