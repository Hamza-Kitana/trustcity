import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import {
  ChevronDown,
  Crown,
  Layers,
  Pencil,
  Search,
  ShieldCheck,
  Trash2,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SUPER_ADMIN_USERNAME } from "@/config/staffAuth";
import { useAuth } from "@/contexts/AuthContext";
import { useApplicationsContent } from "@/contexts/ApplicationsContentContext";
import { IC_PUBLIC_USERS_CHANGED_EVENT, usePublicUser } from "@/contexts/PublicUserContext";
import { useRoleGroups } from "@/contexts/RoleGroupsContext";
import type { ApplicationRecord } from "@/data/publicApplicationTypes";
import {
  INSTITUTION_ROSTER_STAFF_ROLES,
  institutionRosterStaffRoleLabelAr,
  isInstitutionRosterStaffRole,
} from "@/data/institutionBranches";
import {
  addManagedUser,
  findManagedUserByPublicId,
  IC_MANAGED_STAFF_CHANGED_EVENT,
  IC_MANAGED_STAFF_STORAGE_KEY,
  loadManagedUsers,
  removeManagedUser,
  updateManagedUser,
  type ManagedStaffRole,
  type ManagedUser,
} from "@/staff/staffDirectory";
import { listenStorageSync, writeSyncedLocalStorage } from "@/lib/storageSync";
import { appendActivityLog } from "@/lib/activityLog";
import { TICKET_STAFF_ROLE_OPTIONS } from "@/lib/ticketTypesConfig";
import { purgeArtifactsForDeletedPublicUser } from "@/lib/purgeDeletedPublicUser";
import {
  assertSuperAdminCanDeleteUsers,
  canDeleteManagedStaffTarget,
  SUPER_ADMIN_DELETE_ONLY_MESSAGE,
} from "@/lib/staffUserDeletePolicy";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type PublicUserRow = {
  id: string;
  username: string;
  realName: string;
  fullName: string;
  /** الاسم المعروض في الجلسة (Discord) — لا يُخلط مع اسم المدينة */
  displayName: string;
  email: string;
  discordId: string;
  age: number;
  password: string;
  isActive: boolean;
  createdAt: string;
  authProvider?: "local" | "discord";
};

const APPLICATIONS_STORAGE_KEY = "ic_public_applications_v1";
const APPLICATIONS_CHANGED_EVENT = "ic-public-applications-changed";

function applicationMatchesPublicRow(app: ApplicationRecord, row: PublicUserRow): boolean {
  const linked = (app.applicantUserId ?? "").trim();
  if (linked) return linked === row.id.trim();
  if (app.applicantUsername && app.applicantUsername.trim().toLowerCase() === row.username.trim().toLowerCase()) {
    return true;
  }
  const ad = (app.applicantDisplayName ?? "").trim().toLowerCase();
  if (ad && row.fullName.trim() && ad === row.fullName.trim().toLowerCase()) return true;
  if (ad && row.displayName.trim() && ad === row.displayName.trim().toLowerCase()) return true;
  return false;
}

function loadApplicationsForAdmin(): ApplicationRecord[] {
  try {
    const raw = localStorage.getItem(APPLICATIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { v?: unknown; applications?: unknown };
    if (parsed?.v === 1 && Array.isArray(parsed.applications)) {
      return parsed.applications.filter(
        (app): app is ApplicationRecord =>
          !!app &&
          typeof app === "object" &&
          typeof (app as ApplicationRecord).id === "string" &&
          typeof (app as ApplicationRecord).roleKey === "string" &&
          typeof (app as ApplicationRecord).snapshot === "object",
      );
    }
  } catch {
    /* ignore */
  }
  return [];
}

function saveApplicationsForAdmin(applications: ApplicationRecord[]) {
  writeSyncedLocalStorage(
    APPLICATIONS_STORAGE_KEY,
    JSON.stringify({ v: 1, applications }),
    [APPLICATIONS_CHANGED_EVENT],
  );
}

function loadPublicUsersForAdmin(): PublicUserRow[] {
  try {
    const raw = localStorage.getItem("ic_public_users_v1");
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
      .map((x) => {
        const fullName = typeof x.fullName === "string" ? x.fullName : "—";
        const username = typeof x.username === "string" ? x.username : "—";
        const storedDn = typeof x.displayName === "string" ? x.displayName.trim() : "";
        const displayName = storedDn || fullName.trim() || username;
        return {
          id: typeof x.id === "string" ? x.id : crypto.randomUUID(),
          username,
          realName: typeof x.realName === "string" ? x.realName : "—",
          fullName,
          displayName,
          email: typeof x.email === "string" ? x.email : "—",
          discordId: typeof x.discordId === "string" ? x.discordId : "—",
          age: typeof x.age === "number" ? x.age : 0,
          password: typeof x.password === "string" ? x.password : "",
          isActive: x.isActive !== false,
          createdAt: typeof x.createdAt === "string" ? x.createdAt : "",
          authProvider: x.authProvider === "discord" || x.authProvider === "local" ? x.authProvider : undefined,
        };
      });
  } catch {
    return [];
  }
}

const PUBLIC_USERS_STORAGE_KEY = "ic_public_users_v1";

function savePublicUsersForAdmin(users: PublicUserRow[]) {
  writeSyncedLocalStorage(
    PUBLIC_USERS_STORAGE_KEY,
    JSON.stringify(
      users.map((u) => ({
        id: u.id,
        username: u.username,
        realName: u.realName,
        fullName: u.fullName,
        email: u.email,
        discordId: u.discordId,
        age: u.age,
        password: u.password,
        displayName: u.displayName?.trim() || u.fullName?.trim() || u.username,
        isActive: u.isActive,
        createdAt: u.createdAt,
        authProvider: u.authProvider,
      })),
    ),
    [IC_PUBLIC_USERS_CHANGED_EVENT],
  );
}

const BASE_ROLES: { value: ManagedStaffRole; label: string }[] = [
  { value: "laws_editor", label: "محرر القوانين" },
  { value: "streamer_manager", label: "ستريمر منجر" },
  { value: "gang_manager", label: "مدير العصابات" },
  { value: "vip_cars_manager", label: "مدير سيارات VIP" },
  { value: "houses_manager", label: "مدير البيوت" },
  { value: "packages_manager", label: "مدير البكجات" },
  { value: "investments_manager", label: "مدير الاستثمار" },
  { value: "quiz_manager", label: "مدير أسئلة التقديم" },
  { value: "application_reviewer", label: "مراجع التقديمات" },
  { value: "about_manager", label: "مدير من نحن" },
  { value: "store_orders_manager", label: "طلبات المتاجر" },
  ...TICKET_STAFF_ROLE_OPTIONS.map((o) => ({ value: o.value as ManagedStaffRole, label: o.label })),
];

function roleLabel(role: ManagedStaffRole): string {
  if (isInstitutionRosterStaffRole(role)) return institutionRosterStaffRoleLabelAr(role);
  return BASE_ROLES.find((r) => r.value === role)?.label ?? role;
}

/** عرض الرتب في قائمة منسدلة — يوفر مساحة في الجدول */
function ManagedRolesDropdown({
  roles,
  listLabel = "الرتب المعيّنة",
}: {
  roles: readonly ManagedStaffRole[];
  listLabel?: string;
}) {
  const sorted = useMemo(
    () => [...roles].sort((a, b) => roleLabel(a).localeCompare(roleLabel(b), "ar")),
    [roles],
  );
  if (sorted.length === 0) {
    return (
      <span className="inline-flex rounded-lg border border-dashed border-slate-200/90 bg-slate-50/80 px-2.5 py-1 text-[11px] text-slate-500 dark:border-slate-600 dark:bg-slate-900/40 dark:text-slate-400">
        لا رتب
      </span>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 max-w-[min(100%,14rem)] gap-1.5 rounded-lg border-rose-200/90 bg-white px-2.5 text-xs font-medium text-rose-900 shadow-sm hover:bg-rose-50/90 dark:border-rose-700/45 dark:bg-slate-900 dark:text-rose-100 dark:hover:bg-rose-950/45"
        >
          <Layers className="h-3.5 w-3.5 shrink-0 text-rose-600 opacity-90 dark:text-rose-300" />
          <span className="min-w-0 truncate">
            {sorted.length === 1 ? "رتبة واحدة" : `${sorted.length} رتب`}
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        dir="rtl"
        className="max-h-64 w-[min(20rem,calc(100vw-2rem))] overflow-y-auto text-right"
      >
        <DropdownMenuLabel className="text-xs font-normal text-slate-500 dark:text-slate-400">
          {listLabel}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {sorted.map((r) => (
          <DropdownMenuItem
            key={r}
            className="cursor-default justify-end text-sm text-slate-800 focus:bg-rose-50 dark:text-slate-100 dark:focus:bg-rose-950/45"
            onSelect={(e) => e.preventDefault()}
          >
            {roleLabel(r)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function rolesPickerHasMore(selected: Set<ManagedStaffRole>): boolean {
  const baseLeft = BASE_ROLES.some((b) => !selected.has(b.value));
  const rosterLeft = INSTITUTION_ROSTER_STAFF_ROLES.some((r) => !selected.has(r));
  return baseLeft || rosterLeft;
}

function rolesSetsEqual(a: Set<ManagedStaffRole>, b: readonly ManagedStaffRole[]): boolean {
  if (a.size !== b.length) return false;
  return b.every((r) => a.has(r));
}

const StaffUsersPage = () => {
  const { isSuperAdmin, user } = useAuth();
  const { user: publicSessionUser } = usePublicUser();
  const { applications } = useApplicationsContent();
  const { groups } = useRoleGroups();
  const [users, setUsers] = useState(() => loadManagedUsers());
  const [publicUsers, setPublicUsers] = useState<PublicUserRow[]>(() => loadPublicUsersForAdmin());
  const [searchQuery, setSearchQuery] = useState("");
  type EditFormState = {
    id: string;
    username: string;
    password: string;
    roles: Set<ManagedStaffRole>;
    appliedGroups: string[];
  };
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [editRolePickerKey, setEditRolePickerKey] = useState(0);
  const [editGroupPickerKey, setEditGroupPickerKey] = useState(0);
  const [editPublicOpen, setEditPublicOpen] = useState(false);
  const [editPublicForm, setEditPublicForm] = useState<PublicUserRow | null>(null);

  type PromoteState = {
    publicUser: PublicUserRow;
    roles: Set<ManagedStaffRole>;
    appliedGroups: string[];
    /** إذا كان للمواطن ملف موظف سابقاً، نعدّله بدل إنشائه */
    existingManaged: ManagedUser | null;
  };
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [promote, setPromote] = useState<PromoteState | null>(null);
  const [promoteRolePickerKey, setPromoteRolePickerKey] = useState(0);
  const [promoteGroupPickerKey, setPromoteGroupPickerKey] = useState(0);

  const list = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.username.toLowerCase().includes(q));
  }, [users, searchQuery]);
  const publicList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return publicUsers;
    return publicUsers.filter((u) =>
      `${u.username} ${u.realName} ${u.fullName} ${u.email}`.toLowerCase().includes(q),
    );
  }, [publicUsers, searchQuery]);

  /** خريطة publicUserId -> managed user (للعرض فقط) */
  const linkedManagedByPublicId = useMemo(() => {
    const map = new Map<string, ManagedUser>();
    users.forEach((u) => {
      if (u.linkedPublicUserId) map.set(u.linkedPublicUserId, u);
    });
    return map;
  }, [users]);

  const approvedCitizenPublicIds = useMemo(() => {
    const ids = new Set<string>();
    for (const app of applications) {
      if (app.roleKey === "citizen" && app.status === "approved" && app.applicantUserId) {
        ids.add(app.applicantUserId);
      }
    }
    return ids;
  }, [applications]);

  const editHasAvailableRoles = useMemo(
    () => (editForm ? rolesPickerHasMore(editForm.roles) : false),
    [editForm],
  );
  const promoteHasAvailableRoles = useMemo(
    () => (promote ? rolesPickerHasMore(promote.roles) : false),
    [promote],
  );

  /** سجل موظف مرتبط بنفس حساب المواطن الحالي — لا يُسمح بتعديل الرتب لنفسك من لوحة الإدارة */
  const editManagedRow = editForm ? users.find((x) => x.id === editForm.id) : undefined;
  /** موظف مربوط بمواطن — الدخول عبر الحساب العام/Discord؛ لا حاجة لحقل كلمة مرور لوحة الموظف */
  const editStaffLinkedToPublic = !!editManagedRow?.linkedPublicUserId;
  const cannotEditOwnStaffRoles =
    !!publicSessionUser?.id &&
    !!editManagedRow?.linkedPublicUserId &&
    editManagedRow.linkedPublicUserId === publicSessionUser.id;

  const promoteTargetsOwnPublicAccount =
    !!promote &&
    !!publicSessionUser?.id &&
    promote.publicUser.id === publicSessionUser.id;

  const refresh = useCallback(() => {
    setUsers(loadManagedUsers());
    setPublicUsers(loadPublicUsersForAdmin());
  }, []);

  useEffect(() => {
    const unsubs = [
      listenStorageSync(IC_MANAGED_STAFF_STORAGE_KEY, refresh, [IC_MANAGED_STAFF_CHANGED_EVENT]),
      listenStorageSync(PUBLIC_USERS_STORAGE_KEY, refresh, [IC_PUBLIC_USERS_CHANGED_EVENT]),
      listenStorageSync(APPLICATIONS_STORAGE_KEY, refresh, [APPLICATIONS_CHANGED_EVENT]),
    ];
    return () => {
      for (const unsub of unsubs) unsub();
    };
  }, [refresh]);

  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const deleteActorOptions = { actorIsSuperAdmin: true as const };

  const guardSuperAdminDelete = (): boolean => {
    if (!assertSuperAdminCanDeleteUsers(user)) {
      toast.error(SUPER_ADMIN_DELETE_ONLY_MESSAGE);
      return false;
    }
    return true;
  };

  const handleRemove = (id: string, uname: string) => {
    if (!guardSuperAdminDelete()) return;
    const target = users.find((u) => u.id === id);
    if (target) {
      const guard = canDeleteManagedStaffTarget(target);
      if (!guard.ok) {
        toast.error(guard.message ?? "لا يمكن حذف هذا الحساب.");
        return;
      }
    }
    try {
      removeManagedUser(id, deleteActorOptions);
    } catch (err) {
      if (err instanceof Error && err.message === "FORBIDDEN_DELETE_MANAGED_USER") {
        toast.error(SUPER_ADMIN_DELETE_ONLY_MESSAGE);
        return;
      }
      if (err instanceof Error && err.message === "PROTECTED_MANAGED_USER") {
        toast.error("لا يمكن حذف هذا الحساب.");
        return;
      }
      toast.error("تعذر حذف المستخدم من التخزين المحلي.");
      return;
    }
    refresh();
    try {
      appendActivityLog(user?.username ?? "super_admin", "حذف مستخدم موظف", uname);
    } catch {
      /* ignore */
    }
    toast.success("تم الحذف");
  };

  const handleToggleStaffUser = (id: string, uname: string, isActive: boolean) => {
    try {
      updateManagedUser(id, { isActive: !isActive });
    } catch {
      toast.error("تعذر تعديل حالة المستخدم.");
      return;
    }
    refresh();
    try {
      appendActivityLog(
        user?.username ?? "super_admin",
        isActive ? "إيقاف مستخدم موظف" : "تفعيل مستخدم موظف",
        uname,
      );
    } catch {
      /* ignore */
    }
    toast.success(isActive ? "تم إيقاف الحساب" : "تم تفعيل الحساب");
  };

  const openEdit = (u: ManagedUser) => {
    setEditForm({
      id: u.id,
      username: u.username,
      password: "",
      roles: new Set(u.roles),
      appliedGroups: [],
    });
    setEditRolePickerKey((k) => k + 1);
    setEditGroupPickerKey((k) => k + 1);
    setEditOpen(true);
  };

  const applyGroupToEdit = (gid: string) => {
    const g = groups.find((x) => x.id === gid);
    if (!g) return;
    setEditForm((prev) => {
      if (!prev) return prev;
      const nextRoles = new Set(prev.roles);
      g.roles.forEach((r) => nextRoles.add(r));
      return {
        ...prev,
        roles: nextRoles,
        appliedGroups: prev.appliedGroups.includes(gid)
          ? prev.appliedGroups
          : [...prev.appliedGroups, gid],
      };
    });
    setEditGroupPickerKey((k) => k + 1);
    toast.success(`تم تطبيق المجموعة «${g.name}»`);
  };

  const removeEditGroupChip = (gid: string) => {
    setEditForm((prev) =>
      prev ? { ...prev, appliedGroups: prev.appliedGroups.filter((x) => x !== gid) } : prev,
    );
  };

  const addEditRoleFromPicker = (value: string) => {
    const r = value as ManagedStaffRole;
    setEditForm((prev) => (prev ? { ...prev, roles: new Set([...prev.roles, r]) } : prev));
    setEditRolePickerKey((k) => k + 1);
  };

  const removeEditRole = (r: ManagedStaffRole) => {
    setEditForm((prev) => {
      if (!prev) return prev;
      if (prev.roles.size <= 1) {
        toast.error("يجب الإبقاء على دور واحد على الأقل");
        return prev;
      }
      const next = new Set(prev.roles);
      next.delete(r);
      return { ...prev, roles: next };
    });
  };

  const handleEditSave = (e: FormEvent) => {
    e.preventDefault();
    if (!editForm) return;
    const u = editForm.username.trim();
    if (u.length < 2) {
      toast.error("اسم المستخدم قصير جداً");
      return;
    }
    if (u.toLowerCase() === SUPER_ADMIN_USERNAME.toLowerCase()) {
      toast.error("هذا الاسم محجوز لحساب الإدارة");
      return;
    }
    if (
      loadManagedUsers().some((x) => x.id !== editForm.id && x.username.toLowerCase() === u.toLowerCase())
    ) {
      toast.error("هذا الاسم مستخدم مسبقاً لمستخدم آخر");
      return;
    }
    const roles = Array.from(editForm.roles);
    if (roles.length === 0) {
      toast.error("اختر دوراً واحداً على الأقل");
      return;
    }
    const managedRow = loadManagedUsers().find((x) => x.id === editForm.id);
    if (
      managedRow?.linkedPublicUserId &&
      publicSessionUser?.id &&
      managedRow.linkedPublicUserId === publicSessionUser.id &&
      !rolesSetsEqual(editForm.roles, managedRow.roles)
    ) {
      toast.error("لا يمكنك تعديل رتبك الخاصة بنفسك — اطلب مشرفاً آخر.");
      return;
    }
    const patch: { username: string; roles: ManagedStaffRole[]; password?: string } = {
      username: u,
      roles,
    };
    const newStaffPw = editForm.password.trim();
    if (newStaffPw.length > 0) {
      if (newStaffPw.length < 4) {
        toast.error("كلمة مرور لوحة الموظف يجب أن تكون 4 أحرف على الأقل — أو اترك الحقل فارغاً");
        return;
      }
      patch.password = newStaffPw;
    }
    try {
      updateManagedUser(editForm.id, patch);
    } catch (err) {
      const quotaFull =
        err instanceof DOMException && (err.name === "QuotaExceededError" || err.code === 22);
      toast.error(
        quotaFull
          ? "تعذر الحفظ بعد محاولة تفريغ المساحة. امسح بيانات الموقع من المتصفح."
          : "تعذر الحفظ: تحقق من إعدادات التخزين في المتصفح.",
      );
      return;
    }
    refresh();
    try {
      appendActivityLog(
        user?.username ?? "super_admin",
        "تعديل مستخدم موظف",
        `${u} — أدوار: ${roles.map(roleLabel).join("، ")}${patch.password ? " — تم تغيير كلمة المرور" : ""}`,
      );
    } catch {
      /* ignore */
    }
    toast.success("تم حفظ التعديلات");
    setEditOpen(false);
    setEditForm(null);
  };

  const handleSavePublicEdit = (e: FormEvent) => {
    e.preventDefault();
    if (!editPublicForm) return;
    const usernameLow = editPublicForm.username.trim().toLowerCase();
    const realName = editPublicForm.realName.trim();
    const fullName = editPublicForm.fullName.trim();
    const email = editPublicForm.email.trim().toLowerCase();
    const discordId = editPublicForm.discordId.trim();
    const age = Number(editPublicForm.age);
    if (usernameLow.length < 3 || realName.length < 3 || fullName.length < 3) {
      toast.error("أدخل بيانات صحيحة");
      return;
    }
    if (!email.includes("@")) {
      toast.error("الإيميل غير صحيح");
      return;
    }
    if (!Number.isFinite(age) || age < 13) {
      toast.error("العمر يجب أن يكون 13 أو أكثر");
      return;
    }
    if (publicUsers.some((u) => u.id !== editPublicForm.id && u.username.toLowerCase() === usernameLow)) {
      toast.error("اسم المستخدم مستخدم مسبقاً");
      return;
    }
    const next = publicUsers.map((u) =>
      u.id === editPublicForm.id
        ? {
            ...u,
            username: usernameLow,
            realName,
            fullName,
            email,
            discordId,
            age: Math.floor(age),
            password: u.password,
            isActive: editPublicForm.isActive,
            authProvider: u.authProvider,
          }
        : u,
    );
    savePublicUsersForAdmin(next);
    refresh();
    setEditPublicOpen(false);
    setEditPublicForm(null);
    appendActivityLog(user?.username ?? "super_admin", "تعديل مستخدم عادي", `${usernameLow} — ${fullName}`);
    toast.success("تم حفظ تعديل المستخدم");
  };

  const handleTogglePublicUser = (id: string) => {
    const target = publicUsers.find((u) => u.id === id);
    if (!target) return;
    const next = publicUsers.map((u) => (u.id === id ? { ...u, isActive: !u.isActive } : u));
    savePublicUsersForAdmin(next);
    refresh();
    appendActivityLog(
      user?.username ?? "super_admin",
      target.isActive ? "إيقاف مستخدم عادي" : "تفعيل مستخدم عادي",
      `${target.username} — ${target.fullName}`,
    );
    toast.success(target.isActive ? "تم إيقاف الحساب" : "تم تفعيل الحساب");
  };

  const handleGrantCitizenElectronicApply = (target: PublicUserRow) => {
    if (!user?.roles.includes("super_admin")) {
      toast.error("تفعيل التقديم بدون نموذج متاح لمسؤول النظام (سوبر أدمن) فقط.");
      return;
    }
    const current = loadApplicationsForAdmin();
    if (
      current.some(
        (app) => app.roleKey === "citizen" && app.status === "approved" && applicationMatchesPublicRow(app, target),
      )
    ) {
      toast.message("هذا المواطن مفعّل مسبقاً كتقديم إلكتروني مقبول");
      return;
    }

    const now = new Date().toISOString();
    const nameParts = target.fullName.trim().split(/\s+/).filter(Boolean);
    const record: ApplicationRecord = {
      id: crypto.randomUUID(),
      roleKey: "citizen",
      targetTitle: "تقديم المواطن",
      applicantUserId: target.id,
      applicantUsername: target.username,
      applicantDisplayName: target.fullName || target.username,
      status: "approved",
      submittedAt: now,
      decidedAt: now,
      decidedBy: user?.username ?? "super_admin",
      note: "تفعيل يدوي من السوبر أدمن من صفحة المستخدمين والأدوار.",
      snapshot: {
        firstName: nameParts[0] ?? (target.fullName || target.username),
        lastName: nameParts.slice(1).join(" ") || "—",
        gender: "male",
        birthSummaryLine: "—",
        ageSummaryLine: target.age > 0 ? `${target.age} سنة` : "—",
        countryCode: "JO",
        discord: target.discordId ? `${target.realName} (ID: ${target.discordId})` : target.realName,
        previousCities: "تفعيل يدوي من الإدارة",
        experience: "تم تفعيل التقديم الإلكتروني لهذا المواطن يدوياً بواسطة السوبر أدمن.",
        lawsAccepted: true,
        cityName: target.fullName,
        discordId: target.discordId,
      },
    };

    try {
      saveApplicationsForAdmin([record, ...current]);
    } catch {
      toast.error("تعذر تفعيل التقديم الإلكتروني بسبب التخزين المحلي");
      return;
    }

    appendActivityLog(
      user?.username ?? "super_admin",
      "تفعيل تقديم إلكتروني لمواطن",
      `${target.username} — تم إنشاء طلب مواطن مقبول يدوياً`,
    );
    toast.success("تم تفعيل المواطن كأنه قدّم وتم قبول التقديم الإلكتروني");
  };

  const handleRevokeCitizenElectronicApply = (target: PublicUserRow) => {
    if (!user?.roles.includes("super_admin")) {
      toast.error("هذا الإجراء متاح لمسؤول النظام (سوبر أدمن) فقط.");
      return;
    }
    const current = loadApplicationsForAdmin();
    const next = current.filter(
      (app) => !(app.roleKey === "citizen" && applicationMatchesPublicRow(app, target)),
    );
    if (next.length === current.length) {
      toast.message("لا يوجد تقديم مواطن مرتبط بهذا الحساب لإزالته.");
      return;
    }
    try {
      saveApplicationsForAdmin(next);
    } catch {
      toast.error("تعذر تحديث طلبات التقديم في التخزين المحلي.");
      return;
    }
    appendActivityLog(
      user?.username ?? "super_admin",
      "إلغاء تفعيل التقديم الإلكتروني لمواطن",
      `${target.username} — تمت إزالة طلب/طلبات المواطن من السجل`,
    );
    toast.success("تم إلغاء تفعيل التقديم الإلكتروني — يمكن للمواطن التقديم من جديد عبر النموذج واختبار القوانين.");
  };

  const handleDeletePublicUser = (id: string) => {
    if (!guardSuperAdminDelete()) return;
    const target = publicUsers.find((u) => u.id === id);
    if (!target) return;
    /** نزيل أيضاً أي ملف موظف مرتبط بهذا المواطن */
    const linked = findManagedUserByPublicId(target.id);
    if (linked) {
      const linkedGuard = canDeleteManagedStaffTarget(linked);
      if (!linkedGuard.ok) {
        toast.error(linkedGuard.message ?? "لا يمكن حذف حساب الموظف المرتبط.");
        return;
      }
      try {
        removeManagedUser(linked.id, deleteActorOptions);
      } catch (err) {
        if (err instanceof Error && err.message === "FORBIDDEN_DELETE_MANAGED_USER") {
          toast.error(SUPER_ADMIN_DELETE_ONLY_MESSAGE);
          return;
        }
        if (err instanceof Error && err.message === "PROTECTED_MANAGED_USER") {
          toast.error("لا يمكن حذف حساب الموظف المرتبط.");
          return;
        }
        /* ignore other storage errors for linked row — still delete public user */
      }
    }
    purgeArtifactsForDeletedPublicUser({
      id: target.id,
      username: target.username,
      fullName: target.fullName,
      discordId: target.discordId,
      displayName: target.displayName,
    });
    savePublicUsersForAdmin(publicUsers.filter((u) => u.id !== id));
    refresh();
    appendActivityLog(user?.username ?? "super_admin", "حذف مستخدم عادي", `${target.username} — ${target.fullName}`);
    toast.success(
      "تم حذف المستخدم العادي وكل طلبات التقديم الإلكترونية والتكتات وربطه بالطواقم — عند التسجيل من جديد يبدأ من الصفر ويُطلب منه التقديم من جديد إن لزم.",
    );
  };

  const openPromote = (target: PublicUserRow) => {
    const linked = findManagedUserByPublicId(target.id);
    setPromote({
      publicUser: target,
      roles: new Set(linked?.roles ?? []),
      appliedGroups: [],
      existingManaged: linked,
    });
    setPromoteRolePickerKey((k) => k + 1);
    setPromoteGroupPickerKey((k) => k + 1);
    setPromoteOpen(true);
  };

  const applyGroupToPromote = (gid: string) => {
    const g = groups.find((x) => x.id === gid);
    if (!g) return;
    setPromote((prev) => {
      if (!prev) return prev;
      const nextRoles = new Set(prev.roles);
      g.roles.forEach((r) => nextRoles.add(r));
      return {
        ...prev,
        roles: nextRoles,
        appliedGroups: prev.appliedGroups.includes(gid)
          ? prev.appliedGroups
          : [...prev.appliedGroups, gid],
      };
    });
    setPromoteGroupPickerKey((k) => k + 1);
    toast.success(`تم تطبيق المجموعة «${g.name}»`);
  };

  const removePromoteGroupChip = (gid: string) => {
    setPromote((prev) =>
      prev ? { ...prev, appliedGroups: prev.appliedGroups.filter((x) => x !== gid) } : prev,
    );
  };

  const addPromoteRoleFromPicker = (value: string) => {
    const r = value as ManagedStaffRole;
    setPromote((prev) => (prev ? { ...prev, roles: new Set([...prev.roles, r]) } : prev));
    setPromoteRolePickerKey((k) => k + 1);
  };

  const removePromoteRole = (r: ManagedStaffRole) => {
    setPromote((prev) => {
      if (!prev) return prev;
      if (prev.roles.size <= 1) {
        toast.error("اختر رتبة واحدة على الأقل");
        return prev;
      }
      const next = new Set(prev.roles);
      next.delete(r);
      return { ...prev, roles: next };
    });
  };

  const handlePromoteSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!promote) return;
    const roles = Array.from(promote.roles);
    if (roles.length === 0) {
      toast.error("اختر رتبة واحدة على الأقل");
      return;
    }
    if (
      publicSessionUser?.id &&
      promote.publicUser.id === publicSessionUser.id &&
      promote.existingManaged &&
      !rolesSetsEqual(promote.roles, promote.existingManaged.roles)
    ) {
      toast.error("لا يمكنك تعديل رتبك الخاصة بنفسك — اطلب مشرفاً آخر.");
      return;
    }
    if (
      publicSessionUser?.id &&
      promote.publicUser.id === publicSessionUser.id &&
      !promote.existingManaged
    ) {
      toast.error("لا يمكنك ترقية حسابك العام بنفسك من هذه اللوحة.");
      return;
    }
    const wantedUsername = promote.publicUser.username.trim();
    const isExisting = !!promote.existingManaged;

    /** اسم مستخدم لوحة الموظف يجب ألا يتعارض مع موظف آخر */
    const conflict = loadManagedUsers().find(
      (m) => m.id !== promote.existingManaged?.id && m.username.toLowerCase() === wantedUsername.toLowerCase(),
    );
    if (conflict) {
      toast.error(`اسم «${wantedUsername}» مأخوذ بحساب موظف آخر — عدّل اسم المواطن أولاً`);
      return;
    }

    try {
      if (isExisting && promote.existingManaged) {
        const patch: Partial<Pick<ManagedUser, "username" | "password" | "roles" | "isActive">> = {
          username: wantedUsername,
          roles,
          isActive: true,
        };
        updateManagedUser(promote.existingManaged.id, patch);
      } else {
        /** كلمة المرور تترك فارغة عمداً — المواطن المرقّى يدخل عبر دسكورد/الحساب العام
         *  وتُتبنّى جلسة الموظف تلقائياً عبر PublicStaffLinkSync */
        addManagedUser({
          username: wantedUsername,
          password: "",
          roles,
          linkedPublicUserId: promote.publicUser.id,
        });
      }
    } catch (err) {
      const quotaFull =
        err instanceof DOMException && (err.name === "QuotaExceededError" || err.code === 22);
      toast.error(
        quotaFull
          ? "تعذر الحفظ. امسح بيانات الموقع أو احذف محتوى كبير."
          : "تعذر الحفظ في التخزين المحلي.",
      );
      return;
    }

    refresh();
    setPromoteOpen(false);
    const groupSummary =
      promote.appliedGroups.length > 0
        ? ` — مجموعات: ${promote.appliedGroups
            .map((id) => groups.find((g) => g.id === id)?.name)
            .filter(Boolean)
            .join("، ")}`
        : "";
    appendActivityLog(
      user?.username ?? "super_admin",
      isExisting ? "تحديث رتب موظف مرقّى" : "ترقية مواطن إلى موظف",
      `${promote.publicUser.username} — أدوار: ${roles.map(roleLabel).join("، ")}${groupSummary}`,
    );
    toast.success(
      isExisting ? "تم تحديث صلاحيات المواطن المرقّى" : "تم منح المواطن صلاحيات موظف",
    );
    setPromote(null);
  };

  const handleRevokePromotion = () => {
    if (!promote?.existingManaged) return;
    if (!guardSuperAdminDelete()) return;
    const guard = canDeleteManagedStaffTarget(promote.existingManaged);
    if (!guard.ok) {
      toast.error(guard.message ?? "لا يمكن إلغاء ترقية هذا الحساب.");
      return;
    }
    try {
      removeManagedUser(promote.existingManaged.id, deleteActorOptions);
    } catch (err) {
      if (err instanceof Error && err.message === "FORBIDDEN_DELETE_MANAGED_USER") {
        toast.error(SUPER_ADMIN_DELETE_ONLY_MESSAGE);
        return;
      }
      if (err instanceof Error && err.message === "PROTECTED_MANAGED_USER") {
        toast.error("لا يمكن إلغاء ترقية هذا الحساب.");
        return;
      }
      toast.error("تعذر إلغاء الترقية");
      return;
    }
    refresh();
    appendActivityLog(
      user?.username ?? "super_admin",
      "إلغاء ترقية مواطن",
      `${promote.publicUser.username} — تم إلغاء كل صلاحيات الموظف`,
    );
    toast.success("تم إلغاء الترقية وإزالة كل الصلاحيات");
    setPromoteOpen(false);
    setPromote(null);
  };

  const totalManaged = users.length;
  const totalPromoted = users.filter((u) => !!u.linkedPublicUserId).length;
  const totalCitizens = publicUsers.length;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="text-right">
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-50">المستخدمون والأدوار</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            المواطن يسجّل في الموقع بنفسه، ثم يرقّيه السوبر أدمن من قائمة المواطنين مع إسناد الرتب (من{" "}
            <Link to="/dashboard/role-groups" className="font-display text-rose-700 hover:underline">
              مجموعات الرتب
            </Link>{" "}
            أو لكل رتبة على حدة).
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            asChild
            type="button"
            variant="outline"
            className="border-rose-200 bg-white text-rose-700 hover:bg-rose-50 dark:border-rose-600 dark:bg-slate-800 dark:text-rose-300 dark:hover:bg-rose-950/40"
          >
            <Link to="/dashboard/role-groups">
              <Layers className="ms-2 h-4 w-4 shrink-0 text-current" />
              مجموعات الرتب
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={<ShieldCheck className="h-5 w-5 text-rose-600 dark:text-rose-400" />} label="موظفون" value={totalManaged} />
        <StatCard icon={<Crown className="h-5 w-5 text-amber-600 dark:text-amber-400" />} label="مرقّون من المواطنين" value={totalPromoted} />
        <StatCard icon={<Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />} label="مواطنون مسجّلون" value={totalCitizens} />
      </div>

      <div className="rounded-2xl border border-rose-200/80 bg-white/90 p-4 shadow-[0_14px_34px_-24px_rgba(127,29,29,0.45)] dark:border-slate-600 dark:bg-slate-800/90">
        <Label htmlFor="user-search" className="text-slate-700 dark:text-slate-200">
          البحث عن مستخدم
        </Label>
        <div className="relative mt-1.5">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rose-500 dark:text-rose-400" />
          <Input
            id="user-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-rose-200 bg-rose-50/40 pr-9 text-slate-900 placeholder:text-slate-400 focus-visible:ring-rose-400 dark:border-slate-600 dark:bg-slate-900/50 dark:text-slate-100 dark:placeholder:text-slate-500"
            placeholder="اكتب اسم المستخدم أو الإيميل للبحث..."
            autoComplete="off"
          />
        </div>
      </div>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditForm(null);
        }}
      >
        <DialogContent
          dir="rtl"
          className="max-h-[min(90dvh,42rem)] overflow-y-auto border-slate-200/95 bg-white text-right shadow-[0_28px_72px_-24px_rgba(15,23,42,0.38)] sm:max-w-2xl sm:rounded-2xl"
        >
          <DialogHeader>
            <DialogTitle className="font-display text-slate-900">تعديل موظف</DialogTitle>
            <DialogDescription className="text-slate-600">
              غيّر اسم المستخدم والرتب. يمكنك تطبيق مجموعة لإضافة عدة رتب.
              {editStaffLinkedToPublic
                ? " الموظفون المربوطون بمواطن يدخلون عبر حسابهم العام — لا تُستخدم كلمة مرور منفصلة للوحة."
                : " كلمة مرور لوحة الموظف اختيارية عند التعديل: اترك الحقل فارغاً للإبقاء على الحالية."}
            </DialogDescription>
          </DialogHeader>
          {editForm ? (
            <form onSubmit={handleEditSave} className="space-y-4" noValidate>
              {cannotEditOwnStaffRoles ? (
                <p className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm leading-relaxed text-amber-950">
                  هذا السجل مرتبط بحسابك العام الحالي. يمكنك تعديل اسم المستخدم
                  {!editStaffLinkedToPublic ? " أو كلمة مرور لوحة الموظف" : ""}، أما{" "}
                  <span className="font-semibold">الرتب</span> فلا يمكنك تغييرها لنفسك — اطلب مشرفاً آخر.
                </p>
              ) : null}
              <div className={cn("grid gap-3", editStaffLinkedToPublic ? "sm:grid-cols-1" : "sm:grid-cols-2")}>
                <div>
                  <Label htmlFor="edit-user" className="text-slate-700">اسم المستخدم</Label>
                  <Input
                    id="edit-user"
                    value={editForm.username}
                    onChange={(e) => setEditForm((prev) => (prev ? { ...prev, username: e.target.value } : prev))}
                    className="mt-1.5 border-rose-200 bg-rose-50/40 text-slate-900 placeholder:text-slate-400 focus-visible:ring-rose-400"
                    autoComplete="off"
                  />
                </div>
                {!editStaffLinkedToPublic ? (
                  <div>
                    <Label htmlFor="edit-pass" className="text-slate-700">كلمة مرور لوحة الموظف (اختياري)</Label>
                    <Input
                      id="edit-pass"
                      type="password"
                      value={editForm.password}
                      onChange={(e) => setEditForm((prev) => (prev ? { ...prev, password: e.target.value } : prev))}
                      className="mt-1.5 border-rose-200 bg-rose-50/40 text-slate-900 placeholder:text-slate-400 focus-visible:ring-rose-400"
                      autoComplete="new-password"
                      placeholder="اتركها فارغة للإبقاء على الحالية"
                    />
                  </div>
                ) : null}
              </div>

              {groups.length > 0 ? (
                <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/40 p-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="grp-pick-edit" className="text-amber-900">
                      تطبيق مجموعة جاهزة
                    </Label>
                    <Layers className="h-4 w-4 text-amber-600" />
                  </div>
                  <Select
                    key={`grp-edit-${editGroupPickerKey}`}
                    disabled={cannotEditOwnStaffRoles}
                    onValueChange={(v) => v && applyGroupToEdit(v)}
                  >
                    <SelectTrigger
                      id="grp-pick-edit"
                      type="button"
                      className="border-amber-300 bg-white text-right [&>span]:text-right"
                      dir="rtl"
                    >
                      <SelectValue placeholder="اختر مجموعة لإضافة رتبها" />
                    </SelectTrigger>
                    <SelectContent dir="rtl" className="max-h-72 border-amber-200 bg-white">
                      {groups.map((g) => (
                        <SelectItem
                          key={g.id}
                          value={g.id}
                          className="text-right text-slate-800 focus:bg-amber-50 focus:text-amber-900"
                        >
                          {g.name} <span className="text-[10px] text-slate-500">({g.roles.length} رتبة)</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {editForm.appliedGroups.length > 0 ? (
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {editForm.appliedGroups.map((gid) => {
                        const g = groups.find((x) => x.id === gid);
                        if (!g) return null;
                        return (
                          <span
                            key={gid}
                            className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-white px-2.5 py-0.5 text-[11px] font-display text-amber-800"
                          >
                            <Layers className="h-3 w-3" />
                            {g.name}
                            <button
                              type="button"
                              disabled={cannotEditOwnStaffRoles}
                              onClick={() => removeEditGroupChip(gid)}
                              className="rounded-full p-0.5 text-amber-700 hover:bg-amber-100"
                              aria-label={`إزالة شارة ${g.name}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="space-y-3">
                <Label htmlFor="edit-role-picker" className="text-slate-700">إضافة رتبة فردية</Label>
                <Select
                  key={editRolePickerKey}
                  disabled={cannotEditOwnStaffRoles || !editHasAvailableRoles}
                  onValueChange={(v) => v && addEditRoleFromPicker(v)}
                >
                  <SelectTrigger
                    id="edit-role-picker"
                    type="button"
                    className="border-rose-200 bg-rose-50/40 text-right [&>span]:text-right [&>span]:text-slate-700"
                    dir="rtl"
                  >
                    <SelectValue
                      placeholder={editHasAvailableRoles ? "اختر رتبة لإضافتها" : "تم اختيار كل الرتب"}
                    />
                  </SelectTrigger>
                  <SelectContent dir="rtl" className="max-h-[min(70vh,24rem)] border-rose-200 bg-white">
                    {BASE_ROLES.some((b) => !editForm.roles.has(b.value)) ? (
                      <SelectGroup>
                        <SelectLabel className="text-right text-slate-500">رتب عامة</SelectLabel>
                        {BASE_ROLES.filter((b) => !editForm.roles.has(b.value)).map((b) => (
                          <SelectItem
                            key={b.value}
                            value={b.value}
                            className="text-right text-slate-800 focus:bg-rose-50 focus:text-rose-900"
                          >
                            {b.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ) : null}
                    {INSTITUTION_ROSTER_STAFF_ROLES.some((r) => !editForm.roles.has(r)) ? (
                      <SelectGroup>
                        <SelectLabel className="text-right text-slate-500">طواقم المؤسسات</SelectLabel>
                        {INSTITUTION_ROSTER_STAFF_ROLES.filter((r) => !editForm.roles.has(r)).map((r) => (
                          <SelectItem
                            key={r}
                            value={r}
                            className="text-right text-slate-800 focus:bg-rose-50 focus:text-rose-900"
                          >
                            {institutionRosterStaffRoleLabelAr(r)}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ) : null}
                  </SelectContent>
                </Select>
                <div>
                  <p className="mb-2 text-xs font-medium text-slate-500">الرتب المختارة</p>
                  <div className="flex min-h-[2.5rem] flex-wrap justify-end gap-2 rounded-xl border border-rose-200 bg-rose-50/55 p-3">
                    {Array.from(editForm.roles).map((r) => (
                      <span
                        key={r}
                        className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-rose-300 bg-white px-3 py-1 text-xs font-medium text-rose-900 shadow-sm"
                      >
                        <span className="truncate">{roleLabel(r)}</span>
                        <button
                          type="button"
                          disabled={cannotEditOwnStaffRoles}
                          className="shrink-0 rounded-full p-0.5 text-rose-700 hover:bg-rose-200/80 disabled:pointer-events-none disabled:opacity-40"
                          aria-label={`إزالة ${roleLabel(r)}`}
                          onClick={() => removeEditRole(r)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter className="gap-2 sm:justify-start">
                <Button
                  type="button"
                  variant="outline"
                  className="border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
                  onClick={() => {
                    setEditOpen(false);
                    setEditForm(null);
                  }}
                >
                  إلغاء
                </Button>
                <Button type="submit" className="bg-[#36164f] text-white hover:bg-[#2f1344] dark:bg-rose-700 dark:hover:bg-rose-600">
                  حفظ التعديلات
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <div className="overflow-hidden rounded-2xl border border-rose-200/80 bg-white/95 shadow-[0_18px_44px_-28px_rgba(127,29,29,0.45)] dark:border-slate-600 dark:bg-slate-800/95">
        <div className="flex items-center justify-between border-b border-rose-100 px-4 py-3 text-right font-display text-sm font-semibold text-slate-800 dark:border-slate-600 dark:text-slate-100">
          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-display text-rose-700 dark:bg-rose-950/55 dark:text-rose-200">
            {list.length}
          </span>
          <span className="flex items-center gap-2">
            الموظفون
            <ShieldCheck className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          </span>
        </div>
        <ul className="divide-y divide-rose-100 dark:divide-slate-600">
          {list.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              {searchQuery.trim() ? "لا توجد نتائج مطابقة للبحث." : "لا يوجد موظفون بعد."}
            </li>
          ) : (
            list.map((u) => {
              const isPromoted = !!u.linkedPublicUserId;
              return (
                <li
                  key={u.id}
                  className="grid gap-3 px-4 py-3 text-right sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4"
                >
                  <div className="min-w-0 space-y-2">
                    <p className="flex flex-wrap items-center gap-2 font-medium text-slate-900 dark:text-slate-50">
                      <span className="truncate">{u.username}</span>
                      <span
                        className={cn(
                          "inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px]",
                          u.isActive === false
                            ? "bg-rose-50 text-rose-700 dark:bg-rose-950/45 dark:text-rose-200"
                            : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200",
                        )}
                      >
                        {u.isActive === false ? "موقوف" : "نشط"}
                      </span>
                      {isPromoted ? (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-display text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
                          <Crown className="h-3 w-3 text-amber-700 dark:text-amber-300" />
                          مواطن مرقّى
                        </span>
                      ) : null}
                    </p>
                    <ManagedRolesDropdown roles={u.roles} />
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-1.5 sm:shrink-0 sm:justify-start">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-rose-200 bg-white text-rose-700 hover:bg-rose-50 dark:border-rose-600 dark:bg-slate-800 dark:text-rose-300 dark:hover:bg-rose-950/40"
                      onClick={() => openEdit(u)}
                    >
                      <Pencil className="h-4 w-4 ms-1 shrink-0 text-current" />
                      تعديل
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn(
                        "border",
                        u.isActive === false
                          ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/35 dark:text-emerald-200 dark:hover:bg-emerald-950/55"
                          : "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-950/60",
                      )}
                      onClick={() => handleToggleStaffUser(u.id, u.username, u.isActive !== false)}
                    >
                      {u.isActive === false ? "تفعيل" : "إيقاف"}
                    </Button>
                    {isSuperAdmin ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-200 dark:hover:bg-rose-950/65"
                        onClick={() => handleRemove(u.id, u.username)}
                      >
                        <Trash2 className="h-4 w-4 ms-1 shrink-0 text-current" />
                        حذف
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </div>

      <Dialog
        open={editPublicOpen}
        onOpenChange={(open) => {
          setEditPublicOpen(open);
          if (!open) setEditPublicForm(null);
        }}
      >
        <DialogContent
          dir="rtl"
          className="max-h-[min(90dvh,40rem)] overflow-y-auto border-slate-200/95 bg-white text-right shadow-[0_28px_72px_-24px_rgba(15,23,42,0.38)] sm:max-w-lg sm:rounded-2xl"
        >
          <DialogHeader>
            <DialogTitle className="font-display text-slate-900">تعديل مستخدم عادي</DialogTitle>
            <DialogDescription className="text-slate-600">
              تعديل بيانات الحساب العادي أو إيقافه. كل حقل موضح بعنوانه حتى تعرف البيانات التي يتم تعديلها.
            </DialogDescription>
          </DialogHeader>
          {editPublicForm ? (
            <form onSubmit={handleSavePublicEdit} className="space-y-3" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="edit-public-username" className="text-slate-700">
                  اسم المستخدم للحساب
                </Label>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  هذا هو اسم تسجيل الدخول أو المعرف الداخلي للحساب في الموقع.
                </p>
                <Input
                  id="edit-public-username"
                  value={editPublicForm.username}
                  onChange={(e) => setEditPublicForm((p) => (p ? { ...p, username: e.target.value } : p))}
                  placeholder="اسم المستخدم"
                  className="border-rose-200 bg-white text-slate-900"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-public-real" className="text-slate-700">
                  الاسم على Discord
                </Label>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  الاسم المعروض + اسم المستخدم كما على Discord في سطر واحد.
                </p>
                <Input
                  id="edit-public-real"
                  value={editPublicForm.realName}
                  onChange={(e) => setEditPublicForm((p) => (p ? { ...p, realName: e.target.value } : p))}
                  placeholder="مثال: الاسم المعروض username"
                  className="border-rose-200 bg-white text-slate-900"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-public-city-name" className="text-slate-700">
                  الاسم داخل المدينة
                </Label>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  اسم شخصية اللاعب داخل المدينة، ويفضل أن يكون من جزئين بالعربي.
                </p>
                <Input
                  id="edit-public-city-name"
                  value={editPublicForm.fullName}
                  onChange={(e) => setEditPublicForm((p) => (p ? { ...p, fullName: e.target.value } : p))}
                  placeholder="الاسم داخل المدينة"
                  className="border-rose-200 bg-white text-slate-900"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-public-email" className="text-slate-700">
                  البريد الإلكتروني
                </Label>
                <Input
                  id="edit-public-email"
                  value={editPublicForm.email}
                  onChange={(e) => setEditPublicForm((p) => (p ? { ...p, email: e.target.value } : p))}
                  placeholder="الإيميل"
                  className="border-rose-200 bg-white text-slate-900"
                  dir="ltr"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-public-discord-id" className="text-slate-700">
                  Discord ID
                </Label>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  الرقم التعريفي لحساب Discord المرتبط بالمستخدم.
                </p>
                <Input
                  id="edit-public-discord-id"
                  value={editPublicForm.discordId}
                  onChange={(e) => setEditPublicForm((p) => (p ? { ...p, discordId: e.target.value } : p))}
                  placeholder="Discord ID"
                  className="border-rose-200 bg-white text-slate-900"
                  dir="ltr"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-public-age" className="text-slate-700">
                  العمر
                </Label>
                <Input
                  id="edit-public-age"
                  value={String(editPublicForm.age)}
                  onChange={(e) => setEditPublicForm((p) => (p ? { ...p, age: Number(e.target.value) || 0 } : p))}
                  placeholder="العمر"
                  className="border-rose-200 bg-white text-slate-900"
                  inputMode="numeric"
                />
              </div>
              <div className="flex justify-end">
                <Button type="button" variant="outline" className={cn("border px-3", editPublicForm.isActive ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100" : "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100")} onClick={() => setEditPublicForm((p) => (p ? { ...p, isActive: !p.isActive } : p))}>
                  {editPublicForm.isActive ? "إيقاف الحساب" : "تفعيل الحساب"}
                </Button>
              </div>
              <DialogFooter className="gap-2 sm:justify-start">
                <Button type="button" variant="outline" className="border-rose-200 bg-white text-rose-700 hover:bg-rose-50" onClick={() => setEditPublicOpen(false)}>إلغاء</Button>
                <Button type="submit" className="bg-[#36164f] text-white hover:bg-[#2f1344] dark:bg-rose-700 dark:hover:bg-rose-600">حفظ التعديل</Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={promoteOpen}
        onOpenChange={(open) => {
          setPromoteOpen(open);
          if (!open) setPromote(null);
        }}
      >
        <DialogContent
          dir="rtl"
          className="max-h-[min(92dvh,46rem)] overflow-y-auto border-slate-200/95 bg-white text-right shadow-[0_28px_72px_-24px_rgba(15,23,42,0.38)] dark:border-slate-600 dark:bg-slate-900 sm:max-w-2xl sm:rounded-2xl"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center justify-end gap-2 font-display text-slate-900 dark:text-slate-50">
              <Crown className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              {promote?.existingManaged ? "تحديث صلاحيات مواطن مرقّى" : "ترقية مواطن إلى موظف"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {promote?.existingManaged ? "تحديث صلاحيات مواطن مرقّى" : "ترقية مواطن إلى موظف"}
            </DialogDescription>
          </DialogHeader>
          {promote ? (
            <form onSubmit={handlePromoteSubmit} className="space-y-5" noValidate>
              <div className="rounded-xl border border-amber-200 bg-gradient-to-l from-amber-50 via-white to-amber-50 p-4 dark:border-amber-800/55 dark:bg-gradient-to-l dark:from-amber-950/35 dark:via-slate-800 dark:to-amber-950/35">
                <p className="font-display text-base font-bold text-slate-900 dark:text-slate-50">{promote.publicUser.fullName}</p>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  اسم الحساب: <span className="font-mono text-slate-800 dark:text-slate-200">{promote.publicUser.username}</span>
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  الإيميل: <span dir="ltr" className="font-mono">{promote.publicUser.email}</span>
                </p>
                {promote.publicUser.discordId && promote.publicUser.discordId !== "—" ? (
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Discord: <span dir="ltr" className="font-mono">{promote.publicUser.discordId}</span>
                  </p>
                ) : null}
                {promote.existingManaged ? (
                  <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-display text-amber-900 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-200">
                    <ShieldCheck className="h-3 w-3 text-amber-700 dark:text-amber-400" />
                    له ملف موظف بالفعل — التحديث يحلّ محل صلاحياته الحالية
                  </p>
                ) : null}
              </div>

              {promoteTargetsOwnPublicAccount ? (
                <p className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm leading-relaxed text-amber-950 dark:border-amber-800 dark:bg-amber-950/35 dark:text-amber-100">
                  هذا المواطن هو نفس حسابك العام الحالي. لا يمكنك تعديل صلاحياتك أو رتبك من هذه النافذة بنفسك — اطلب
                  مشرفاً آخر.
                </p>
              ) : null}

              {groups.length > 0 ? (
                <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/40 p-3 dark:border-amber-800/50 dark:bg-amber-950/20">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="grp-pick-promote" className="text-amber-900 dark:text-amber-200">
                      تطبيق مجموعة جاهزة (يضيف كل رتبها)
                    </Label>
                    <Layers className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <Select
                    key={`grp-promote-${promoteGroupPickerKey}`}
                    disabled={promoteTargetsOwnPublicAccount}
                    onValueChange={(v) => v && applyGroupToPromote(v)}
                  >
                    <SelectTrigger
                      id="grp-pick-promote"
                      type="button"
                      className="border-amber-300 bg-white text-right text-slate-900 [&>span]:text-right dark:border-amber-700 dark:bg-slate-800 dark:text-slate-100 [&>span]:dark:text-slate-100"
                      dir="rtl"
                    >
                      <SelectValue placeholder="اختر مجموعة لإضافة كل رتبها" />
                    </SelectTrigger>
                    <SelectContent dir="rtl" className="max-h-72 border-amber-200 bg-white dark:border-slate-600 dark:bg-slate-900">
                      {groups.map((g) => (
                        <SelectItem
                          key={g.id}
                          value={g.id}
                          className="text-right text-slate-800 focus:bg-amber-50 focus:text-amber-900 dark:text-slate-200 dark:focus:bg-amber-950/50 dark:focus:text-amber-100"
                        >
                          {g.name} <span className="text-[10px] text-slate-500">({g.roles.length} رتبة)</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {promote.appliedGroups.length > 0 ? (
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {promote.appliedGroups.map((gid) => {
                        const g = groups.find((x) => x.id === gid);
                        if (!g) return null;
                        return (
                          <span
                            key={gid}
                            className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-white px-2.5 py-0.5 text-[11px] font-display text-amber-800 dark:border-amber-600 dark:bg-slate-800 dark:text-amber-200"
                          >
                            <Layers className="h-3 w-3 text-amber-700 dark:text-amber-400" />
                            {g.name}
                            <button
                              type="button"
                              disabled={promoteTargetsOwnPublicAccount}
                              onClick={() => removePromoteGroupChip(gid)}
                              className="rounded-full p-0.5 text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-950/60"
                              aria-label={`إزالة شارة ${g.name}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="rounded-lg border border-amber-200 bg-amber-50/40 p-2 text-[11px] text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/25 dark:text-amber-200">
                  نصيحة: أنشئ <Link to="/dashboard/role-groups" className="underline">مجموعات رتب</Link> لاستخدامها بنقرة واحدة.
                </p>
              )}

              <div className="space-y-3">
                <Label htmlFor="promote-role-picker" className="text-slate-700 dark:text-slate-200">
                  إضافة رتبة فردية
                </Label>
                <Select
                  key={promoteRolePickerKey}
                  disabled={promoteTargetsOwnPublicAccount || !promoteHasAvailableRoles}
                  onValueChange={(v) => v && addPromoteRoleFromPicker(v)}
                >
                  <SelectTrigger
                    id="promote-role-picker"
                    type="button"
                    className="border-rose-200 bg-rose-50/40 text-right text-slate-900 [&>span]:text-right [&>span]:text-slate-700 dark:border-rose-700 dark:bg-rose-950/35 dark:text-slate-100 [&>span]:dark:text-slate-200"
                    dir="rtl"
                  >
                    <SelectValue
                      placeholder={promoteHasAvailableRoles ? "اختر رتبة لإضافتها" : "تم اختيار كل الرتب"}
                    />
                  </SelectTrigger>
                  <SelectContent dir="rtl" className="max-h-[min(70vh,24rem)] border-rose-200 bg-white dark:border-slate-600 dark:bg-slate-900">
                    {BASE_ROLES.some((b) => !promote.roles.has(b.value)) ? (
                      <SelectGroup>
                        <SelectLabel className="text-right text-slate-500 dark:text-slate-400">رتب عامة</SelectLabel>
                        {BASE_ROLES.filter((b) => !promote.roles.has(b.value)).map((b) => (
                          <SelectItem
                            key={b.value}
                            value={b.value}
                            className="text-right text-slate-800 focus:bg-rose-50 focus:text-rose-900 dark:text-slate-200 dark:focus:bg-rose-950/45 dark:focus:text-rose-100"
                          >
                            {b.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ) : null}
                    {INSTITUTION_ROSTER_STAFF_ROLES.some((r) => !promote.roles.has(r)) ? (
                      <SelectGroup>
                        <SelectLabel className="text-right text-slate-500 dark:text-slate-400">طواقم المؤسسات</SelectLabel>
                        {INSTITUTION_ROSTER_STAFF_ROLES.filter((r) => !promote.roles.has(r)).map((r) => (
                          <SelectItem
                            key={r}
                            value={r}
                            className="text-right text-slate-800 focus:bg-rose-50 focus:text-rose-900 dark:text-slate-200 dark:focus:bg-rose-950/45 dark:focus:text-rose-100"
                          >
                            {institutionRosterStaffRoleLabelAr(r)}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ) : null}
                  </SelectContent>
                </Select>
                <div>
                  <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">الرتب التي ستُمنح للمواطن</p>
                  <div className="flex min-h-[2.5rem] flex-wrap justify-end gap-2 rounded-xl border border-rose-200 bg-rose-50/55 p-3 dark:border-rose-700/60 dark:bg-rose-950/25">
                    {Array.from(promote.roles).length === 0 ? (
                      <p className="text-xs text-slate-500 dark:text-slate-400">لم تُضف رتب بعد</p>
                    ) : null}
                    {Array.from(promote.roles).map((r) => (
                      <span
                        key={r}
                        className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-rose-300 bg-white px-3 py-1 text-xs font-medium text-rose-900 shadow-sm dark:border-rose-600 dark:bg-slate-800 dark:text-rose-200"
                      >
                        <span className="truncate">{roleLabel(r)}</span>
                        <button
                          type="button"
                          disabled={promoteTargetsOwnPublicAccount}
                          className="shrink-0 rounded-full p-0.5 text-rose-700 hover:bg-rose-200/80 disabled:pointer-events-none disabled:opacity-40 dark:text-rose-300 dark:hover:bg-rose-950/70"
                          aria-label={`إزالة ${roleLabel(r)}`}
                          onClick={() => removePromoteRole(r)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                {promote.existingManaged ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-200 dark:hover:bg-rose-950/65"
                    onClick={handleRevokePromotion}
                  >
                    <Trash2 className="ms-2 h-4 w-4 shrink-0 text-current" />
                    إلغاء كل الصلاحيات
                  </Button>
                ) : (
                  <span />
                )}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-rose-200 bg-white text-rose-700 hover:bg-rose-50 dark:border-rose-600 dark:bg-slate-800 dark:text-rose-300 dark:hover:bg-rose-950/40"
                    onClick={() => setPromoteOpen(false)}
                  >
                    إلغاء
                  </Button>
                  <Button type="submit" className="bg-[#36164f] text-white hover:bg-[#2f1344] dark:bg-rose-700 dark:hover:bg-rose-600">
                    <Crown className="ms-2 h-4 w-4 shrink-0 text-white" />
                    {promote.existingManaged ? "تحديث الصلاحيات" : "منح صلاحيات الموظف"}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <div className="overflow-hidden rounded-2xl border border-rose-200/80 bg-white/95 shadow-[0_18px_44px_-28px_rgba(127,29,29,0.45)] dark:border-slate-600 dark:bg-slate-800/95">
        <div className="flex items-center justify-between border-b border-rose-100 px-4 py-3 text-right font-display text-sm font-semibold text-slate-800 dark:border-slate-600 dark:text-slate-100">
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-display text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
            {publicList.length}
          </span>
          <span className="flex items-center gap-2">
            المواطنون (مسجّلون ذاتياً)
            <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </span>
        </div>
        <ul className="divide-y divide-rose-100 dark:divide-slate-600">
          {publicList.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              {searchQuery.trim() ? "لا توجد نتائج مطابقة للبحث." : "لا يوجد مواطنون مسجّلون بعد."}
            </li>
          ) : (
            publicList.map((u) => {
              const linked = linkedManagedByPublicId.get(u.id);
              const citizenElectronicApproved =
                approvedCitizenPublicIds.has(u.id) ||
                applications.some(
                  (app) =>
                    app.roleKey === "citizen" &&
                    app.status === "approved" &&
                    applicationMatchesPublicRow(app, u),
                );
              return (
                <li
                  key={u.id}
                  className="grid gap-3 px-4 py-3 text-right sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-4"
                >
                  <div className="min-w-0 space-y-2">
                    <p className="flex flex-wrap items-center gap-2 font-medium text-slate-900 dark:text-slate-50">
                      <span className="truncate">{u.username}</span>
                      <span
                        className={cn(
                          "inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px]",
                          u.isActive
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
                            : "bg-rose-50 text-rose-700 dark:bg-rose-950/45 dark:text-rose-200",
                        )}
                      >
                        {u.isActive ? "نشط" : "موقوف"}
                      </span>
                      {linked ? (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-display text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
                          <Crown className="h-3 w-3 text-amber-700 dark:text-amber-300" />
                          مرقّى كموظف
                        </span>
                      ) : null}
                      {citizenElectronicApproved ? (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-display text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
                          <ShieldCheck className="h-3 w-3 text-emerald-700 dark:text-emerald-300" />
                          تقديم إلكتروني مفعّل
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                      <span className="text-slate-500 dark:text-slate-500">داخل المدينة:</span> {u.fullName}
                      <span className="mx-1.5 text-slate-300 dark:text-slate-600">|</span>
                      <span className="text-slate-500 dark:text-slate-500">Discord:</span> {u.realName}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-500">{u.email}</p>
                    {linked ? (
                      <div className="pt-0.5">
                        <ManagedRolesDropdown roles={linked.roles} listLabel="صلاحيات الترقية" />
                      </div>
                    ) : null}
                  </div>
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
                    <span className="text-center text-[11px] text-slate-500 sm:text-end">
                      {u.createdAt ? new Date(u.createdAt).toLocaleString("ar") : "—"}
                    </span>
                    <div className="flex flex-wrap justify-center gap-1.5 sm:justify-end">
                    <Button
                      type="button"
                      size="sm"
                      className={cn(
                        "font-display",
                        linked
                          ? "bg-amber-600 text-white hover:bg-amber-700"
                          : "bg-gradient-to-l from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700",
                      )}
                      onClick={() => openPromote(u)}
                    >
                      {linked ? (
                        <>
                          <UserCog className="h-4 w-4 ms-1 shrink-0 text-white" />
                          تعديل الصلاحيات
                        </>
                      ) : (
                        <>
                          <Crown className="h-4 w-4 ms-1 shrink-0 text-white" />
                          ترقية إلى موظف
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-rose-200 bg-white text-rose-700 hover:bg-rose-50 dark:border-rose-600 dark:bg-slate-800 dark:text-rose-300 dark:hover:bg-rose-950/40"
                      onClick={() => {
                        setEditPublicForm({ ...u, password: "" });
                        setEditPublicOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4 ms-1 shrink-0 text-current" />
                      تعديل
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn(
                        "border",
                        u.isActive
                          ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-950/60"
                          : "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/35 dark:text-emerald-200 dark:hover:bg-emerald-950/55",
                      )}
                      onClick={() => handleTogglePublicUser(u.id)}
                    >
                      {u.isActive ? "إيقاف" : "تفعيل"}
                    </Button>
                    {!citizenElectronicApproved && isSuperAdmin ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        title="للمسؤول الأعلى فقط: قبول تقديم المواطن إدارياً دون تعبئة النموذج أو اختبار القوانين."
                        className="border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/35 dark:text-emerald-200 dark:hover:bg-emerald-950/55"
                        onClick={() => handleGrantCitizenElectronicApply(u)}
                      >
                        <ShieldCheck className="h-4 w-4 ms-1 shrink-0 text-current" />
                        تفعيل التقديم (سوبر أدمن)
                      </Button>
                    ) : null}
                    {citizenElectronicApproved && isSuperAdmin ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        title="للمسؤول الأعلى فقط: إزالة قبول تقديم المواطن حتى يُعاد التقديم عبر النموذج."
                        className="border-slate-300 bg-slate-50 text-slate-800 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900/50 dark:text-slate-200 dark:hover:bg-slate-900/80"
                        onClick={() => handleRevokeCitizenElectronicApply(u)}
                      >
                        <X className="h-4 w-4 ms-1 shrink-0 text-current" />
                        إلغاء التقديم
                      </Button>
                    ) : null}
                    {isSuperAdmin ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-200 dark:hover:bg-rose-950/65"
                        onClick={() => handleDeletePublicUser(u.id)}
                      >
                        <Trash2 className="h-4 w-4 ms-1 shrink-0 text-current" />
                        حذف
                      </Button>
                    ) : null}
                    </div>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
};

export default StaffUsersPage;

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-white px-4 py-3 text-right shadow-sm dark:border-slate-600 dark:bg-slate-800">
      <div className="rounded-xl bg-rose-50 p-2 dark:bg-rose-950/45">{icon}</div>
      <div>
        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <p className="font-display text-2xl font-bold text-slate-900 dark:text-slate-50">{value}</p>
      </div>
    </div>
  );
}
