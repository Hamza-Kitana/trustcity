import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ClipboardList,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useApplicationsContent } from "@/contexts/ApplicationsContentContext";
import type {
  ApplicationRecord,
  ApplicationStatus,
  LawsQuizResult,
} from "@/data/publicApplicationTypes";
import { isJobApplicationRoleKey } from "@/data/jobRoleLaws";
import { canStaffReviewApplication } from "@/lib/applicationReviewAccess";
import { STREAMER_APPLICATION_ROLE } from "@/lib/streamerApplication";
import { getArabCountryLabel, isArabCountryCode } from "@/data/arabCountries";
import { appendActivityLog } from "@/lib/activityLog";
import { cn } from "@/lib/utils";
import {
  adminDialogSurface,
  adminInput,
  adminListShell,
  adminPageDesc,
  adminPageWrap,
  adminRow,
  adminTabsList,
  adminTabsTrigger,
  adminTitleIcon,
} from "@/lib/adminUi";

function genderAr(g: "male" | "female") {
  return g === "male" ? "ذكر" : "أنثى";
}

function statusBadge(status: ApplicationStatus) {
  if (status === "pending")
    return "bg-amber-500/15 text-amber-700 border border-amber-500/30";
  if (status === "approved")
    return "bg-emerald-500/15 text-emerald-700 border border-emerald-500/30";
  return "bg-destructive/15 text-destructive border border-destructive/30";
}

function statusLabel(status: ApplicationStatus) {
  if (status === "pending") return "قيد المراجعة";
  if (status === "approved") return "مقبول";
  return "مرفوض";
}

const ApplicationsReviewPage = () => {
  const { user, isSuperAdmin, isApplicationReviewer } = useAuth();
  const { applications, setDecision } = useApplicationsContent();
  const [filter, setFilter] = useState<ApplicationStatus | "all">("pending");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [search, setSearch] = useState("");

  const reviewAccess = useMemo(
    () => ({
      isSuperAdmin: !!isSuperAdmin,
      isApplicationReviewer: !!isApplicationReviewer,
      userRoles: user?.roles ?? [],
    }),
    [isSuperAdmin, isApplicationReviewer, user?.roles],
  );

  const canReviewApplication = (app: ApplicationRecord): boolean =>
    canStaffReviewApplication(app, reviewAccess);

  const sorted = useMemo(
    () =>
      [...applications]
        .filter((a) => !isJobApplicationRoleKey(a.roleKey) && a.roleKey !== STREAMER_APPLICATION_ROLE)
        .filter(canReviewApplication)
        .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
    [applications, reviewAccess],
  );

  const filtered = useMemo(() => {
    const byStatus = filter === "all" ? sorted : sorted.filter((a) => a.status === filter);
    const q = search.trim().toLowerCase();
    if (!q) return byStatus;
    return byStatus.filter((a) =>
      `${a.targetTitle} ${a.roleKey} ${a.snapshot.firstName} ${a.snapshot.lastName} ${a.snapshot.discord}`
        .toLowerCase()
        .includes(q),
    );
  }, [sorted, filter, search]);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    return sorted.find((a) => a.id === selectedId) ?? null;
  }, [sorted, selectedId]);

  const runDecision = (status: "approved" | "rejected") => {
    if (!selected || selected.status !== "pending") return;
    const name = user?.username?.trim() || (isSuperAdmin ? "super_admin" : "reviewer");
    setDecision(selected.id, status, name, decisionNote);
    appendActivityLog(
      name,
      status === "approved" ? "قرار تقديم: قبول" : "قرار تقديم: رفض",
      `طلب ${selected.targetTitle} (${selected.id.slice(0, 8)})`,
    );
    setDecisionNote("");
    toast.success(status === "approved" ? "تم تسجيل القبول" : "تم تسجيل الرفض");
  };

  return (
    <div className={cn(adminPageWrap, "max-w-6xl")}>
      <div>
        <h1 className="flex items-center justify-end gap-2 font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          <ClipboardList className={adminTitleIcon} />
          طلبات التقديم من الموقع
        </h1>
        <p className={adminPageDesc}>
          طلبات دخول السيرفر (/apply) — تقديم صنّاع المحتوى من «ستريمر منجر → طلبات الستريمر».
          طلبات التوظيف (/jobs) تظهر في طاقم كل مؤسسة.
        </p>
      </div>

      <Tabs
        value={filter}
        onValueChange={(v) => {
          setFilter(v as ApplicationStatus | "all");
          setSelectedId(null);
        }}
        dir="rtl"
        className="w-full"
      >
        <TabsList className={adminTabsList}>
          <TabsTrigger value="pending" className={adminTabsTrigger}>
            قيد المراجعة
          </TabsTrigger>
          <TabsTrigger value="all" className={adminTabsTrigger}>
            الكل
          </TabsTrigger>
          <TabsTrigger value="approved" className={adminTabsTrigger}>
            مقبول
          </TabsTrigger>
          <TabsTrigger value="rejected" className={adminTabsTrigger}>
            مرفوض
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mt-6">
          <div className="mb-3 max-w-sm">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم أو نوع الطلب أو الديسكورد..."
              className={adminInput}
              autoComplete="off"
            />
          </div>
          <div className={adminListShell}>
            {filtered.length === 0 ? (
              <p className="p-4 text-center text-sm text-slate-500">لا توجد طلبات.</p>
            ) : (
              filtered.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelectedId(a.id)}
                  className={adminRow}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[10px] font-display", statusBadge(a.status))}>
                      {statusLabel(a.status)}
                    </span>
                    <p className="truncate text-xs text-slate-500 font-mono dark:text-slate-400" dir="ltr">
                      {new Date(a.submittedAt).toLocaleString("ar")}
                    </p>
                    <p className="truncate text-sm text-slate-700 dark:text-slate-300">
                      {a.snapshot.firstName} {a.snapshot.lastName}
                    </p>
                    <p className="truncate font-display text-sm font-semibold text-slate-900 dark:text-slate-100">{a.targetTitle}</p>
                  </div>
                </button>
              ))
            )}
          </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent dir="rtl" className={cn("w-[calc(100%-1rem)] max-w-4xl", adminDialogSurface)}>
          <DialogHeader className="text-right">
            <DialogTitle className="text-slate-900 dark:text-slate-50">تفاصيل الطلب</DialogTitle>
          </DialogHeader>
          {selected ? (
            <ApplicationDetail
              app={selected}
              decisionNote={decisionNote}
              setDecisionNote={setDecisionNote}
              onApprove={() => runDecision("approved")}
              onReject={() => runDecision("rejected")}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

function ApplicationDetail({
  app,
  decisionNote,
  setDecisionNote,
  onApprove,
  onReject,
}: {
  app: ApplicationRecord;
  decisionNote: string;
  setDecisionNote: (v: string) => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const s = app.snapshot;
  const countryLabel = isArabCountryCode(s.countryCode) ? getArabCountryLabel(s.countryCode) : s.countryCode;

  return (
    <div className="min-w-0 space-y-4 rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/40 p-4 shadow-sm dark:border-slate-700/90 dark:from-slate-900 dark:to-slate-800/70 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-200 pb-3 dark:border-slate-700">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-50">{app.targetTitle}</h2>
          <p className="text-xs text-slate-500 font-mono dark:text-slate-400" dir="ltr">
            {app.roleKey} · {app.id.slice(0, 8)}…
          </p>
        </div>
        <span className={cn("rounded-md px-2 py-1 text-xs font-display", statusBadge(app.status))}>
          {statusLabel(app.status)}
        </span>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2 text-sm">
        <DetailRow label="الاسم" value={`${s.firstName} ${s.lastName}`} />
        <DetailRow label="الجنس" value={genderAr(s.gender)} />
        <DetailRow label="تاريخ الميلاد" value={s.birthSummaryLine} />
        <DetailRow label="العمر" value={s.ageSummaryLine} />
        <DetailRow label="الدولة" value={countryLabel} />
        <DetailRow label="الديسكورد" value={s.discord} dir="ltr" />
        <DetailRow label="مدن/سيرفرات سابقة" value={s.previousCities} className="sm:col-span-2" />
        <DetailRow label="الخبرة والدوافع" value={s.experience} className="sm:col-span-2" />
        <DetailRow label="الإقرار بالقوانين" value={s.lawsAccepted ? "نعم" : "لا"} />
      </dl>

      <QuizResultSection result={s.lawsQuizResult} />

      {app.status !== "pending" && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300">
          <p>
            <span className="text-slate-500 dark:text-slate-400">القرار بواسطة:</span> {app.decidedBy ?? "—"}
          </p>
          <p className="mt-1 font-mono text-xs text-slate-500 dark:text-slate-400" dir="ltr">
            {app.decidedAt ? new Date(app.decidedAt).toLocaleString("ar") : ""}
          </p>
          {app.note ? (
            <p className="mt-2 text-slate-600 dark:text-slate-300">
              <span className="text-slate-900 font-medium dark:text-slate-100">ملاحظة:</span> {app.note}
            </p>
          ) : null}
        </div>
      )}

      {app.status === "pending" ? (
        <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-700">
          <div>
            <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">ملاحظة للقرار (اختياري)</Label>
            <Textarea
              className="mt-1 min-h-[72px] border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-rose-500/30 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
              value={decisionNote}
              onChange={(e) => setDecisionNote(e.target.value)}
              placeholder="تظهر مع الطلب بعد القبول أو الرفض…"
            />
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            <Button
              type="button"
              className="bg-gradient-to-l from-rose-600 to-rose-700 text-white shadow-sm hover:from-rose-700 hover:to-rose-800"
              onClick={onApprove}
            >
              <CheckCircle2 className="ms-2 h-4 w-4" /> قبول
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800"
              onClick={onReject}
            >
              <XCircle className="ms-2 h-4 w-4" /> رفض
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function QuizResultSection({ result }: { result?: LawsQuizResult }) {
  if (!result) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-400">
        <span className="inline-flex items-center gap-2">
          <ShieldQuestion className="h-4 w-4 text-slate-400 dark:text-slate-500" aria-hidden />
          لا توجد بيانات لاختبار قراءة القوانين لهذا الطلب.
        </span>
      </div>
    );
  }

  const passed = result.passed;
  const headerClass = passed
    ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200"
    : "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200";
  const icon = passed ? (
    <ShieldCheck className="h-5 w-5" aria-hidden />
  ) : (
    <ShieldAlert className="h-5 w-5" aria-hidden />
  );
  const completedAt = (() => {
    try {
      return new Date(result.completedAt).toLocaleString("ar");
    } catch {
      return result.completedAt;
    }
  })();

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
      <header className={cn("flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm font-display", headerClass)}>
        <span className="inline-flex items-center gap-2">
          {icon}
          <span className="font-semibold">اختبار قراءة القوانين:</span>
          <span>{passed ? "اجتاز ✓" : "لم يجتز"}</span>
        </span>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span>
            النتيجة: <strong>{result.correctCount} / {result.totalQuestions}</strong>
          </span>
          <span>
            عدد المحاولات: <strong>{result.attempts}</strong>
          </span>
          <span className="font-mono text-[11px] opacity-80" dir="ltr">
            {completedAt}
          </span>
        </div>
      </header>

      {!passed ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs leading-relaxed text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          المتقدم اختار إرسال الطلب رغم وجود إجابات غير صحيحة. القرار النهائي يعود لك ويمكنك القبول أو الرفض كالمعتاد.
        </p>
      ) : null}

      {Array.isArray(result.answers) && result.answers.length > 0 ? (
        <ol className="space-y-2 text-sm">
          {result.answers.map((a, idx) => {
            const correct = a.isCorrect;
            return (
              <li
                key={a.questionId || idx}
                className={cn(
                  "rounded-xl border p-3",
                  correct
                    ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-500/30 dark:bg-emerald-500/10"
                    : "border-rose-200 bg-rose-50/40 dark:border-rose-500/30 dark:bg-rose-500/10",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-display text-sm font-semibold leading-relaxed text-slate-900 dark:text-slate-100">
                    <span className="me-1 text-slate-500 dark:text-slate-400">{idx + 1}.</span>
                    {a.question}
                  </p>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-display font-semibold",
                      correct
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-rose-100 text-rose-700",
                    )}
                  >
                    {correct ? "صحيحة" : "خاطئة"}
                  </span>
                </div>
                <dl className="mt-2 grid gap-1 text-xs">
                  <div className="flex flex-wrap items-baseline gap-1">
                    <dt className="text-slate-500 dark:text-slate-400">إجابته:</dt>
                    <dd className={cn("text-slate-900 dark:text-slate-100", !correct && "text-rose-700 dark:text-rose-300")}>
                      {a.selectedOptionLabel || "—"}
                    </dd>
                  </div>
                  {!correct ? (
                    <div className="flex flex-wrap items-baseline gap-1">
                      <dt className="text-slate-500 dark:text-slate-400">الإجابة الصحيحة:</dt>
                      <dd className="text-emerald-700 dark:text-emerald-300">
                        {a.correctOptionLabel || "—"}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-xs text-slate-500 dark:text-slate-400">لم تُسجَّل تفاصيل الإجابات.</p>
      )}
    </section>
  );
}

function DetailRow({
  label,
  value,
  dir,
  className,
}: {
  label: string;
  value: string;
  dir?: "ltr";
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:border-slate-700 dark:bg-slate-800/80 dark:shadow-none", className)}>
      <dt className="font-display text-[10px] font-medium text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className={cn("mt-1 whitespace-pre-wrap break-words text-slate-900 dark:text-slate-100", dir === "ltr" && "font-mono text-left")} dir={dir}>
        {value || "—"}
      </dd>
    </div>
  );
}

export default ApplicationsReviewPage;
