/**
 * Scrolls the nearest horizontal scroller (a tab list or chip row) just far enough to show `el` in full, with an 8 px margin.
 * Sideways only: element.scrollIntoView would also scroll the page vertically, which on mount would make the page jump.
 */
export function revealInRow(el: Element | null | undefined): void {
  const row = el?.closest<HTMLElement>('[class~="overflow-x-auto"]');
  if (!el || !row) return;
  const r = row.getBoundingClientRect();
  const b = el.getBoundingClientRect();
  if (b.left < r.left) row.scrollLeft -= r.left - b.left + 8;
  else if (b.right > r.right) row.scrollLeft += b.right - r.right + 8;
}
