import { type FormEvent, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Lock, Shield } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getPostLoginDashboardPath, useAuth } from "@/contexts/AuthContext";

const StaffLoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user, canUseDashboard } = useAuth();
  const [staffUser, setStaffUser] = useState("");
  const [staffPass, setStaffPass] = useState("");
  const passRef = useRef<HTMLInputElement>(null);

  const from =
    typeof (location.state as { from?: string } | null)?.from === "string"
      ? (location.state as { from: string }).from
      : null;

  if (user && canUseDashboard) {
    const target =
      from && from.startsWith("/dashboard") && from !== "/dashboard/login"
        ? from
        : getPostLoginDashboardPath(user.roles);
    return <Navigate to={target} replace />;
  }

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto flex max-w-md flex-col px-4 pb-24 pt-10 sm:pt-14">
        <div className="rounded-3xl border border-rose-300/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.97)_0%,rgba(255,241,244,0.97)_100%)] p-6 shadow-[0_30px_80px_-24px_rgba(127,29,29,0.30)] sm:p-8">
          <div className="text-center">
            <img src="/trustLogo.png" alt="TRUST CFW" className="mx-auto h-16 w-16 object-contain" />
            <h1 className="mt-4 font-display text-2xl font-bold text-slate-900">دخول لوحة التحكم</h1>
            <p className="mt-2 text-sm text-slate-600">للموظفين والإدارة فقط — اللاعبون يسجّلون عبر Discord من الصفحة الرئيسية.</p>
          </div>

          <form
            className="mt-8 space-y-4"
            noValidate
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              try {
                const session = login(staffUser, staffPass);
                if (session) {
                  toast.success("تم الدخول كموظف");
                  const target =
                    from && from.startsWith("/dashboard") && from !== "/dashboard/login"
                      ? from
                      : getPostLoginDashboardPath(session.roles);
                  navigate(target, { replace: true });
                  return;
                }
                toast.error("بيانات الموظف غير صحيحة");
              } catch (err) {
                if (err instanceof Error && err.message === "IC_SESSION_STORAGE") {
                  toast.error("تعذر حفظ جلسة الموظف في المتصفح.");
                } else {
                  toast.error("حدث خطأ أثناء الدخول");
                  console.error(err);
                }
              }
            }}
          >
            <div className="space-y-1.5 text-right">
              <Label htmlFor="staff-user" className="text-xs font-medium text-slate-700">
                اسم المستخدم
              </Label>
              <Input
                id="staff-user"
                name="username"
                autoComplete="username"
                value={staffUser}
                onChange={(ev) => setStaffUser(ev.target.value)}
                onKeyDown={(ev) => {
                  if (ev.key === "Tab" && !ev.shiftKey) {
                    ev.preventDefault();
                    passRef.current?.focus();
                  }
                }}
                placeholder="اسم المستخدم"
                className="h-11 rounded-xl border-rose-200 bg-white text-right"
              />
            </div>
            <div className="space-y-1.5 text-right">
              <Label htmlFor="staff-pass" className="text-xs font-medium text-slate-700">
                كلمة المرور
              </Label>
              <Input
                ref={passRef}
                id="staff-pass"
                name="password"
                type="password"
                autoComplete="current-password"
                value={staffPass}
                onChange={(ev) => setStaffPass(ev.target.value)}
                placeholder="كلمة المرور"
                className="h-11 rounded-xl border-rose-200 bg-white text-right"
              />
            </div>
            <Button
              type="submit"
              className="h-11 w-full rounded-xl bg-gradient-neon font-display text-sm font-semibold text-primary-foreground"
            >
              <Lock className="ms-2 h-4 w-4 opacity-90" />
              دخول لوحة التحكم
            </Button>
          </form>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-500">
            <Shield className="h-3.5 w-3.5 shrink-0" aria-hidden />
            هذا القسم منفصل عن تسجيل اللاعبين عبر Discord.
          </p>

          <Button asChild variant="ghost" className="mt-4 w-full text-slate-600">
            <Link to="/">العودة للموقع</Link>
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default StaffLoginPage;
