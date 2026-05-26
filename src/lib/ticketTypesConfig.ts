/**
 * مصدر واحد لأنواع التكتات — عامة، إدارية، ورتب الموظفين المرتبطة.
 */

export type TicketTypeRole =
  | "ticket_sector_complaint_manager"
  | "ticket_gang_complaint_manager"
  | "ticket_rp_complaint_manager"
  | "ticket_high_admin_compensation_manager"
  | "ticket_sheriff_manager"
  | "ticket_interior_ministry_manager"
  | "ticket_health_ministry_manager"
  | "ticket_justice_ministry_manager"
  | "ticket_federal_police_manager"
  | "ticket_gang_open_manager"
  | "ticket_store_manager";

/** أدوار تكتات قديمة — تُرحَّل عند تحميل التخزين أو جلسة الموظف */
export type LegacyTicketTypeRole =
  | "ticket_support_manager"
  | "ticket_admin_inquiry_manager"
  | "ticket_player_complaint_manager"
  | "ticket_compensation_manager"
  | "ticket_general_manager";

const LEGACY_TICKET_ROLE_MIGRATION: Record<LegacyTicketTypeRole, TicketTypeRole> = {
  ticket_support_manager: "ticket_high_admin_compensation_manager",
  ticket_admin_inquiry_manager: "ticket_high_admin_compensation_manager",
  ticket_player_complaint_manager: "ticket_rp_complaint_manager",
  ticket_compensation_manager: "ticket_high_admin_compensation_manager",
  ticket_general_manager: "ticket_high_admin_compensation_manager",
};

function isLegacyTicketRole(v: string): v is LegacyTicketTypeRole {
  return v in LEGACY_TICKET_ROLE_MIGRATION;
}

const TICKET_TYPE_ROLES: readonly TicketTypeRole[] = [
  "ticket_sector_complaint_manager",
  "ticket_gang_complaint_manager",
  "ticket_rp_complaint_manager",
  "ticket_high_admin_compensation_manager",
  "ticket_sheriff_manager",
  "ticket_interior_ministry_manager",
  "ticket_health_ministry_manager",
  "ticket_justice_ministry_manager",
  "ticket_federal_police_manager",
  "ticket_gang_open_manager",
  "ticket_store_manager",
];

export const GANG_OPEN_TICKET_SLUG = "gang-open";
export const GANG_OPEN_TICKET_ROLE: TicketTypeRole = "ticket_gang_open_manager";

const GANG_MANAGER_TICKET_SLUGS = [GANG_OPEN_TICKET_SLUG] as const;

export function isTicketTypeRole(v: unknown): v is TicketTypeRole {
  return typeof v === "string" && (TICKET_TYPE_ROLES as readonly string[]).includes(v);
}

export function migrateTicketTypeRole(role: unknown): TicketTypeRole {
  if (typeof role !== "string") return "ticket_high_admin_compensation_manager";
  if (role === "ticket_gang_join_manager") return "ticket_gang_open_manager";
  if (isTicketTypeRole(role)) return role;
  if (isLegacyTicketRole(role)) return LEGACY_TICKET_ROLE_MIGRATION[role];
  return "ticket_high_admin_compensation_manager";
}

/** ترحيل رتبة موظف قديمة مرتبطة بتكت */
export function migrateStaffTicketRole(role: string): string {
  if (role === "ticket_gang_join_manager") return "ticket_gang_open_manager";
  if (isLegacyTicketRole(role)) return LEGACY_TICKET_ROLE_MIGRATION[role];
  return role;
}

export type TicketTypeDefinition = {
  slug: string;
  label: string;
  role: TicketTypeRole;
  staffRoleLabel: string;
  hint: string;
  accent: string;
  /** يظهر في صفحة التكتات العامة للمواطنين */
  publicVisible: boolean;
};

export const TICKET_TYPE_DEFINITIONS: readonly TicketTypeDefinition[] = [
  {
    slug: "sector-complaint",
    label: "شكوى على قطاع",
    role: "ticket_sector_complaint_manager",
    staffRoleLabel: "تكت — شكوى على قطاع",
    hint: "بلاغ أو شكوى متعلقة بقطاع حكومي",
    accent: "from-sky-100 to-blue-50",
    publicVisible: true,
  },
  {
    slug: "gang-complaint",
    label: "شكوى على عصابة",
    role: "ticket_gang_complaint_manager",
    staffRoleLabel: "تكت — شكوى على عصابة",
    hint: "بلاغ عن عصابة أو نشاط عصابي",
    accent: "from-rose-100 to-red-50",
    publicVisible: true,
  },
  {
    slug: "rp-complaint",
    label: "شكوى رول بلي",
    role: "ticket_rp_complaint_manager",
    staffRoleLabel: "تكت — شكوى رول بلي",
    hint: "مخالفات أو مشاكل في الرول بلاي",
    accent: "from-rose-100 to-red-50",
    publicVisible: true,
  },
  {
    slug: "high-admin",
    label: "إدارة عليا وتعويض",
    role: "ticket_high_admin_compensation_manager",
    staffRoleLabel: "تكت — إدارة عليا وتعويض",
    hint: "تعويضات وطلبات للإدارة العليا",
    accent: "from-amber-100 to-yellow-50",
    publicVisible: true,
  },
  {
    slug: "sheriff",
    label: "تذكرة شريف",
    role: "ticket_sheriff_manager",
    staffRoleLabel: "تكت — تذكرة شريف",
    hint: "طلبات وشكاوى مرتبطة بمكتب الشريف",
    accent: "from-orange-100 to-amber-50",
    publicVisible: true,
  },
  {
    slug: "interior",
    label: "تذاكر وزارة الداخلية",
    role: "ticket_interior_ministry_manager",
    staffRoleLabel: "تكت — وزارة الداخلية",
    hint: "شكاوى وطلبات وزارة الداخلية",
    accent: "from-indigo-100 to-blue-50",
    publicVisible: true,
  },
  {
    slug: "health",
    label: "تذكرة وزارة الصحة",
    role: "ticket_health_ministry_manager",
    staffRoleLabel: "تكت — وزارة الصحة",
    hint: "طلبات وشكاوى وزارة الصحة",
    accent: "from-emerald-100 to-green-50",
    publicVisible: true,
  },
  {
    slug: "justice",
    label: "تذكرة وزارة العدل",
    role: "ticket_justice_ministry_manager",
    staffRoleLabel: "تكت — وزارة العدل",
    hint: "قضايا وطلبات وزارة العدل",
    accent: "from-teal-100 to-cyan-50",
    publicVisible: true,
  },
  {
    slug: "federal-police",
    label: "تذكرة الشرطة الفدرالية",
    role: "ticket_federal_police_manager",
    staffRoleLabel: "تكت — الشرطة الفدرالية",
    hint: "بلاغات وطلبات الشرطة الفدرالية",
    accent: "from-slate-100 to-zinc-50",
    publicVisible: true,
  },
  {
    slug: "gang-open",
    label: "طلب فتح عصابة",
    role: "ticket_gang_open_manager",
    staffRoleLabel: "تكت — طلب فتح عصابة",
    hint: "تقديم لتأسيس عصابة جديدة",
    accent: "from-red-100 to-rose-50",
    publicVisible: false,
  },
  {
    slug: "store",
    label: "طلب متجر",
    role: "ticket_store_manager",
    staffRoleLabel: "تكت — طلب متجر",
    hint: "طلبات المتجر الإلكتروني",
    accent: "from-emerald-100 to-green-50",
    publicVisible: false,
  },
] as const;

export const PUBLIC_TICKET_TYPE_DEFINITIONS = TICKET_TYPE_DEFINITIONS.filter((d) => d.publicVisible);

/** نوع تكت المتجر — يُدار من «طلبات المتاجر» تحت قسم المتجر وليس من صفحة التكت */
export const STORE_TICKET_SLUG = "store";

export const DASHBOARD_TICKET_TYPE_DEFINITIONS = TICKET_TYPE_DEFINITIONS.filter(
  (d) => d.slug !== STORE_TICKET_SLUG,
);

/** أنواع التكت في لوحة الإدارة (بدون طلب المتجر) */
export const ADMIN_TICKET_TYPE_DEFINITIONS = DASHBOARD_TICKET_TYPE_DEFINITIONS;

export const TICKET_TYPE_NAV = DASHBOARD_TICKET_TYPE_DEFINITIONS.map((d) => ({
  slug: d.slug,
  label: d.label,
  role: d.role,
}));

/** رتب تكتات لوحة «التكت» — بدون مدير طلبات المتجر */
export const DASHBOARD_TICKET_STAFF_ROLES: readonly TicketTypeRole[] = DASHBOARD_TICKET_TYPE_DEFINITIONS.map(
  (d) => d.role,
);

export const ALL_TICKET_STAFF_ROLES: readonly TicketTypeRole[] = TICKET_TYPE_ROLES;

export const TICKET_STAFF_ROLE_OPTIONS = TICKET_TYPE_DEFINITIONS.map((d) => ({
  value: d.role,
  label: d.staffRoleLabel,
}));

export function getTicketTypeByRole(role: TicketTypeRole): TicketTypeDefinition | undefined {
  return TICKET_TYPE_DEFINITIONS.find((d) => d.role === role);
}

export function getTicketTypeBySlug(slug: string): TicketTypeDefinition | undefined {
  return TICKET_TYPE_DEFINITIONS.find((d) => d.slug === slug);
}

export function ticketLabelForRole(role: TicketTypeRole): string {
  return getTicketTypeByRole(role)?.label ?? "تكت";
}

/** صلاحية مراجعة نوع تكت — مدير العصابات يرى طلبات فتح العصابة دون رتبة تكت منفصلة */
export function staffCanAccessTicketSlug(
  slug: string,
  staffRoles: readonly string[],
  isSuperAdmin: boolean,
): boolean {
  if (isSuperAdmin) return true;
  const def = getTicketTypeBySlug(slug);
  if (!def) return false;
  if (staffRoles.includes(def.role)) return true;
  if (GANG_MANAGER_TICKET_SLUGS.includes(slug as (typeof GANG_MANAGER_TICKET_SLUGS)[number]) && staffRoles.includes("gang_manager")) {
    return true;
  }
  return false;
}
