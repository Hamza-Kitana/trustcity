import { useMemo, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import {
  AlertTriangle,
  Boxes,
  Check,
  CheckCircle2,
  Layers,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useRoleGroups } from "@/contexts/RoleGroupsContext";
import {
  INSTITUTION_ROSTER_STAFF_ROLES,
  institutionRosterStaffRoleLabelAr,
  isInstitutionRosterStaffRole,
} from "@/data/institutionBranches";
import type { ManagedStaffRole } from "@/staff/staffDirectory";
import type { StaffRoleGroup } from "@/staff/roleGroups";
import { appendActivityLog } from "@/lib/activityLog";
import { TICKET_STAFF_ROLE_OPTIONS } from "@/lib/ticketTypesConfig";
import {
  adminCard,
  adminInput,
  adminPageDesc,
  adminPageWrap,
  adminStatCard,
  adminTitleIcon,
} from "@/lib/adminUi";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const BASE_ROLES: { value: ManagedStaffRole; label: string }[] = [
  { value: "laws_editor", label: "محرر القوانين" },
  { value: "streamer_manager", label: "ستريمر منجر" },
  { value: "gang_manager", label: "مدير العصابات" },
  { value: "vip_cars_manager", label: "مدير سيارات VIP" },
  { value: "houses_manager", label: "مدير البيوت" },
  { value: "packages_manager", label: "مدير البكجات" },
  { value: "investments_manager", label: "مدير الاستثمار" },
  { value: "application_reviewer", label: "مراجع التقديمات" },
  { value: "about_manager", label: "مدير من نحن" },
  { value: "store_orders_manager", label: "طلبات المتاجر" },
  ...TICKET_STAFF_ROLE_OPTIONS.map((o) => ({ value: o.value as ManagedStaffRole, label: o.label })),
];

function roleLabel(r: ManagedStaffRole): string {
  if (isInstitutionRosterStaffRole(r)) return institutionRosterStaffRoleLabelAr(r);
  return BASE_ROLES.find((b) => b.value === r)?.label ?? r;
}

type FormState = {
  id: string | null;
  name: string;
  description: string;
  roles: Set<ManagedStaffRole>;
};

const emptyForm = (): FormState => ({
  id: null,
  name: "",
  description: "",
  roles: new Set<ManagedStaffRole>(),
});

const RoleGroupsPage = () => {
  const { isSuperAdmin, user } = useAuth();
  const { groups, createGroup, editGroup, deleteGroup } = useRoleGroups();

  const [search, setSearch] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState<FormState>(() => emptyForm());
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        (g.description ?? "").toLowerCase().includes(q) ||
        g.roles.some((r) => roleLabel(r).toLowerCase().includes(q)),
    );
  }, [groups, search]);

  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const openCreate = () => {
    setForm(emptyForm());
    setEditorOpen(true);
  };

  const openEdit = (group: StaffRoleGroup) => {
    setForm({
      id: group.id,
      name: group.name,
      description: group.description ?? "",
      roles: new Set(group.roles),
    });
    setEditorOpen(true);
  };

  const toggleRole = (r: ManagedStaffRole) => {
    setForm((prev) => {
      const next = new Set(prev.roles);
      if (next.has(r)) next.delete(r);
      else next.add(r);
      return { ...prev, roles: next };
    });
  };

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    if (name.length < 2) {
      toast.error("اسم المجموعة قصير جداً");
      return;
    }
    if (form.roles.size === 0) {
      toast.error("اختر رتبة واحدة على الأقل للمجموعة");
      return;
    }
    const duplicate = groups.find(
      (g) => g.id !== form.id && g.name.trim().toLowerCase() === name.toLowerCase(),
    );
    if (duplicate) {
      toast.error("يوجد مجموعة بنفس الاسم");
      return;
    }
    const roles = [...form.roles];
    const description = form.description.trim() || undefined;
    if (form.id) {
      editGroup(form.id, { name, description, roles });
      appendActivityLog(
        user?.username ?? "super_admin",
        "تعديل مجموعة رتب",
        `${name} — ${roles.length} رتبة`,
      );
      toast.success("تم تحديث المجموعة");
    } else {
      createGroup({ name, description, roles });
      appendActivityLog(
        user?.username ?? "super_admin",
        "إضافة مجموعة رتب",
        `${name} — ${roles.length} رتبة`,
      );
      toast.success("تمت إضافة المجموعة");
    }
    setEditorOpen(false);
    setForm(emptyForm());
  };

  const handleDelete = () => {
    if (!confirmDelete) return;
    deleteGroup(confirmDelete.id);
    appendActivityLog(user?.username ?? "super_admin", "حذف مجموعة رتب", confirmDelete.name);
    toast.success("تم حذف المجموعة");
    setConfirmDelete(null);
  };

  const totalGroups = groups.length;
  const totalRolesAcross = groups.reduce((sum, g) => sum + g.roles.length, 0);
  const avgPerGroup = totalGroups ? (totalRolesAcross / totalGroups).toFixed(1) : "0";

  return (
    <div className={cn(adminPageWrap, "max-w-6xl space-y-6")}>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="text-right">
          <h1 className="flex items-center justify-end gap-2 font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            <Layers className={adminTitleIcon} />
            مجموعات الرتب
          </h1>
          <p className={adminPageDesc}>
            أنشئ مجموعات جاهزة من الرتب لاستخدامها مرات متعددة عند إعطاء صلاحيات لموظف أو مواطن مرقّى.
            مجرد اختيار المجموعة يضيف كل رتبها دفعة واحدة.
          </p>
        </div>
        <Button
          type="button"
          className="bg-[#36164f] font-display text-white hover:bg-[#2f1344] dark:bg-rose-700 dark:hover:bg-rose-600"
          onClick={openCreate}
        >
          <Plus className="ms-2 h-4 w-4" />
          مجموعة جديدة
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className={adminStatCard}>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">عدد المجموعات</p>
          <p className="mt-1 font-display text-2xl font-bold text-rose-700 dark:text-rose-300">{totalGroups}</p>
        </div>
        <div className={adminStatCard}>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">متوسط رتب لكل مجموعة</p>
          <p className="mt-1 font-display text-2xl font-bold text-indigo-700 dark:text-indigo-300">{avgPerGroup}</p>
        </div>
      </div>

      <div className={cn(adminCard, "p-4")}>
        <Label htmlFor="group-search" className="text-slate-700 dark:text-slate-200">
          بحث
        </Label>
        <div className="relative mt-1.5">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rose-500" />
          <Input
            id="group-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث باسم المجموعة، الوصف، أو رتبة بداخلها..."
            className={cn(adminInput, "pr-9")}
            autoComplete="off"
          />
        </div>
      </div>

      <div className={cn(adminCard, "overflow-hidden p-0")}>
        <div className="border-b border-slate-200/90 px-4 py-3 text-right font-display text-sm font-semibold text-slate-800 dark:border-slate-600 dark:text-slate-100">
          المجموعات ({filtered.length})
        </div>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-14 text-center text-sm text-slate-500 dark:text-slate-400">
            <Boxes className="h-9 w-9 text-rose-400 dark:text-rose-500" />
            <p>{search.trim() ? "لا توجد نتائج مطابقة." : "لم تُنشئ مجموعات بعد."}</p>
            {!search.trim() ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-2 border-rose-200 bg-white text-rose-700 hover:bg-rose-50 dark:border-rose-600 dark:bg-slate-800 dark:text-rose-300 dark:hover:bg-rose-950/40"
                onClick={openCreate}
              >
                <Plus className="ms-1 h-3.5 w-3.5" />
                أنشئ أول مجموعة
              </Button>
            ) : null}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {filtered.map((g) => (
              <li key={g.id} className="space-y-2 px-4 py-4 text-right">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-display text-base font-bold text-slate-900 dark:text-slate-50">
                      <Layers className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                      {g.name}
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-display font-medium text-rose-700 dark:bg-rose-950/60 dark:text-rose-200">
                        {g.roles.length} رتبة
                      </span>
                    </p>
                    {g.description ? (
                      <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                        {g.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-rose-200 bg-white text-rose-700 hover:bg-rose-50 dark:border-rose-600 dark:bg-slate-800 dark:text-rose-300 dark:hover:bg-rose-950/40"
                      onClick={() => openEdit(g)}
                    >
                      <Pencil className="h-3.5 w-3.5 ms-1" />
                      تعديل
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-200 dark:hover:bg-rose-950/60"
                      onClick={() => setConfirmDelete({ id: g.id, name: g.name })}
                    >
                      <Trash2 className="h-3.5 w-3.5 ms-1" />
                      حذف
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-1.5">
                  {g.roles.map((r) => (
                    <span
                      key={r}
                      className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] font-display text-rose-800 dark:border-rose-600/60 dark:bg-rose-950/45 dark:text-rose-200"
                    >
                      {roleLabel(r)}
                    </span>
                  ))}
                </div>
                <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500" dir="ltr">
                  Updated: {new Date(g.updatedAt).toLocaleString("ar")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog
        open={editorOpen}
        onOpenChange={(open) => {
          setEditorOpen(open);
          if (!open) setForm(emptyForm());
        }}
      >
        <DialogContent
          dir="rtl"
          className={cn(
            "flex max-h-[min(92dvh,92svh)] w-[calc(100%-1rem)] max-w-4xl flex-col gap-0 overflow-hidden rounded-2xl border-slate-200/95 bg-white p-0 text-right shadow-[0_28px_72px_-24px_rgba(15,23,42,0.38)] dark:border-slate-600 dark:bg-slate-900",
            "sm:w-full lg:max-w-5xl",
          )}
        >
          <DialogHeader className="shrink-0 space-y-1.5 px-4 pb-3 pt-12 text-right sm:px-6 sm:pt-14">
            <DialogTitle className="flex items-center justify-end gap-2 font-display text-slate-900 dark:text-slate-50">
              <Layers className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              {form.id ? "تعديل المجموعة" : "إنشاء مجموعة جديدة"}
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              اختر اسماً واضحاً ثم حدد الرتب التي ستُضاف للمستخدم عند اختيار هذه المجموعة.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="flex min-h-0 flex-1 flex-col overflow-hidden" noValidate>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-2 sm:px-6">
              <div className="space-y-4 pb-2">
                <div>
                  <Label htmlFor="g-name" className="text-slate-700 dark:text-slate-200">
                    اسم المجموعة
                  </Label>
                  <Input
                    id="g-name"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="مثال: إدارة المتجر"
                    className={cn(adminInput, "mt-1.5")}
                    autoComplete="off"
                  />
                </div>
                <div>
                  <Label htmlFor="g-desc" className="text-slate-700 dark:text-slate-200">
                    الوصف (اختياري)
                  </Label>
                  <Textarea
                    id="g-desc"
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="ماذا تشمل هذه المجموعة من صلاحيات؟"
                    className={cn(adminInput, "mt-1.5 min-h-[72px]")}
                  />
                </div>
                <div>
                  <Label className="text-slate-700 dark:text-slate-200">الرتب داخل المجموعة</Label>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    اختار كل الرتب التي يجب أن يحصل عليها المستخدم تلقائياً. مرّر داخل كل قسم إذا طال القائمة.
                  </p>
                  <div className="mt-2 space-y-3 rounded-xl border border-rose-200 bg-rose-50/80 p-3 dark:border-rose-700/50 dark:bg-rose-950/25">
                    <RoleSection
                      title="رتب عامة"
                      roles={BASE_ROLES.map((b) => b.value)}
                      selected={form.roles}
                      onToggle={toggleRole}
                    />
                    <RoleSection
                      title="طواقم المؤسسات"
                      roles={[...INSTITUTION_ROSTER_STAFF_ROLES]}
                      selected={form.roles}
                      onToggle={toggleRole}
                    />
                  </div>
                  {form.roles.size > 0 ? (
                    <div className="mt-2 flex flex-wrap justify-end gap-1.5">
                      {[...form.roles].map((r) => (
                        <span
                          key={r}
                          className="inline-flex items-center gap-1 rounded-full border border-rose-300 bg-white px-2.5 py-0.5 text-[11px] font-display text-rose-800 shadow-sm dark:border-rose-600 dark:bg-slate-800 dark:text-rose-200"
                        >
                          {roleLabel(r)}
                          <button
                            type="button"
                            className="rounded-full p-0.5 text-rose-700 hover:bg-rose-100 dark:text-rose-300 dark:hover:bg-rose-950/60"
                            onClick={() => toggleRole(r)}
                            aria-label={`إزالة ${roleLabel(r)}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
            <DialogFooter className="shrink-0 gap-2 border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900 sm:justify-start sm:px-6">
              <Button
                type="button"
                variant="outline"
                className="border-rose-200 bg-white text-rose-700 hover:bg-rose-50 dark:border-rose-600 dark:bg-slate-800 dark:text-rose-300 dark:hover:bg-rose-950/40"
                onClick={() => setEditorOpen(false)}
              >
                إلغاء
              </Button>
              <Button type="submit" className="bg-[#36164f] text-white hover:bg-[#2f1344] dark:bg-rose-700 dark:hover:bg-rose-600">
                <CheckCircle2 className="ms-2 h-4 w-4" />
                {form.id ? "حفظ التعديلات" : "إنشاء المجموعة"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <AlertDialogContent dir="rtl" className="border-rose-200 bg-white text-slate-900 dark:border-rose-900/60 dark:bg-slate-900 dark:text-slate-50">
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle className="flex items-center justify-end gap-2 font-display text-lg dark:text-slate-50">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
              حذف المجموعة
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 dark:text-slate-400">
              سيتم حذف المجموعة «{confirmDelete?.name}» نهائياً. لن تُحذف رتب المستخدمين الذين
              أُسندت لهم سابقاً عبر هذه المجموعة — تبقى رتبهم كما هي.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:flex-row-reverse">
            <AlertDialogAction
              className="bg-rose-600 text-white hover:bg-rose-700"
              onClick={handleDelete}
            >
              تأكيد الحذف
            </AlertDialogAction>
            <AlertDialogCancel className="border-rose-200 bg-white text-slate-700 hover:bg-rose-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
              إلغاء
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RoleGroupsPage;

function RoleSection({
  title,
  roles,
  selected,
  onToggle,
}: {
  title: string;
  roles: ManagedStaffRole[];
  selected: Set<ManagedStaffRole>;
  onToggle: (r: ManagedStaffRole) => void;
}) {
  const allSelected = roles.every((r) => selected.has(r));
  const someSelected = roles.some((r) => selected.has(r));
  return (
    <div className="rounded-lg border border-rose-100 bg-white p-3 dark:border-slate-600 dark:bg-slate-800/80">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            if (allSelected) roles.forEach((r) => onToggle(r));
            else roles.filter((r) => !selected.has(r)).forEach((r) => onToggle(r));
          }}
          className={cn(
            "rounded-full border px-2 py-0.5 text-[10px] font-display transition",
            allSelected
              ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200 dark:hover:bg-rose-950/70"
              : "border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-600 dark:bg-rose-950/40 dark:text-rose-200 dark:hover:bg-rose-950/55",
          )}
        >
          {allSelected ? "إزالة الكل" : someSelected ? "اختيار الباقي" : "اختر الكل"}
        </button>
        <h4 className="font-display text-xs font-semibold text-slate-700 dark:text-slate-200">{title}</h4>
      </div>
      <div
        className={cn(
          "max-h-[min(420px,52vh)] overflow-y-auto overscroll-y-contain rounded-md border border-slate-200/90 bg-slate-50/50 py-1.5 ps-1 pe-0.5 dark:border-slate-600/80 dark:bg-slate-900/40",
          "[scrollbar-gutter:stable]",
        )}
      >
        <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((r) => {
            const checked = selected.has(r);
            return (
              <li key={r}>
                <button
                  type="button"
                  onClick={() => onToggle(r)}
                  aria-pressed={checked}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-right text-sm transition",
                    checked
                      ? "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-600 dark:bg-rose-950/45 dark:text-rose-100"
                      : "border-slate-200 bg-white text-slate-700 hover:border-rose-200 hover:bg-rose-50/40 dark:border-slate-600 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:border-rose-600 dark:hover:bg-rose-950/25",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                      checked
                        ? "border-rose-600 bg-rose-600 text-white shadow-sm dark:border-rose-500 dark:bg-rose-500"
                        : "border-slate-300 bg-white dark:border-slate-500 dark:bg-slate-800",
                    )}
                  >
                    {checked ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                  </span>
                  <span className="min-w-0 flex-1 text-right text-[12px] leading-snug sm:text-[13px]">
                    {roleLabel(r)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
