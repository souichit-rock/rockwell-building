import type { Frequency, ISODate, ISODateTime } from "@/data/types";

const DAY_MS = 86_400_000;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_PER: Record<Exclude<Frequency, "weekly">, number> = { monthly: 1, quarterly: 3, "semi-annual": 6, annual: 12 };

const manilaFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Manila", hourCycle: "h23",
  year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
});

// Calendar fields as seen in Manila. A bare date has no timezone, so it is read as written.
function manila(at: Date | ISODate | ISODateTime) {
  if (typeof at === "string" && at.length === 10) {
    const [y, m, d] = at.split("-");
    return { y, m, d, hh: "00", mm: "00" };
  }
  const p: Record<string, string> = {};
  for (const x of manilaFmt.formatToParts(typeof at === "string" ? new Date(at) : at)) p[x.type] = x.value;
  return { y: p.year, m: p.month, d: p.day, hh: p.hour, mm: p.minute };
}

const dayNum = (iso: ISODate | ISODateTime) => {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return Date.UTC(y, m - 1, d) / DAY_MS;
};
const isoOf = (dayNumber: number): ISODate => new Date(dayNumber * DAY_MS).toISOString().slice(0, 10);

/** Today's calendar date in Asia/Manila, whatever the viewer's timezone. */
export function todayISO(): ISODate {
  const { y, m, d } = manila(new Date());
  return `${y}-${m}-${d}`;
}

export const addDays = (iso: ISODate, n: number): ISODate => isoOf(dayNum(iso) + n);

export const daysFromNow = (n: number): ISODate => addDays(todayISO(), n);

/** Calendar days from `today` (default: Manila today) to `iso`; negative when past. */
export const daysUntil = (iso: ISODate | ISODateTime, today: ISODate = todayISO()): number => dayNum(iso) - dayNum(today);

/** Adds `times` frequency steps (negative steps back). Month steps clamp to the month end (31 Jan + 1 month = 28 Feb). */
export function addFrequency(iso: ISODate, f: Frequency, times = 1): ISODate {
  if (f === "weekly") return addDays(iso, 7 * times);
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const t = y * 12 + (m - 1) + MONTHS_PER[f] * times;
  const ny = Math.floor(t / 12);
  const nm = t % 12;
  const lastDay = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  return isoOf(Date.UTC(ny, nm, Math.min(d, lastDay)) / DAY_MS);
}

/** "14 Mar 2025" */
export function fmtDate(iso: ISODate | ISODateTime): string {
  const { y, m, d } = manila(iso);
  return `${Number(d)} ${MON[Number(m) - 1]} ${y}`;
}

/** "14 Mar 2025 · 09:40" (Manila time) */
export function fmtDateTime(iso: ISODateTime | ISODate): string {
  const { hh, mm } = manila(iso);
  return `${fmtDate(iso)} · ${hh}:${mm}`;
}

/** 6 × 7 grid of ISO dates for a "YYYY-MM" month, Monday first, padded with adjacent-month days. A bad input falls back to the current month. */
export function monthGrid(yyyyMm: string): { month: string; weeks: ISODate[][] } {
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(yyyyMm) ? yyyyMm : todayISO().slice(0, 7);
  const first = `${month}-01`;
  const start = addDays(first, -((new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7));
  const weeks = Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)));
  return { month, weeks };
}
