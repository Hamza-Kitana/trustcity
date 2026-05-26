import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Crown, Shield } from "lucide-react";
import { useTicketsCenter } from "@/lib/ticketsCenter";
import { countGangOpenUnread } from "@/lib/gangTicketStats";
import { cn } from "@/lib/utils";

const GangsAdminShell = () => {
  const tickets = useTicketsCenter();
  const location = useLocation();
  const openUnread = countGangOpenUnread(tickets);
  const onSub = location.pathname !== "/dashboard/gangs" && location.pathname.startsWith("/dashboard/gangs/");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rose-200/80 pb-4 dark:border-rose-800/60">
        <div className="text-right">
          <p className="font-display text-[11px] tracking-[0.28em] text-rose-600 dark:text-rose-400">GANG MANAGER</p>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-50">مدير العصابات</h1>
          <p className="mt-1 max-w-xl text-sm text-slate-600 dark:text-slate-400">
            إدارة بطاقات العصابات ومراجعة طلبات فتح العصابة الجديدة.
          </p>
        </div>
        <nav className="flex flex-wrap gap-2">
          <NavLink
            to="/dashboard/gangs"
            end
            className={({ isActive }) =>
              cn(
                "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-display text-sm transition",
                isActive && !onSub
                  ? "bg-rose-600 text-white shadow-sm"
                  : "border border-rose-200 bg-white text-rose-800 hover:bg-rose-50 dark:border-rose-700 dark:bg-slate-900 dark:text-rose-200",
              )
            }
          >
            <Shield className="h-4 w-4" />
            بطاقات العصابات
          </NavLink>
          <NavLink
            to="/dashboard/gangs/open-requests"
            className={({ isActive }) =>
              cn(
                "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-display text-sm transition",
                isActive
                  ? "bg-rose-600 text-white shadow-sm"
                  : "border border-rose-200 bg-white text-rose-800 hover:bg-rose-50 dark:border-rose-700 dark:bg-slate-900 dark:text-rose-200",
              )
            }
          >
            <Crown className="h-4 w-4" />
            طلبات فتح عصابة
            {openUnread > 0 ? (
              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
                {openUnread}
              </span>
            ) : null}
          </NavLink>
        </nav>
      </div>
      <Outlet />
    </div>
  );
};

export default GangsAdminShell;
