import { Link, Navigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Briefcase, ClipboardList, Lock, ShieldAlert, Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { usePublicUser } from "@/contexts/PublicUserContext";
import { useApplicationsContent } from "@/contexts/ApplicationsContentContext";
import {
  canApplyForPublicJobs,
  hasPendingCitizenApplication,
  MSG_JOBS_NEED_SERVER_ACTIVATION,
} from "@/lib/publicProfileEligibility";
import { useSiteVisibility } from "@/lib/siteVisibility";
import {
  branchIdFromApplicationRoleKey,
  useApplicationsClosure,
} from "@/lib/applicationsClosure";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { isJobApplicationRoleKey } from "@/data/jobRoleLaws";

const JOBS: { role: string; title: string; subtitle: string; visible: (v: ReturnType<typeof useSiteVisibility>) => boolean }[] = [
  { role: "ems", title: "وزارة الصحة", subtitle: "طاقم طبي وإسعافي", visible: (v) => v.institutions.health },
  { role: "police", title: "الداخلية — الشرطة", subtitle: "LSPD", visible: (v) => v.institutions.interior_police },
  { role: "interior_sheriff", title: "الداخلية — الشيرف", subtitle: "Sheriff", visible: (v) => v.institutions.interior_sheriff },
  { role: "interior_cia", title: "الداخلية — CIA", subtitle: "Intelligence", visible: (v) => v.institutions.interior_cia },
  { role: "interior_marines", title: "الداخلية — المارينز", subtitle: "Marines", visible: (v) => v.institutions.interior_marines },
  { role: "interior_fpi", title: "الداخلية — FPI", subtitle: "Federal Investigations", visible: (v) => v.institutions.interior_fpi },
  { role: "oversight", title: "مؤسسة الرقابة", subtitle: "Oversight", visible: (v) => v.institutions.oversight },
  { role: "lawyer", title: "وزارة العدل — هيئة المحاماة", subtitle: "Justice", visible: (v) => v.institutions.justice_lawyers },
  { role: "developer", title: "مؤسسة المبرمجين", subtitle: "Developer", visible: (v) => v.institutions.developer },
];

function statusLabel(status: "pending" | "approved" | "rejected") {
  if (status === "pending") return "قيد المراجعة";
  if (status === "approved") return "مقبول";
  return "مرفوض";
}

const JobsPage = () => {
  const reduceMotion = useReducedMotion();
  const { user, getProfile } = usePublicUser();
  const { applications } = useApplicationsContent();
  const visibility = useSiteVisibility();
  const closure = useApplicationsClosure();

  if (!user) return <Navigate to="/" replace />;

  const profile = user.authProvider === "discord" ? getProfile() : null;
  const jobApplyUnlocked = canApplyForPublicJobs(profile, applications);
  const citizenApplyPending = hasPendingCitizenApplication(profile, applications);

  const visibleJobs = JOBS.filter((j) => j.visible(visibility));
  const isJobClosed = (roleKey: string): boolean => {
    const branchId = branchIdFromApplicationRoleKey(roleKey);
    if (!branchId) return false;
    return closure.closed[branchId] === true;
  };
  const myApps = applications
    .filter((a) => isJobApplicationRoleKey(a.roleKey))
    .filter((a) => {
      const uid = (a.applicantUserId ?? "").trim();
      if (uid) return uid === user.id;
      return (a.applicantUsername ?? "").trim().toLowerCase() === user.username.trim().toLowerCase();
    })
    .sort((a, b) => +new Date(b.submittedAt) - +new Date(a.submittedAt));

  return (
    <div dir="rtl" className="min-h-screen bg-[#f4f0fb] text-slate-900 antialiased">
      <Navbar />

      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute -left-28 top-0 h-64 w-64 rounded-full bg-rose-400/20 blur-[100px]" />
        <div className="pointer-events-none absolute -right-20 top-20 h-56 w-56 rounded-full bg-red-400/15 blur-[85px]" />

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="relative mx-auto max-w-6xl px-4 pb-10 pt-24 md:px-8"
        >
          <div className="text-right">
            <p className="font-display text-[11px] tracking-[0.32em] text-rose-700/90">التوظيف</p>
            <h1 className="mt-2 font-display text-3xl font-bold text-slate-900 md:text-4xl">التقديم لوظيفة</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              اختر الجهة المناسبة، أكمل النموذج، وتابع حالة طلبك من القسم أسفل الصفحة.
            </p>
          </div>
        </motion.div>
      </div>

      <main className="relative z-10 mx-auto max-w-6xl space-y-10 px-4 pb-20 md:px-8">
        {!jobApplyUnlocked ? (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-amber-300/90 bg-gradient-to-l from-amber-50 to-orange-50/80 px-4 py-4 text-right shadow-sm sm:px-5"
          >
            <div className="flex flex-wrap items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                <ShieldAlert className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1 space-y-2">
                <p className="font-display text-sm font-bold text-amber-950">التقديم على الوظائف غير متاح بعد</p>
                <p className="text-sm leading-relaxed text-amber-900/90">{MSG_JOBS_NEED_SERVER_ACTIVATION}</p>
                {citizenApplyPending ? (
                  <p className="text-sm text-amber-800">
                    لديك طلب مواطن <span className="font-semibold">قيد المراجعة</span> — انتظر قرار الإدارة ثم عُد لهذه الصفحة.
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2 pt-1">
                  {!citizenApplyPending ? (
                    <Button asChild size="sm" className="rounded-full bg-rose-600 text-white hover:bg-rose-700">
                      <Link to="/apply/citizen">التقديم الإلكتروني للمواطن</Link>
                    </Button>
                  ) : null}
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="rounded-full border-amber-300 bg-white text-amber-950 hover:bg-amber-50"
                  >
                    <Link to="/profile">متابعة من البروفايل</Link>
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}

        <motion.section initial={reduceMotion ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.05 }}>
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-slate-900">
              <Briefcase className="h-5 w-5 text-rose-600" />
              الجهات المتاحة
            </h2>
            <span className="text-xs text-slate-500">{visibleJobs.length} جهة</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {visibleJobs.map((job, i) => {
              const closed = isJobClosed(job.role);
              const applyBlocked = closed || !jobApplyUnlocked;
              return (
              <motion.div
                key={job.role}
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: reduceMotion ? 0 : i * 0.04 }}
              >
                <Card
                  className={cn(
                    "group relative h-full overflow-hidden border-rose-200/90 bg-white/95 shadow-md transition-all hover:-translate-y-0.5 hover:border-rose-300 hover:shadow-lg",
                    closed && "border-rose-200/90 bg-rose-50/40 hover:border-rose-300 hover:translate-y-0",
                    !jobApplyUnlocked && !closed && "border-amber-200/90 bg-amber-50/30 hover:translate-y-0",
                  )}
                >
                  {closed ? (
                    <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full border border-rose-300 bg-white px-2.5 py-0.5 text-[10px] font-semibold text-rose-700 shadow-sm">
                      <Lock className="h-3 w-3" />
                      التقديم مغلق
                    </span>
                  ) : !jobApplyUnlocked ? (
                    <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full border border-amber-300 bg-white px-2.5 py-0.5 text-[10px] font-semibold text-amber-800 shadow-sm">
                      <ShieldAlert className="h-3 w-3" />
                      يتطلب تفعيلاً
                    </span>
                  ) : null}
                  <CardContent className="flex h-full flex-col p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div
                        className={cn(
                          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1",
                          closed
                            ? "bg-gradient-to-br from-rose-100 to-rose-50 text-rose-700 ring-rose-200/80"
                            : "bg-gradient-to-br from-rose-100 to-rose-50 text-rose-700 ring-rose-200/80",
                        )}
                      >
                        {closed ? <Lock className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                      </div>
                      {applyBlocked ? (
                        <Button
                          size="sm"
                          disabled
                          className={cn(
                            "cursor-not-allowed rounded-full px-4 shadow-none opacity-90",
                            closed
                              ? "bg-rose-200/70 text-rose-800"
                              : "bg-amber-200/70 text-amber-900",
                          )}
                        >
                          {closed ? "مغلق حالياً" : "غير متاح"}
                        </Button>
                      ) : (
                        <Button asChild size="sm" className="rounded-full bg-gradient-to-l from-rose-700 to-rose-600 px-4 text-white shadow-md opacity-90 transition-opacity group-hover:opacity-100">
                          <Link to={`/jobs/apply/${job.role}`}>تقديم الآن</Link>
                        </Button>
                      )}
                    </div>
                    <h3 className="mt-4 font-display text-lg font-semibold leading-snug text-slate-900">{job.title}</h3>
                    <p className={cn("mt-1 text-sm", closed ? "text-rose-700/90" : "text-rose-700/90")}>{job.subtitle}</p>
                    {closed ? (
                      <p className="mt-3 rounded-xl border border-rose-200 bg-white/70 px-3 py-2 text-xs leading-relaxed text-rose-800">
                        أُغلق التقديم لهذه الجهة حالياً. يُرجى المتابعة لاحقاً.
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              </motion.div>
              );
            })}
          </div>
        </motion.section>

        <motion.section initial={reduceMotion ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.1 }}>
          <Card className="overflow-hidden border-rose-200/90 bg-white/95 shadow-[0_24px_60px_-28px_rgba(54,22,79,0.22)]">
            <div className="border-b border-rose-100 bg-gradient-to-l from-rose-50/90 to-white px-5 py-4">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-slate-900">
                <ClipboardList className="h-5 w-5 text-rose-600" />
                طلباتي
              </h2>
              <p className="mt-1 text-sm text-slate-600">حالة طلبات التوظيف التي أرسلتها من هذا الحساب.</p>
            </div>
            <CardContent className="p-5 md:p-6">
              {myApps.length === 0 ? (
                <div className="flex flex-col items-center rounded-2xl border border-dashed border-rose-200 bg-rose-50/40 py-12 text-center">
                  <ClipboardList className="mb-3 h-10 w-10 text-rose-400" />
                  <p className="font-medium text-slate-700">لا توجد طلبات بعد</p>
                  <p className="mt-1 max-w-sm text-sm text-slate-500">اختر جهة من الأعلى وابدأ التقديم.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myApps.map((app) => (
                    <div
                      key={app.id}
                      className="rounded-2xl border border-rose-200/90 bg-gradient-to-l from-white to-rose-50/30 p-4 shadow-sm transition-colors hover:border-rose-300"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="font-display font-semibold text-slate-900">{app.targetTitle}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              "rounded-full border font-normal",
                              app.status === "pending" && "border-amber-300 bg-amber-50 text-amber-800",
                              app.status === "approved" && "border-emerald-300 bg-emerald-50 text-emerald-800",
                              app.status === "rejected" && "border-rose-300 bg-rose-50 text-rose-800",
                            )}
                          >
                            {statusLabel(app.status)}
                          </Badge>
                          <span className="text-xs text-slate-500">{new Date(app.submittedAt).toLocaleString("ar")}</span>
                        </div>
                      </div>
                      {app.note ? (
                        <p className="mt-3 rounded-xl border border-rose-100 bg-white/80 px-3 py-2 text-sm text-slate-700">
                          <span className="font-medium text-rose-800">ملاحظة الإدارة:</span> {app.note}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.section>
      </main>
      <Footer forceLight />
    </div>
  );
};

export default JobsPage;
