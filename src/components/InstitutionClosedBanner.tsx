import { Lock } from "lucide-react";
import type { InstitutionBranchId } from "@/data/institutionBranches";
import { useApplicationsClosure } from "@/lib/applicationsClosure";

type InstitutionClosedBannerProps = {
  branchId: InstitutionBranchId;
  /** اسم المؤسسة كما يظهر للمستخدم — يُستخدم في الرسالة. */
  organizationLabel: string;
  /** فاصل علوي/سفلي. الافتراضي يضع هامشاً علوياً مناسباً تحت الـ Hero. */
  className?: string;
};

/**
 * شعار يظهر على صفحة المؤسسة العامة عندما يتم إغلاق التقديم لها من لوحة الإدارة.
 * يُخفى تلقائياً عندما تكون حالة التقديم مفتوحة.
 */
export function InstitutionClosedBanner({
  branchId,
  organizationLabel,
  className,
}: InstitutionClosedBannerProps) {
  const closure = useApplicationsClosure();
  if (!closure.closed[branchId]) return null;
  const note = closure.notes[branchId];

  return (
    <section
      className={`w-full px-4 md:px-8 xl:px-12 ${className ?? "mt-8"}`}
      role="status"
      aria-live="polite"
    >
      <div className="relative overflow-hidden rounded-2xl border border-rose-500/40 bg-gradient-to-l from-rose-950/80 via-rose-900/55 to-rose-950/80 p-5 text-right shadow-[0_18px_44px_-22px_rgba(244,63,94,0.55)] md:p-6">
        <div className="pointer-events-none absolute -left-12 -top-12 h-44 w-44 rounded-full bg-rose-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 -bottom-10 h-36 w-36 rounded-full bg-red-500/15 blur-3xl" />
        <div className="relative flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/40">
            <Lock className="h-6 w-6" aria-hidden />
          </div>
          <div className="flex-1 space-y-1.5 text-center sm:text-right">
            <p className="font-display text-[11px] font-semibold tracking-[0.32em] text-rose-300/90">
              ملاحظة هامة
            </p>
            <h2 className="font-display text-lg font-bold text-rose-50 md:text-xl">
              التقديم مغلق حالياً — {organizationLabel}
            </h2>
            <p className="text-sm leading-relaxed text-rose-100/80">
              لا تستقبل المؤسسة طلبات توظيف جديدة في هذه الفترة. يُرجى المتابعة لاحقاً عند إعادة فتح
              التقديم.
            </p>
            {note ? (
              <div className="mt-3 inline-block rounded-xl border border-rose-300/30 bg-rose-50/95 px-3 py-2 text-sm leading-relaxed text-rose-900 shadow-sm">
                <span className="font-semibold text-rose-700">من الإدارة:</span> {note}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export default InstitutionClosedBanner;
