import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Bell, Inbox, MessageSquareMore } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useApplicationsContent } from "@/contexts/ApplicationsContentContext";
import { usePublicUser } from "@/contexts/PublicUserContext";
import { useTicketsCenter } from "@/lib/ticketsCenter";
import { isPublicTicketsUnlocked, MSG_TICKETS_NEED_CITY_PROFILE } from "@/lib/publicProfileEligibility";
import { cn } from "@/lib/utils";

type NotificationItem = {
  ticketId: string;
  subject: string;
  typeLabel: string;
  messageId: string;
  preview: string;
  at: string;
};

type NotificationsBellProps = {
  /** ستايل أساس للزر (يأخذ أصناف Tailwind) */
  buttonClassName?: string;
  /** أصناف الأيقونة */
  iconClassName?: string;
  /** اتجاه فتح الـPopover */
  align?: "start" | "center" | "end";
};

/**
 * جرس إشعارات للمستخدم العام (Public) — يعرض ردود الإدارة الجديدة على تكتاته.
 * يُعرض في شريط التنقل ويستبدل قسم الإشعارات الذي كان داخل صفحة البروفايل.
 */
export function NotificationsBell({
  buttonClassName,
  iconClassName,
  align = "end",
}: NotificationsBellProps) {
  const publicUser = usePublicUser();
  const { applications } = useApplicationsContent();
  const navigate = useNavigate();
  const tickets = useTicketsCenter();
  const [open, setOpen] = useState(false);

  const myTickets = useMemo(() => {
    if (!publicUser.user) return [];
    const uid = publicUser.user.id;
    return tickets.filter(
      (t) =>
        t.openedById === uid ||
        t.openedBy === publicUser.user!.username ||
        t.openedBy === publicUser.user!.displayName,
    );
  }, [tickets, publicUser.user]);

  const unreadCount = useMemo(() => {
    let total = 0;
    for (const ticket of myTickets) {
      const cutoff = ticket.lastPublicReadAt ? new Date(ticket.lastPublicReadAt).getTime() : 0;
      const hasUnread = ticket.messages.some(
        (m) => (m.senderType ?? "public") === "staff" && new Date(m.at).getTime() > cutoff,
      );
      if (hasUnread) total += 1;
    }
    return total;
  }, [myTickets]);

  const items = useMemo<NotificationItem[]>(() => {
    const list: NotificationItem[] = [];
    for (const ticket of myTickets) {
      const cutoff = ticket.lastPublicReadAt ? new Date(ticket.lastPublicReadAt).getTime() : 0;
      for (const m of ticket.messages) {
        if ((m.senderType ?? "public") !== "staff") continue;
        if (new Date(m.at).getTime() <= cutoff) continue;
        list.push({
          ticketId: ticket.id,
          subject: ticket.subject,
          typeLabel: ticket.typeLabel,
          messageId: m.id,
          preview: m.body,
          at: m.at,
        });
      }
    }
    return list.sort((a, b) => +new Date(b.at) - +new Date(a.at)).slice(0, 8);
  }, [myTickets]);

  if (!publicUser.user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={
            unreadCount > 0 ? `${unreadCount} إشعارات جديدة` : "لا توجد إشعارات جديدة"
          }
          className={cn(
            "relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-rose-300 bg-white text-rose-700 transition-colors hover:bg-rose-50",
            buttonClassName,
          )}
        >
          <Bell className={cn("h-5 w-5", iconClassName)} aria-hidden />
          {unreadCount > 0 ? (
            <>
              <span
                aria-hidden
                className="absolute -right-0.5 -top-0.5 inline-flex h-2 w-2 animate-ping rounded-full bg-rose-400"
              />
              <span className="absolute -left-1 -top-1 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white shadow-[0_0_12px_rgba(244,63,94,0.55)] ring-2 ring-white/90">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            </>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        sideOffset={12}
        alignOffset={-8}
        collisionPadding={20}
        className="z-[140] w-[min(94vw,22rem)] overflow-hidden rounded-2xl border-rose-200 bg-white p-0 text-right shadow-[0_24px_72px_-24px_rgba(127,29,29,0.45)]"
      >
        <div className="flex items-center justify-between gap-2 border-b border-rose-100 bg-gradient-to-l from-rose-50 to-white px-4 py-3">
          <div className="flex items-center gap-2 text-right">
            <Bell className="h-4 w-4 text-rose-600" aria-hidden />
            <p className="font-display text-sm font-bold text-slate-900">الإشعارات</p>
          </div>
          {unreadCount > 0 ? (
            <Badge className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-semibold text-white">
              {unreadCount} غير مقروء
            </Badge>
          ) : (
            <Badge variant="outline" className="rounded-full border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
              لا جديد
            </Badge>
          )}
        </div>

        <div className="max-h-[28rem] overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-5 py-9 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
                <Inbox className="h-6 w-6 text-rose-500" />
              </div>
              <p className="font-display text-sm font-semibold text-slate-800">لا إشعارات حالياً</p>
              <p className="max-w-[18rem] text-xs leading-relaxed text-slate-500">
                عندما ترد الإدارة على تكتاتك، سيظهر التنبيه هنا.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-rose-100">
              {items.map((n) => (
                <li key={n.messageId}>
                  <Link
                    to="/tickets"
                    onClick={(e) => {
                      if (!isPublicTicketsUnlocked(publicUser.getProfile(), applications)) {
                        e.preventDefault();
                        setOpen(false);
                        toast.message(MSG_TICKETS_NEED_CITY_PROFILE);
                        navigate("/profile");
                        return;
                      }
                      setOpen(false);
                    }}
                    className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-rose-50/70"
                  >
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
                      <MessageSquareMore className="h-[18px] w-[18px]" />
                    </span>
                    <div className="min-w-0 flex-1 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Badge
                          variant="outline"
                          className="rounded-full border-rose-200 bg-white px-2 py-0 text-[10px] text-rose-700"
                        >
                          {n.typeLabel}
                        </Badge>
                        <p className="line-clamp-1 font-display text-sm font-semibold text-slate-900">
                          {n.subject}
                        </p>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-snug text-slate-600">
                        {n.preview}
                      </p>
                      <p className="mt-1 text-[10px] text-slate-500">
                        {new Date(n.at).toLocaleString("ar")}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-rose-100 bg-rose-50/40 px-4 py-2.5 text-center">
          <Link
            to="/tickets"
            onClick={(e) => {
              if (!isPublicTicketsUnlocked(publicUser.getProfile(), applications)) {
                e.preventDefault();
                setOpen(false);
                toast.message(MSG_TICKETS_NEED_CITY_PROFILE);
                navigate("/profile");
                return;
              }
              setOpen(false);
            }}
            className="inline-flex items-center justify-center gap-1.5 font-display text-xs font-semibold text-rose-700 transition-colors hover:text-rose-900"
          >
            فتح مركز التكت لمتابعة كل المحادثات
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default NotificationsBell;
