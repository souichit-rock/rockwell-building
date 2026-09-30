// Seeded PRNG (mulberry32) plus tiny helpers. Every generated value in the seed flows through one instance so the output is deterministic.
export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer in [lo, hi] inclusive. */
export const rint = (r: Rng, lo: number, hi: number): number => lo + Math.floor(r() * (hi - lo + 1));
export const pick = <T>(r: Rng, items: readonly T[]): T => items[Math.floor(r() * items.length)];
export const chance = (r: Rng, p: number): boolean => r() < p;
/** In-place Fisher-Yates; returns the same array. */
export function shuffle<T>(r: Rng, items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}
export const digits = (r: Rng, n: number): string => Array.from({ length: n }, () => Math.floor(r() * 10)).join("");
export const round1 = (n: number): number => Math.round(n * 10) / 10;
export const slug = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
