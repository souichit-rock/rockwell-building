// src/data/types.ts — FROZEN at fan-out. Feature agents never edit this file; derive locally instead.
export type Id = string;
export type ISODate = string;      // "2026-09-29"
export type ISODateTime = string;  // "2026-09-29T09:40:00+08:00"

export type TeamName = "Property Management" | "Engineering" | "Design & Technical" | "Security" | "Housekeeping";
export type DisciplineCode = "ELEC" | "HVAC" | "PLUMB" | "FIRE" | "ELV" | "VT" | "ARCH" | "STRUCT";
export type Tone = "navy" | "gold" | "info" | "ok" | "warn" | "danger" | "muted" | "ink-soft";
export type Criticality = "A" | "B" | "C";
export type Frequency = "weekly" | "monthly" | "quarterly" | "semi-annual" | "annual";
export type TowerUse = "residential" | "office";
export type FloorKind = "basement-plant" | "basement-parking" | "ground" | "podium" | "typical" | "roof";
export type PlanTemplateId = "basement-plant" | "basement-parking" | "ground" | "podium" | "typical-res" | "typical-office" | "roof";
// lucide-react export names; the keys of EQUIPMENT_ICONS in src/components/ui/EquipmentIcon.tsx. tsc enforces membership, so no runtime check.
export type EquipmentIconName =
  | "Zap" | "Fuel" | "BatteryCharging" | "PlugZap" | "Cable" | "Wind" | "Fan" | "Snowflake" | "Thermometer" | "Droplets" | "Waves"
  | "Flame" | "Siren" | "ShieldCheck" | "Camera" | "KeyRound" | "Radio" | "Server" | "Cpu" | "ArrowUpDown" | "Building" | "Umbrella" | "Car" | "Gauge" | "Box";
export type SpaceKind =
  | "genset-room" | "transformer-vault" | "lv-room" | "pump-room" | "fire-pump-room" | "stp" | "chiller-plant"
  | "ahu-room" | "elevator-machine-room" | "tank-deck" | "bms-room" | "fcc" | "mdf" | "riser" | "refuse"
  | "lift-lobby" | "stair" | "corridor" | "lobby" | "unit" | "office" | "retail" | "amenity" | "pool" | "toilet"
  | "parking" | "roof-deck";

export interface Rect { x: number; y: number; w: number; h: number }
export interface Point { x: number; y: number }

export interface Tower {
  id: Id; code: string; name: string; estate: string; address: string; use: TowerUse;
  floorsAbove: number; floorsBelow: number; gfaSqm: number; turnoverYear: number;
  propertyManagerId: Id; pmoPhone: string; pmoEmail: string;
}
export interface Floor { id: Id; towerId: Id; level: number; label: string; kind: FloorKind; templateId: PlanTemplateId }
export interface PlanRoom { code: string; name: string; kind: SpaceKind; x: number; y: number; w: number; h: number }
export interface PlanTemplate { id: PlanTemplateId; rooms: PlanRoom[] }   // viewBox 0 0 100 62.5
export interface Space { id: Id; towerId: Id; floorId: Id; code: string; name: string; kind: SpaceKind; rect: Rect; areaSqm: number }

export interface Discipline { id: DisciplineCode; name: string; tone: Tone; order: number }
export interface PmTask { task: string; frequency: Frequency; checklist: string[] }
export interface EquipmentType {
  id: Id; disciplineId: DisciplineCode; name: string; tagPrefix: string; icon: EquipmentIconName;
  defaultCriticality: Criticality; expectedLifeYears: number; pmTasks: PmTask[];
}
export interface Brand { id: Id; name: string; country: string; disciplineIds: DisciplineCode[]; note?: string }
export interface Model {
  id: Id; brandId: Id; equipmentTypeId: Id; modelNo: string; specs: Record<string, string>;
  defaultWarrantyMonths: number; discontinued: boolean; successorModelId?: Id;
}

export type AssetStatus = "in-service" | "standby" | "under-repair" | "decommissioned";
export type Condition = "good" | "fair" | "poor" | "unknown";
export interface Asset {
  id: Id; tag: string; towerId: Id; floorId: Id; spaceId: Id; equipmentTypeId: Id; modelId: Id;
  serial: string; rating: string; installDate: ISODate; commissionDate: ISODate;
  status: AssetStatus; condition: Condition; criticality: Criticality;
  pin?: Point; parentAssetId?: Id; installerVendorId: Id; serviceVendorId?: Id; notes: string;
}
export interface Warranty { id: Id; assetId: Id; vendorId: Id; start: ISODate; end: ISODate; coverage: string; docId?: Id }

export type DocType = "as-built" | "shop-drawing" | "om-manual" | "datasheet" | "tc-report" | "permit" | "warranty-cert" | "finish-schedule" | "inspection-report" | "contract";
export type DocStatus = "current" | "superseded" | "for-review";
export type LinkKind = "tower" | "floor" | "space" | "asset" | "model" | "standard" | "permit" | "vendor";
export type LinkRelation = "governs" | "references" | "certifies";
export interface DocRevision { rev: string; date: ISODate; issuedBy: string; reason: string }
export interface DocLink { kind: LinkKind; id: Id; relation: LinkRelation }
export interface Document {
  id: Id; docNo: string; title: string; type: DocType; disciplineId: DisciplineCode;
  towerId?: Id; floorId?: Id; revisions: DocRevision[]; status: DocStatus; supersededById?: Id;
  links: DocLink[]; fileName: string; fileSizeKb: number; pages: number;
}

export type PermitType = "occupancy" | "fsic" | "electrical" | "mechanical" | "elevator" | "genset-ecc" | "water-discharge" | "sanitary";
export interface Permit { id: Id; towerId: Id; type: PermitType; number: string; issuer: string; issuedDate: ISODate; expiryDate: ISODate; docId?: Id }

export type ApprovalTier = "preferred" | "acceptable" | "phase-out" | "prohibited";
export interface BrandApproval { brandId: Id; tier: ApprovalTier; note?: string }
export interface Standard {
  id: Id; code: string; title: string; disciplineId: DisciplineCode; equipmentTypeIds: Id[];
  clauses: string[]; approvals: BrandApproval[]; appliesToTowerIds: Id[];   // [] = whole portfolio
  revision: string; effectiveDate: ISODate; ownerTeam: TeamName;
}
export type FinishCategory = "floor" | "wall" | "ceiling" | "door" | "hardware" | "paint" | "sanitary" | "lighting";
export type Surface = FinishCategory;
export interface Finish { id: Id; code: string; name: string; category: FinishCategory; brandId?: Id; product: string; swatch: string; supplierVendorId?: Id }
export interface FinishScheduleEntry { id: Id; spaceKind: SpaceKind; surface: Surface; finishId: Id; towerId?: Id; note?: string }  // towerId absent = portfolio standard
export interface Waiver { id: Id; towerId: Id; assetId: Id; standardId: Id; reason: string; approvedBy: string; approvedAt: ISODate; expiresAt?: ISODate }

export type VendorKind = "manufacturer-rep" | "contractor" | "service-provider" | "supplier";
export interface Contact { name: string; role: string; phone: string; email: string }
export interface Contract { ref: string; start: ISODate; end: ISODate; slaResponseHours: number; scope: string }
export interface Vendor {
  id: Id; name: string; kind: VendorKind; disciplineIds: DisciplineCode[]; brandIds: Id[];
  contacts: Contact[]; contract?: Contract; accreditationExpiry?: ISODate;
}
export interface TeamMember { id: Id; name: string; role: string; team: TeamName; towerIds: Id[]; phone: string; email: string }

export interface PMPlan {
  id: Id; assetId: Id; task: string; frequency: Frequency; checklist: string[]; assigneeTeam: TeamName; vendorId?: Id;
  regulatory: boolean; permitId?: Id; lastDone: ISODate; nextDue: ISODate; estimatedHours: number;
}
export type WOKind = "corrective" | "preventive" | "inspection" | "project";
export type WOPriority = "P1" | "P2" | "P3" | "P4";
export type WOStatus = "open" | "assigned" | "in-progress" | "on-hold" | "done" | "cancelled";
export interface WOEvent { at: ISODateTime; by: string; note: string; status?: WOStatus }
export interface WorkOrder {
  id: Id; number: string; title: string; towerId: Id; assetId?: Id; spaceId?: Id; kind: WOKind; priority: WOPriority; status: WOStatus;
  reportedById: Id; reportedAt: ISODateTime; assignedToId?: Id; vendorId?: Id; planId?: Id; dueAt: ISODateTime; completedAt?: ISODateTime;
  description: string; timeline: WOEvent[];
}
export type InspectionType = "pm-visit" | "regulatory" | "condition-survey" | "test";
export type InspectionResult = "pass" | "pass-with-findings" | "fail";
export interface Reading { label: string; value: number; unit: string }
export interface InspectionLog {
  id: Id; assetId: Id; planId?: Id; workOrderId?: Id; date: ISODate; type: InspectionType; inspector: string; vendorId?: Id;
  result: InspectionResult; readings: Reading[]; findings: string;
}

export interface Db {
  towers: Record<Id, Tower>; floors: Record<Id, Floor>; spaces: Record<Id, Space>;
  disciplines: Record<Id, Discipline>; equipmentTypes: Record<Id, EquipmentType>; brands: Record<Id, Brand>; models: Record<Id, Model>;
  assets: Record<Id, Asset>; warranties: Record<Id, Warranty>; documents: Record<Id, Document>; permits: Record<Id, Permit>;
  standards: Record<Id, Standard>; finishes: Record<Id, Finish>; finishSchedule: Record<Id, FinishScheduleEntry>; waivers: Record<Id, Waiver>;
  vendors: Record<Id, Vendor>; teamMembers: Record<Id, TeamMember>; pmPlans: Record<Id, PMPlan>; workOrders: Record<Id, WorkOrder>; inspections: Record<Id, InspectionLog>;
}
export type Collection = keyof Db;
export type Row<K extends Collection> = Db[K][Id];

// Derived, never stored
export type WarrantyBand = "expired" | "30d" | "90d" | "365d" | "active" | "none";
export type DueStatus = "overdue" | "due" | "on-track";
export type PermitStatus = "expired" | "due" | "valid";
export type ComplianceStatus = "compliant" | "phase-out" | "deviation" | "waived" | "no-standard";
export interface Compliance { status: ComplianceStatus; standardId?: Id; tier?: ApprovalTier; waiverId?: Id }
export interface HealthScore {
  score: number; band: "Good" | "Watch" | "Action";
  overduePm: number; openP1: number; openP2: number; expiredWarrantyCritA: number; failedInspections: number; expiredPermits: number;
}
export interface HistoryItem { at: ISODate; kind: "PM" | "repair" | "inspection" | "project"; title: string; result?: InspectionResult; status?: WOStatus; href: string }
export interface PlanPin { assetId: Id; x: number; y: number; tone: Tone; label: string; title: string; disciplineId: DisciplineCode }
// label = tag suffix shown on hover/selection ("FP-01"); title = native <title> tooltip ("EDS-B3-FP-01 · Fire pump (electric) · In service")
export interface SearchHit { kind: string; id: Id; title: string; subtitle: string; href: string; haystack: string }

// Return shapes of the selectors in src/data/selectors.ts (§7). Declared here so the seed agent and the ten feature agents cannot drift.
export type BadgeTone = "ok" | "warn" | "danger" | "info" | "neutral" | "gold" | "solid-ok";   // Badge prop; distinct from Tone (discipline fill)
export type AttentionKind = "pm-overdue" | "wo-p1" | "wo-p2" | "permit" | "warranty-30d" | "inspection-fail";
export interface AttentionItem { kind: AttentionKind; towerId: Id; title: string; subtitle: string; href: string; tone: BadgeTone; at: ISODate }
export type RecordGapKind = "missing-asbuilt" | "no-om" | "stale-sheet";
export interface RecordGap { kind: RecordGapKind; towerId: Id; title: string; count: number; href: string }
export interface PortfolioKpis {
  assetsTotal: number; assetsInService: number; openWos: number; openP1: number; openP2: number;
  pmOverdue: number; pmDue14d: number; warranties90d: number; permitsDue: number; permitsExpired: number; asBuiltCoveragePct: number;
}
export interface CoverageCell { floorId: Id; disciplineId: DisciplineCode; status: "current" | "superseded" | "missing"; docId?: Id }
export interface ComplianceCell { towerId: Id; standardId: Id; total: number; compliant: number; waived: number; phaseOut: number; deviations: number }
export interface FinishRow { surface: Surface; portfolio?: Finish; override?: Finish; deviates: boolean }
export interface FinishDeviation { towerId: Id; spaceKind: SpaceKind; surface: Surface; portfolioFinishId: Id; overrideFinishId: Id }
export interface BrandImpact { brandId: Id; assets: number; towerIds: Id[]; warrantyAssetMonths: number; openWos: number; oldestInstall?: ISODate }
export interface Location { tower: Tower; floor: Floor; space: Space }
