import type {
  ApprovalTier, AssetStatus, BadgeTone, ComplianceStatus, Condition, DocStatus, DueStatus, HealthScore, InspectionResult,
  PermitStatus, WarrantyBand, WOPriority, WOStatus,
} from "@/data/types";

const CONDITION: Record<Condition, BadgeTone> = { good: "ok", fair: "warn", poor: "danger", unknown: "neutral" };
const ASSET_STATUS: Record<AssetStatus, BadgeTone> = { "in-service": "ok", "under-repair": "warn", standby: "info", decommissioned: "neutral" };
const WO_STATUS: Record<WOStatus, BadgeTone> = {
  done: "ok", open: "warn", assigned: "info", "in-progress": "gold", "on-hold": "neutral", cancelled: "neutral",
};
const PRIORITY: Record<WOPriority, BadgeTone> = { P1: "danger", P2: "warn", P3: "info", P4: "neutral" };
const DUE: Record<DueStatus, BadgeTone> = { "on-track": "ok", due: "warn", overdue: "danger" };
const WARRANTY: Record<WarrantyBand, BadgeTone> = { active: "ok", "365d": "ok", "90d": "warn", "30d": "danger", expired: "danger", none: "neutral" };
const DOC_STATUS: Record<DocStatus, BadgeTone> = { current: "ok", "for-review": "warn", superseded: "neutral" };
const PERMIT: Record<PermitStatus, BadgeTone> = { valid: "ok", due: "warn", expired: "danger" };
const COMPLIANCE: Record<ComplianceStatus, BadgeTone> = {
  compliant: "ok", "phase-out": "warn", deviation: "danger", waived: "info", "no-standard": "neutral",
};
const TIER: Record<ApprovalTier, BadgeTone> = { preferred: "ok", acceptable: "info", "phase-out": "warn", prohibited: "danger" };
const RESULT: Record<InspectionResult, BadgeTone> = { pass: "ok", "pass-with-findings": "warn", fail: "danger" };
const HEALTH: Record<HealthScore["band"], BadgeTone> = { Good: "solid-ok", Watch: "warn", Action: "danger" };

export const conditionTone = (c: Condition): BadgeTone => CONDITION[c];
export const assetStatusTone = (s: AssetStatus): BadgeTone => ASSET_STATUS[s];
// `overdue` comes from isOverdueWo; it turns any non-final status red.
export const woStatusTone = (s: WOStatus, overdue = false): BadgeTone =>
  overdue && s !== "done" && s !== "cancelled" ? "danger" : WO_STATUS[s];
export const priorityTone = (p: WOPriority): BadgeTone => PRIORITY[p];
export const dueTone = (d: DueStatus): BadgeTone => DUE[d];
export const warrantyTone = (b: WarrantyBand): BadgeTone => WARRANTY[b];
export const docStatusTone = (s: DocStatus): BadgeTone => DOC_STATUS[s];
export const permitTone = (s: PermitStatus): BadgeTone => PERMIT[s];
export const complianceTone = (s: ComplianceStatus): BadgeTone => COMPLIANCE[s];
export const tierTone = (t: ApprovalTier): BadgeTone => TIER[t];
export const resultTone = (r: InspectionResult): BadgeTone => RESULT[r];
export const healthTone = (band: HealthScore["band"]): BadgeTone => HEALTH[band];
