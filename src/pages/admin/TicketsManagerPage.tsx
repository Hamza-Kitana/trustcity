import { useEffect, useMemo, useRef, useState } from "react";
import { BellRing, Clock3, MessageSquareMore, Send, XCircle } from "lucide-react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { TicketAttachmentPicker } from "@/components/tickets/TicketAttachmentPicker";
import { TicketChatAttachmentMedia } from "@/components/tickets/TicketChatAttachmentMedia";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth, type StaffRole } from "@/contexts/AuthContext";
import { appendActivityLog } from "@/lib/activityLog";
import { cn } from "@/lib/utils";
import {
  buildAdminTicketPresenceBody,
  loadTicketRetentionHours,
  loadTickets,
  saveTicketRetentionHours,
  saveTickets,
  ticketNeedsStaffPresenceMessage,
  useTicketsCenter,
  type TicketAttachment,
  type TicketRetentionHours,
  type TicketStatus,
  type TicketThread,
  type TicketTypeRole,
} from "@/lib/ticketsCenter";
import {
  ADMIN_TICKET_TYPE_DEFINITIONS,
  getTicketTypeByRole,
  getTicketTypeBySlug,
  staffCanAccessTicketSlug,
  STORE_TICKET_SLUG,
} from "@/lib/ticketTypesConfig";
import { revokePendingTicketAttachment } from "@/lib/ticketAttachmentRead";
import { listenStorageSync } from "@/lib/storageSync";

const TICKET_RETENTION_STORAGE_KEY = "ic_tickets_retention_hours_v1";
const TICKET_RETENTION_CHANGED_EVENT = "ic-tickets-retention";

const TICKET_TYPES: { slug: string; label: string; role: TicketTypeRole & StaffRole; accent: string }[] =
  ADMIN_TICKET_TYPE_DEFINITIONS.map((d) => ({
    slug: d.slug,
    label: d.label,
    role: d.role as TicketTypeRole & StaffRole,
    accent: d.accent,
  }));

const STATUS_LABELS: Record<TicketStatus, string> = {
  in_review: "قيد المراجعة",
  waiting: "انتظار",
  closed: "مغلقة",
};

const STATUS_CLASSES: Record<TicketStatus, string> = {
  in_review:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/55 dark:bg-amber-950/45 dark:text-amber-200",
  waiting:
    "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-600/50 dark:bg-rose-950/40 dark:text-rose-200",
  closed:
    "border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-200",
};

type TicketNotification = {
  id: string;
  ticketId: string;
  typeSlug: string;
  message: string;
  createdAt: string;
  unread: boolean;
};

export type TicketsManagerPageProps = {
  /** صفحة «طلبات المتاجر» — نفس تكت «طلب المتجر» فقط بدون باقي أنواع التكت */
  storeOrdersOnly?: boolean;
  /** داخل مدير العصابات — نوع تكت واحد بدون تبديل الأنواع */
  embeddedGangSlug?: "gang-open";
};

const TicketsManagerPage = ({ storeOrdersOnly = false, embeddedGangSlug }: TicketsManagerPageProps) => {
  const { ticketType: ticketTypeParam } = useParams<{ ticketType?: string }>();
  const ticketType = embeddedGangSlug ?? ticketTypeParam;
  const navigate = useNavigate();
  const { user, isSuperAdmin } = useAuth();
  const tickets = useTicketsCenter();
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");
  const [chatOpen, setChatOpen] = useState(false);
  const [messageBody, setMessageBody] = useState("");
  const [messageAttachment, setMessageAttachment] = useState<TicketAttachment | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<TicketNotification[]>([]);
  const [retentionHours, setRetentionHours] = useState<TicketRetentionHours>(() => loadTicketRetentionHours());
  const previousSnapshotRef = useRef<Map<string, number>>(new Map());
  const didBootRef = useRef(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  const embeddedMode = !!embeddedGangSlug;

  useEffect(() => {
    return listenStorageSync(TICKET_RETENTION_STORAGE_KEY, () => setRetentionHours(loadTicketRetentionHours()), [
      TICKET_RETENTION_CHANGED_EVENT,
    ]);
  }, []);

  const visibleTicketTypes = useMemo(() => {
    if (storeOrdersOnly) {
      const storeDef = getTicketTypeBySlug(STORE_TICKET_SLUG);
      if (!storeDef) return [];
      const roles = user?.roles ?? [];
      const allowed =
        isSuperAdmin || roles.includes("ticket_store_manager") || roles.includes("store_orders_manager");
      return allowed
        ? [{ slug: storeDef.slug, label: storeDef.label, role: storeDef.role as TicketTypeRole & StaffRole, accent: storeDef.accent }]
        : [];
    }
    if (embeddedGangSlug) {
      const item = TICKET_TYPES.find((x) => x.slug === embeddedGangSlug);
      return item ? [item] : [];
    }
    const roles = user?.roles ?? [];
    return isSuperAdmin
      ? TICKET_TYPES
      : TICKET_TYPES.filter((item) => staffCanAccessTicketSlug(item.slug, roles, !!isSuperAdmin));
  }, [isSuperAdmin, user?.roles, storeOrdersOnly, embeddedGangSlug]);

  const activeType = storeOrdersOnly || embeddedMode
    ? visibleTicketTypes[0] ?? null
    : visibleTicketTypes.find((x) => x.slug === ticketType) ?? visibleTicketTypes[0] ?? null;
  const effectiveTypeRole = activeType?.role ?? null;
  const effectiveTypeLabel = embeddedMode ? "طلبات فتح عصابة" : (activeType?.label ?? "");

  useEffect(() => {
    if (storeOrdersOnly || embeddedMode) return;
    if (!activeType && visibleTicketTypes.length > 0) {
      navigate(`/dashboard/tickets/${visibleTicketTypes[0].slug}`, { replace: true });
    }
  }, [storeOrdersOnly, embeddedMode, activeType, visibleTicketTypes, navigate]);

  const scopedTickets = useMemo(
    () => tickets.filter((t) => t.typeRole === effectiveTypeRole).sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)),
    [tickets, effectiveTypeRole],
  );

  useEffect(() => {
    setMessageBody("");
    setMessageAttachment((prev) => {
      void revokePendingTicketAttachment(prev);
      return null;
    });
  }, [selectedTicketId]);

  const visibleTickets = useMemo(
    () => (statusFilter === "all" ? scopedTickets : scopedTickets.filter((t) => t.status === statusFilter)),
    [scopedTickets, statusFilter],
  );

  const selectedTicket = useMemo(
    () => scopedTickets.find((t) => t.id === selectedTicketId) ?? null,
    [scopedTickets, selectedTicketId],
  );

  useEffect(() => {
    if (visibleTicketTypes.length === 0) return;
    const allowedRoles = new Set(visibleTicketTypes.map((x) => x.role));
    const scope = tickets.filter((t) => allowedRoles.has(t.typeRole));
    // إشعارات الأدمن تعتمد فقط على رسائل المستخدم (public)
    const nextMap = new Map<string, number>(
      scope.map((t) => [t.id, t.messages.filter((m) => (m.senderType ?? "public") === "public").length]),
    );
    if (!didBootRef.current) {
      previousSnapshotRef.current = nextMap;
      didBootRef.current = true;
      return;
    }
    for (const ticket of scope) {
      const prevCount = previousSnapshotRef.current.get(ticket.id) ?? 0;
      const typeSlug =
        TICKET_TYPES.find((x) => x.role === ticket.typeRole)?.slug ??
        getTicketTypeByRole(ticket.typeRole)?.slug ??
        "high-admin";
      // إذا الشات مفتوح حالياً على هذا التكت، لا نرسل إشعارات عليه
      if (chatOpen && selectedTicketId === ticket.id) {
        continue;
      }
      if (prevCount === 0) {
        const message = `تكت جديد: ${ticket.subject}`;
        setNotifications((prev) => [
          { id: crypto.randomUUID(), ticketId: ticket.id, typeSlug, message, createdAt: new Date().toISOString(), unread: true },
          ...prev,
        ]);
        toast.info(message);
      } else if ((nextMap.get(ticket.id) ?? 0) > prevCount) {
        const message = `رسالة جديدة في: ${ticket.subject}`;
        setNotifications((prev) => [
          { id: crypto.randomUUID(), ticketId: ticket.id, typeSlug, message, createdAt: new Date().toISOString(), unread: true },
          ...prev,
        ]);
        toast.info(message);
      }
    }
    previousSnapshotRef.current = nextMap;
  }, [tickets, visibleTicketTypes, chatOpen, selectedTicketId]);

  const unreadCount = notifications.filter((n) => n.unread).length;
  const unreadByTypeSlug = useMemo(() => {
    const map = new Map<string, number>();
    // نحسب لكل نوع عدد التكتات التي تحتوي رسائل جديدة من الزبون
    const allowedRoles = new Set(visibleTicketTypes.map((x) => x.role));
    for (const ticket of tickets) {
      if (!allowedRoles.has(ticket.typeRole)) continue;
      const typeSlug =
        TICKET_TYPES.find((x) => x.role === ticket.typeRole)?.slug ??
        getTicketTypeByRole(ticket.typeRole)?.slug;
      if (!typeSlug) continue;
      const cutoff = ticket.lastStaffReadAt ? new Date(ticket.lastStaffReadAt).getTime() : 0;
      const hasUnread = ticket.messages.some(
        (m) => (m.senderType ?? "public") === "public" && new Date(m.at).getTime() > cutoff,
      );
      if (!hasUnread) continue;
      map.set(typeSlug, (map.get(typeSlug) ?? 0) + 1);
    }
    return map;
  }, [tickets, visibleTicketTypes]);

  const openFromNotification = (notificationId: string, typeSlug: string, ticketId: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, unread: false } : n)));
    setNotificationsOpen(false);
    navigate(
      storeOrdersOnly || typeSlug === STORE_TICKET_SLUG
        ? "/dashboard/store-orders"
        : `/dashboard/tickets/${typeSlug}`,
    );
    setSelectedTicketId(ticketId);
    setChatOpen(true);
  };

  const clearNotificationsForTicket = (ticketId: string) => {
    setNotifications((prev) => prev.filter((n) => n.ticketId !== ticketId));
  };

  const updateTicket = (ticketId: string, updater: (current: TicketThread) => TicketThread) => {
    const next = loadTickets().map((ticket) => (ticket.id === ticketId ? updater(ticket) : ticket));
    saveTickets(next);
  };

  const handleRetentionChange = (hours: TicketRetentionHours) => {
    if (!isSuperAdmin) {
      toast.error("فقط السوبر أدمن يمكنه تغيير مدة التكتات");
      return;
    }
    setRetentionHours(hours);
    saveTicketRetentionHours(hours);
    saveTickets(loadTickets());
    appendActivityLog(
      user?.username ?? "super_admin",
      "تغيير مدة صلاحية التكتات",
      hours === 24 ? "تم ضبطها على 24 ساعة" : "تم ضبطها على 3 أيام",
    );
    toast.success(hours === 24 ? "تم ضبط مدة التكتات: 24 ساعة" : "تم ضبط مدة التكتات: 3 أيام");
  };

  const handleStatusChange = (ticketId: string, status: TicketStatus) => {
    updateTicket(ticketId, (ticket) => ({ ...ticket, status, updatedAt: new Date().toISOString() }));
    appendActivityLog(user?.username ?? "admin", "تغيير حالة تكت", `${ticketId.slice(0, 8)} -> ${STATUS_LABELS[status]}`);
  };

  const notifyAttachmentStorageIssue = () => {
    toast.error("تعذر حفظ الرد. تحقق من مساحة المتصفح أو جرّب ملفًا أصغر.");
  };

  const handleSendMessage = () => {
    if (!selectedTicket) return;
    const body = messageBody.trim();
    if (!body && !messageAttachment) return;
    try {
      updateTicket(selectedTicket.id, (ticket) => ({
        ...ticket,
        status: ticket.status === "waiting" ? "in_review" : ticket.status,
        updatedAt: new Date().toISOString(),
        messages: [
          ...ticket.messages,
          {
            id: crypto.randomUUID(),
            at: new Date().toISOString(),
            author: user?.username ?? "staff",
            body: body || (messageAttachment ? "مرفق" : ""),
            senderType: "staff",
            attachments: messageAttachment ? [messageAttachment] : [],
          },
        ],
      }));
    } catch {
      notifyAttachmentStorageIssue();
      return;
    }
    appendActivityLog(user?.username ?? "staff", "رد الإدمن على تكت", `${selectedTicket.subject} — تم الرد من الإدمن`);
    setMessageBody("");
    setMessageAttachment(null);
  };

  /** عند فتح نافذة الشات: انتظار → قيد المراجعة، ورسالة ترحيب تلقائية من الإدمن (مرة واحدة)، وتحديث آخر قراءة للطاقم */
  useEffect(() => {
    if (!chatOpen || !selectedTicketId || !user) return;
    clearNotificationsForTicket(selectedTicketId);
    const now = new Date().toISOString();
    const adminName = user.username?.trim() || "staff";
    updateTicket(selectedTicketId, (t) => {
      if (t.status === "closed") {
        return { ...t, lastStaffReadAt: now };
      }
      const next: TicketThread = { ...t, lastStaffReadAt: now, updatedAt: now };
      if (t.status === "waiting") {
        next.status = "in_review";
      }
      if (ticketNeedsStaffPresenceMessage(t)) {
        next.messages = [
          ...t.messages,
          {
            id: crypto.randomUUID(),
            at: now,
            author: adminName,
            body: buildAdminTicketPresenceBody(adminName),
            senderType: "staff",
          },
        ];
        next.staffPresenceSent = true;
      }
      return next;
    });
  }, [chatOpen, selectedTicketId, user?.username]);

  useEffect(() => {
    if (!chatOpen || !selectedTicket) return;
    const scrollToBottom = () => {
      if (chatScrollRef.current) {
        chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
      }
      chatEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
    };
    const timer = window.setTimeout(scrollToBottom, 0);
    return () => window.clearTimeout(timer);
  }, [chatOpen, selectedTicketId, selectedTicket?.messages.length]);

  if (visibleTicketTypes.length === 0) {
    return (
      <div className="rounded-xl border border-rose-200 bg-white/95 p-4 text-right text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-900/90 dark:text-slate-300">
        لا تملك صلاحية على أي نوع تكت حالياً.
      </div>
    );
  }
  if (!storeOrdersOnly && !embeddedMode && ticketType === STORE_TICKET_SLUG) {
    return <Navigate to="/dashboard/store-orders" replace />;
  }

  if (!storeOrdersOnly && !embeddedMode && !ticketType) {
    return <Navigate to={`/dashboard/tickets/${visibleTicketTypes[0].slug}`} replace />;
  }

  return (
    <section className="mx-auto max-w-6xl space-y-6">
      <div
        className={cn(
          "rounded-2xl border border-rose-200 bg-gradient-to-b p-5 text-right shadow-[0_18px_44px_-30px_rgba(127,29,29,0.45)]",
          (embeddedGangSlug ? getTicketTypeBySlug(embeddedGangSlug)?.accent : activeType?.accent) ??
            "from-white to-rose-50",
          "dark:border-slate-600 dark:from-slate-900 dark:to-slate-950 dark:shadow-[0_18px_44px_-30px_rgba(0,0,0,0.5)]",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-50">
              {storeOrdersOnly ? "طلبات المتاجر" : effectiveTypeLabel}
            </h1>
            <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
              {storeOrdersOnly
                ? "طلبات المتجر من صفحة المتجر العامة — اعرض الموضوع والزبون ورد من هنا."
                : embeddedGangSlug
                  ? "طلبات تأسيس عصابة جديدة — راجع التفاصيل ورد على المتقدم. عند القبول أضف العصابة من «بطاقات العصابات»."
                  : "جدول تكتات احترافي مع فلترة ونافذة شات للرد على الزبون."}
            </p>
            {isSuperAdmin && !storeOrdersOnly && !embeddedMode ? (
              <div className="mt-3 inline-flex overflow-hidden rounded-lg border border-rose-300 bg-white text-xs dark:border-slate-600 dark:bg-slate-800">
                <button
                  type="button"
                  className={cn(
                    "px-3 py-1.5",
                    retentionHours === 24 ? "bg-[#36164f] text-white" : "text-slate-700 dark:text-slate-300",
                  )}
                  onClick={() => handleRetentionChange(24)}
                >
                  مدة التكت: 24 ساعة
                </button>
                <button
                  type="button"
                  className={cn(
                    "border-r border-rose-200 px-3 py-1.5 dark:border-slate-600",
                    retentionHours === 72 ? "bg-[#36164f] text-white" : "text-slate-700 dark:text-slate-300",
                  )}
                  onClick={() => handleRetentionChange(72)}
                >
                  مدة التكت: 3 أيام
                </button>
              </div>
            ) : null}
            {isSuperAdmin && !storeOrdersOnly && !embeddedMode ? (
              <p className="mt-2 max-w-xl text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                مدة الحذف التلقائي (24 ساعة / 3 أيام) لا تُطبَّق على{" "}
                <strong className="font-semibold text-slate-600 dark:text-slate-300">طلبات المتجر</strong>؛ تظل محفوظة
                بدون انتهاء وقتي، على عكس باقي أنواع التكت.
              </p>
            ) : null}
          </div>
          <div className="relative">
            <button
              type="button"
              className="relative inline-flex items-center gap-1 rounded-full border border-rose-300 bg-white/90 px-3 py-1 text-xs text-rose-700 hover:bg-white dark:border-slate-600 dark:bg-slate-800/95 dark:text-rose-200 dark:hover:bg-slate-800"
              onClick={() => setNotificationsOpen((v) => !v)}
            >
              <BellRing className="h-3.5 w-3.5" />
              الإشعارات
              {unreadCount > 0 ? (
                <span className="absolute -left-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] text-white">
                  {unreadCount}
                </span>
              ) : null}
            </button>
            {notificationsOpen ? (
              <div className="absolute left-0 z-20 mt-2 w-80 overflow-hidden rounded-xl border border-rose-200 bg-white shadow-xl dark:border-slate-600 dark:bg-slate-900 dark:shadow-black/40">
                <div className="border-b border-rose-100 px-3 py-2 text-right text-xs text-slate-600 dark:border-slate-700 dark:text-slate-400">
                  آخر الإشعارات
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.slice(0, 25).map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => openFromNotification(n.id, n.typeSlug, n.ticketId)}
                        className={cn(
                          "w-full border-b border-rose-100 px-3 py-2 text-right hover:bg-rose-50 dark:border-slate-800 dark:hover:bg-slate-800/80",
                          n.unread && "bg-rose-50/60 dark:bg-slate-800/70",
                        )}
                      >
                        <p className="text-sm text-slate-800 dark:text-slate-100">{n.message}</p>
                        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                          {new Date(n.createdAt).toLocaleString("ar")}
                        </p>
                      </button>
                    ))
                  ) : (
                    <p className="px-3 py-4 text-right text-sm text-slate-500 dark:text-slate-400">
                      لا يوجد إشعارات حالياً.
                    </p>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {!storeOrdersOnly && !embeddedMode ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleTicketTypes.map((item) => (
            <Button
              key={item.role}
              type="button"
              asChild
              variant="outline"
              className={cn(
                "h-12 justify-center rounded-xl border-rose-300 bg-white text-sm text-rose-800 hover:bg-rose-50 hover:text-rose-900 dark:border-slate-600 dark:bg-slate-800 dark:text-rose-200 dark:hover:bg-slate-700 dark:hover:text-rose-100",
                effectiveTypeRole === item.role &&
                  "border-[#36164f] bg-[#36164f] text-white hover:bg-[#2f1344] hover:text-white dark:border-[#36164f]",
              )}
            >
              <Link to={`/dashboard/tickets/${item.slug}`} className="relative inline-flex w-full items-center justify-center">
                <MessageSquareMore className="ms-2 h-4 w-4" />
                {item.label}
                {(unreadByTypeSlug.get(item.slug) ?? 0) > 0 ? (
                  <span className="absolute -left-2 -top-2 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] text-white">
                    {unreadByTypeSlug.get(item.slug)}
                  </span>
                ) : null}
              </Link>
            </Button>
          ))}
        </div>
      ) : null}

      <div className="rounded-2xl border border-rose-200 bg-white/95 p-4 shadow-[0_16px_36px_-24px_rgba(54,22,79,0.35)] dark:border-slate-700 dark:bg-slate-900/95 dark:shadow-[0_16px_36px_-24px_rgba(0,0,0,0.45)]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="font-display text-sm text-slate-700 dark:text-slate-300">
            {effectiveTypeLabel} — عدد التكتات: {visibleTickets.length}
          </p>
          <div className="inline-flex overflow-hidden rounded-lg border border-rose-200 bg-white text-xs dark:border-slate-600 dark:bg-slate-800">
            <button
              type="button"
              className={cn(
                "px-2.5 py-1.5",
                statusFilter === "all" ? "bg-[#36164f] text-white" : "text-slate-700 dark:text-slate-300",
              )}
              onClick={() => setStatusFilter("all")}
            >
              الكل
            </button>
            <button
              type="button"
              className={cn(
                "border-r border-rose-200 px-2.5 py-1.5 dark:border-slate-600",
                statusFilter === "in_review"
                  ? "bg-amber-100 text-amber-900 dark:bg-amber-950/55 dark:text-amber-100"
                  : "text-slate-700 dark:text-slate-300",
              )}
              onClick={() => setStatusFilter("in_review")}
            >
              قيد المراجعة
            </button>
            <button
              type="button"
              className={cn(
                "border-r border-rose-200 px-2.5 py-1.5 dark:border-slate-600",
                statusFilter === "waiting"
                  ? "bg-rose-100 text-rose-900 dark:bg-rose-950/50 dark:text-rose-100"
                  : "text-slate-700 dark:text-slate-300",
              )}
              onClick={() => setStatusFilter("waiting")}
            >
              انتظار
            </button>
            <button
              type="button"
              className={cn(
                "border-r border-rose-200 px-2.5 py-1.5 dark:border-slate-600",
                statusFilter === "closed"
                  ? "bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-slate-100"
                  : "text-slate-700 dark:text-slate-300",
              )}
              onClick={() => setStatusFilter("closed")}
            >
              مغلقة
            </button>
          </div>
        </div>

        {visibleTickets.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-rose-200 dark:border-slate-700">
            <table className="w-full text-right text-sm">
              <thead className="bg-rose-50/70 text-slate-700 dark:bg-slate-800/90 dark:text-slate-200">
                <tr>
                  <th className="px-3 py-2 font-medium">الموضوع</th>
                  {embeddedGangSlug ? <th className="px-3 py-2 font-medium">العصابة المقترحة</th> : null}
                  <th className="px-3 py-2 font-medium">الزبون</th>
                  <th className="px-3 py-2 font-medium">الحالة</th>
                  <th className="px-3 py-2 font-medium">آخر تحديث</th>
                </tr>
              </thead>
              <tbody>
                {visibleTickets.map((ticket) => {
                  const cutoff = ticket.lastStaffReadAt ? new Date(ticket.lastStaffReadAt).getTime() : 0;
                  const unreadForTicket = ticket.messages.filter(
                    (m) => (m.senderType ?? "public") === "public" && new Date(m.at).getTime() > cutoff,
                  ).length;

                  return (
                    <tr
                      key={ticket.id}
                      className="cursor-pointer border-t border-rose-100 bg-white hover:bg-rose-50/45 dark:border-slate-700 dark:bg-slate-900/40 dark:hover:bg-slate-800/70"
                      onClick={() => {
                        setSelectedTicketId(ticket.id);
                        setChatOpen(true);
                      }}
                    >
                      <td className="px-3 py-2 font-display text-slate-900 dark:text-slate-100">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate">{ticket.subject}</span>
                          {unreadForTicket > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-800 dark:bg-rose-950/50 dark:text-rose-200">
                              جديد
                              <span className="rounded-full bg-rose-600 px-1 text-[10px] text-white">{unreadForTicket}</span>
                            </span>
                          ) : null}
                        </div>
                      </td>
                      {embeddedGangSlug ? (
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                          {ticket.gangOpenProposedName ?? "—"}
                        </td>
                      ) : null}
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{ticket.openedBy}</td>
                      <td className="px-3 py-2">
                        <span className={cn("rounded-full border px-2 py-0.5 text-[11px]", STATUS_CLASSES[ticket.status])}>
                          {STATUS_LABELS[ticket.status]}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
                        {new Date(ticket.updatedAt).toLocaleString("ar")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded-xl border border-rose-200 bg-rose-50/40 p-3 text-right text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
            لا توجد تكتات في هذا الفلتر حالياً.
          </p>
        )}
      </div>

      <Dialog
        open={chatOpen && !!selectedTicket}
        onOpenChange={(open) => {
          setChatOpen(open);
          if (!open) {
            setMessageBody("");
            setMessageAttachment((prev) => {
              void revokePendingTicketAttachment(prev);
              return null;
            });
          }
        }}
      >
        <DialogContent
          dir="rtl"
          className={cn(
            "flex max-h-[min(90dvh,calc(100svh-1.5rem))] w-[calc(100%-1rem)] max-w-5xl flex-col gap-0 overflow-hidden border-slate-200/95 bg-white p-0 text-right shadow-[0_28px_72px_-24px_rgba(15,23,42,0.38)] dark:border-slate-600 dark:bg-slate-900 sm:w-[min(100%,56rem)] sm:rounded-2xl",
          )}
        >
          <DialogHeader className="shrink-0 space-y-0 px-4 pb-2 pt-5 text-right sm:px-6 sm:pt-6">
            <DialogTitle className="font-display pe-8 text-slate-900 dark:text-slate-50">
              {selectedTicket?.subject ?? "تفاصيل التكت"}
            </DialogTitle>
          </DialogHeader>

          {selectedTicket ? (
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-4 sm:px-6">
              <div className="shrink-0 rounded-xl border border-rose-200 bg-white/90 p-3 dark:border-slate-600 dark:bg-slate-800/90">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    الزبون:{" "}
                    <span className="font-medium text-slate-900 dark:text-slate-100">{selectedTicket.openedBy}</span>
                  </p>
                  <span className={cn("rounded-full border px-2 py-0.5 text-[11px]", STATUS_CLASSES[selectedTicket.status])}>
                    {STATUS_LABELS[selectedTicket.status]}
                  </span>
                </div>
                {selectedTicket.gangOpenProposedName ? (
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                    مقترح: <span className="font-semibold">{selectedTicket.gangOpenProposedName}</span>
                    {selectedTicket.gangOpenSpecialty ? ` · ${selectedTicket.gangOpenSpecialty}` : ""}
                    {selectedTicket.gangOpenLocation ? ` · ${selectedTicket.gangOpenLocation}` : ""}
                  </p>
                ) : null}
                {selectedTicket.gangName && !selectedTicket.gangOpenProposedName ? (
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                    العصابة: <span className="font-semibold">{selectedTicket.gangName}</span>
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-800/50 dark:bg-amber-950/35 dark:text-amber-200 dark:hover:bg-amber-950/55"
                    onClick={() => handleStatusChange(selectedTicket.id, "in_review")}
                  >
                    <Clock3 className="ms-1 h-4 w-4" />
                    قيد المراجعة
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100 dark:border-rose-600/50 dark:bg-rose-950/35 dark:text-rose-200 dark:hover:bg-rose-950/55"
                    onClick={() => handleStatusChange(selectedTicket.id, "waiting")}
                  >
                    انتظار
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    onClick={() => handleStatusChange(selectedTicket.id, "closed")}
                  >
                    <XCircle className="ms-1 h-4 w-4" />
                    مغلقة
                  </Button>
                </div>
              </div>

              <div
                ref={chatScrollRef}
                className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain rounded-xl border border-rose-200 bg-rose-50/20 p-3 dark:border-slate-600 dark:bg-slate-950/50"
              >
                {selectedTicket.messages.map((msg) => {
                  const mine = msg.author === (user?.username ?? "");
                  return (
                    <div key={msg.id} className={cn("flex", mine ? "justify-start" : "justify-end")}>
                      <div
                        className={cn(
                          "max-w-[85%] rounded-xl border px-3 py-2 text-right",
                          mine
                            ? "border-rose-300 bg-rose-100/70 text-slate-900 dark:border-rose-600 dark:bg-rose-950/45 dark:text-slate-100"
                            : "border-rose-200 bg-white text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100",
                        )}
                      >
                        <p className="text-xs font-medium text-rose-800 dark:text-rose-300">{msg.author}</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm">{msg.body}</p>
                        {msg.attachments?.length ? (
                          <div className="mt-2 space-y-2">
                            {msg.attachments.map((att) => (
                              <TicketChatAttachmentMedia
                                key={att.id}
                                att={att}
                                variant={mine ? "dashStaff" : "dashCustomer"}
                              />
                            ))}
                          </div>
                        ) : null}
                        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                          {new Date(msg.at).toLocaleString("ar")}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              <div className="shrink-0 space-y-2 pb-1">
                <Label className="text-right text-slate-700 dark:text-slate-300">رد الإداري</Label>
                <Textarea
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="min-h-[80px] border-rose-200 bg-white text-slate-900 placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
                  placeholder="اكتب ردك للزبون..."
                />
                <TicketAttachmentPicker value={messageAttachment} onChange={setMessageAttachment} variant="admin" />
              </div>
            </div>
          ) : null}

          <DialogFooter className="shrink-0 gap-2 border-t border-rose-100 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900 sm:justify-start sm:px-6">
            <Button
              type="button"
              variant="outline"
              className="border-rose-200 bg-white text-rose-800 hover:bg-rose-50 dark:border-slate-600 dark:bg-slate-800 dark:text-rose-200 dark:hover:bg-slate-700"
              onClick={() => setChatOpen(false)}
            >
              إغلاق
            </Button>
            <Button
              type="button"
              disabled={!messageBody.trim() && !messageAttachment}
              className="bg-[#36164f] text-white hover:bg-[#2f1344] disabled:opacity-50"
              onClick={handleSendMessage}
            >
              <Send className="ms-1 h-4 w-4" />
              إرسال الرد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default TicketsManagerPage;
