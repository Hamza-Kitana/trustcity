import { Link } from "react-router-dom";
import { ChevronLeft, Lock, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  hasPendingCitizenApplication,
  isPostCitizenApplyUnlocked,
  MSG_POST_CITIZEN_APPROVED_NEEDED,
} from "@/lib/publicProfileEligibility";
import type { PublicUserProfile } from "@/contexts/PublicUserContext";
import type { ApplicationRecord } from "@/data/publicApplicationTypes";
import { cn } from "@/lib/utils";

type PostCitizenApplyGateProps = {
  profile: PublicUserProfile | null;
  applications: ApplicationRecord[];
  children: React.ReactNode;
  className?: string;
};

/** يعرض أزرار التقديم فقط بعد قبول التقديم الإلكتروني للمواطن */
export function PostCitizenApplyGate({ profile, applications, children, className }: PostCitizenApplyGateProps) {
  const unlocked = isPostCitizenApplyUnlocked(profile, applications);
  const pending = hasPendingCitizenApplication(profile, applications);

  if (unlocked) {
    return <div className={cn("flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center", className)}>{children}</div>;
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-amber-400/35 bg-gradient-to-l from-amber-50/90 to-orange-50/60 p-4 text-right dark:border-amber-700/40 dark:from-amber-950/35 dark:to-orange-950/20",
        className,
      )}
    >
      <div className="flex flex-wrap items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
          {pending ? <ShieldAlert className="h-5 w-5" aria-hidden /> : <Lock className="h-5 w-5" aria-hidden />}
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="font-display text-sm font-bold text-amber-950 dark:text-amber-100">التقديم غير متاح بعد</p>
          <p className="text-sm leading-relaxed text-amber-900/90 dark:text-amber-100/85">{MSG_POST_CITIZEN_APPROVED_NEEDED}</p>
          {pending ? (
            <p className="text-sm text-amber-800 dark:text-amber-200/90">
              طلب المواطن لديك <span className="font-semibold">قيد المراجعة</span>.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2 pt-1">
            {!pending ? (
              <Button asChild size="sm" className="rounded-full bg-rose-600 text-white hover:bg-rose-700">
                <Link to="/apply/citizen">التقديم الإلكتروني للمواطن</Link>
              </Button>
            ) : null}
            <Button asChild size="sm" variant="outline" className="rounded-full border-amber-300/80 bg-white/70">
              <Link to="/profile">البروفايل</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

type PostCitizenActionButtonProps = {
  to: string;
  label: string;
  variant?: "primary" | "outline";
  icon?: React.ReactNode;
};

export function PostCitizenActionButton({ to, label, variant = "primary", icon }: PostCitizenActionButtonProps) {
  if (variant === "outline") {
    return (
      <Button asChild variant="outline" size="lg" className="h-12 rounded-2xl border-primary/35 px-6 font-display">
        <Link to={to} className="inline-flex items-center gap-2">
          {label}
          {icon}
        </Link>
      </Button>
    );
  }
  return (
    <Button
      asChild
      size="lg"
      className="h-12 rounded-2xl bg-gradient-neon px-8 font-display text-base tracking-wide text-primary-foreground shadow-[0_0_28px_hsl(var(--primary)/0.35)]"
    >
      <Link to={to} className="inline-flex items-center gap-2">
        {label}
        {icon ?? <ChevronLeft className="h-5 w-5 opacity-90" aria-hidden />}
      </Link>
    </Button>
  );
}
