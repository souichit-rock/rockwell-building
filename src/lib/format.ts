// Number formatting is en-PH (design-system §0.9). No currency: no money field exists this phase.

const formatters = new Map<number | undefined, Intl.NumberFormat>();

/** "1,250". `maxFractionDigits` caps the decimals (default: Intl's, i.e. up to 3). Non-finite input renders as an em dash. */
export function fmtNumber(n: number, maxFractionDigits?: number): string {
  if (!Number.isFinite(n)) return "—";
  let f = formatters.get(maxFractionDigits);
  if (!f) {
    f = new Intl.NumberFormat("en-PH", maxFractionDigits == null ? undefined : { maximumFractionDigits: maxFractionDigits });
    formatters.set(maxFractionDigits, f);
  }
  return f.format(n);
}

/** "62,000 m²" */
export const fmtSqm = (n: number): string => `${fmtNumber(n)} m²`;

/** Monogram letters: first letter of the first two words, upper-cased ("Norvik Power Philippines" → "NP", "Voltara" → "V"). */
export function initials(name: string): string {
  const words = name.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  return words.slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

const pluralOf = (w: string): string =>
  /[^aeiou]y$/i.test(w) ? `${w.slice(0, -1)}ies` : /(s|x|z|ch|sh)$/i.test(w) ? `${w}es` : `${w}s`;

/** Count plus noun, "1 asset" / "3 assets" / "2 warranties" (the count goes through fmtNumber). Pass `pluralForm` for irregulars. */
export function plural(n: number, word: string, pluralForm?: string): string {
  return `${fmtNumber(n)} ${n === 1 ? word : (pluralForm ?? pluralOf(word))}`;
}
