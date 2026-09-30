import { Badge } from "@/components/ui";
import type { ApprovalTier } from "@/data/types";
import { tierTone } from "@/lib/status";
import { words } from "../lib";

/** Approval tier, or "Not listed" when no standard names the brand. */
export function TierBadge({ tier }: { tier?: ApprovalTier }) {
  return tier ? <Badge tone={tierTone(tier)}>{words(tier)}</Badge> : <Badge tone="neutral">Not listed</Badge>;
}
