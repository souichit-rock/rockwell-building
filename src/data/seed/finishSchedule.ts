import type { FinishScheduleEntry, SpaceKind, Surface } from "@/data/types";

// 46 portfolio rows (no towerId) followed by 6 tower overrides. Finish ids are the lower-cased finish codes.
type Row = [SpaceKind, Surface, string];
const PORTFOLIO: Row[] = [
  ["lobby", "floor", "fl-01"], ["lobby", "wall", "wl-01"], ["lobby", "ceiling", "cl-01"], ["lobby", "hardware", "hw-01"], ["lobby", "lighting", "lt-02"],
  ["lift-lobby", "floor", "fl-01"], ["lift-lobby", "wall", "wl-01"], ["lift-lobby", "ceiling", "cl-01"], ["lift-lobby", "lighting", "lt-02"],
  ["corridor", "floor", "fl-02"], ["corridor", "wall", "wl-02"], ["corridor", "ceiling", "cl-02"], ["corridor", "door", "dr-02"],
  ["corridor", "hardware", "hw-02"], ["corridor", "paint", "pt-01"], ["corridor", "lighting", "lt-01"],
  ["unit", "floor", "fl-03"], ["unit", "wall", "wl-03"], ["unit", "door", "dr-01"], ["unit", "hardware", "hw-01"],
  ["office", "floor", "fl-02"], ["office", "wall", "wl-03"], ["office", "ceiling", "cl-02"], ["office", "door", "dr-01"], ["office", "lighting", "lt-01"],
  ["amenity", "floor", "fl-03"], ["amenity", "ceiling", "cl-01"], ["amenity", "lighting", "lt-02"],
  ["toilet", "floor", "fl-03"], ["toilet", "wall", "wl-03"], ["toilet", "sanitary", "sn-01"], ["toilet", "lighting", "lt-01"],
  ["genset-room", "floor", "fl-04"], ["genset-room", "wall", "wl-04"], ["genset-room", "paint", "pt-02"], ["genset-room", "door", "dr-02"], ["genset-room", "lighting", "lt-03"],
  ["lv-room", "floor", "fl-04"], ["lv-room", "wall", "wl-04"], ["lv-room", "door", "dr-02"], ["lv-room", "lighting", "lt-03"],
  ["pump-room", "floor", "fl-04"], ["pump-room", "wall", "wl-04"], ["pump-room", "lighting", "lt-03"],
  ["parking", "floor", "fl-05"], ["parking", "lighting", "lt-03"],
];

type Override = [SpaceKind, Surface, string, string, string];
const OVERRIDES: Override[] = [
  ["lobby", "floor", "fl-06", "eds", "Grigio stone specified by the tower design team; pending standards review."],
  ["corridor", "lighting", "lt-02", "grb", "Pendant fittings used in the corridor instead of downlights."],
  ["office", "ceiling", "cl-03", "8rw", "Open ceiling to expose services on office floors."],
  ["unit", "door", "dr-01", "prl", "Matches the portfolio standard."],
  ["corridor", "floor", "fl-02", "eds", "Matches the portfolio standard."],
  ["unit", "wall", "wl-03", "grb", "Matches the portfolio standard."],
];

export const FINISH_SCHEDULE: FinishScheduleEntry[] = [
  ...PORTFOLIO.map(([spaceKind, surface, finishId], i): FinishScheduleEntry => ({ id: `fs-${i + 1}`, spaceKind, surface, finishId })),
  ...OVERRIDES.map(([spaceKind, surface, finishId, towerId, note], i): FinishScheduleEntry => ({
    id: `fs-${PORTFOLIO.length + i + 1}`, spaceKind, surface, finishId, towerId, note,
  })),
];
