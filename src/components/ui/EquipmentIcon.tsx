import {
  ArrowUpDown, BatteryCharging, Box, Building, Cable, Camera, Car, Cpu, Droplets, Fan, Flame, Fuel, Gauge, KeyRound, PlugZap,
  Radio, Server, ShieldCheck, Siren, Snowflake, Thermometer, Umbrella, Waves, Wind, Zap, type LucideIcon,
} from "lucide-react";
import type { EquipmentIconName } from "@/data/types";

// A fixed map, never `import { icons }` (that pulls the whole set into the bundle). Record<EquipmentIconName, …> makes tsc
// enforce that the keys are exactly the names in types.ts.
export const EQUIPMENT_ICONS: Record<EquipmentIconName, LucideIcon> = {
  Zap, Fuel, BatteryCharging, PlugZap, Cable, Wind, Fan, Snowflake, Thermometer, Droplets, Waves,
  Flame, Siren, ShieldCheck, Camera, KeyRound, Radio, Server, Cpu, ArrowUpDown, Building, Umbrella, Car, Gauge, Box,
};

/** design-system §4.15. An unknown name (stale data) falls back to Box. */
export function EquipmentIcon({ name, className }: { name: EquipmentIconName; className?: string }) {
  const Icon = EQUIPMENT_ICONS[name] ?? Box;
  return <Icon aria-hidden="true" className={className ?? "size-5"} strokeWidth={2} />;
}
