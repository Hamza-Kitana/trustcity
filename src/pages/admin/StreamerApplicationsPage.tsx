import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ClipboardList, Video, XCircle } from "lucide-react";
import { toast } from "sonner";
import { StreamerCardEditFields } from "@/components/admin/StreamerCardEditFields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useApplicationsContent } from "@/contexts/ApplicationsContentContext";
import { useStreamersContent } from "@/contexts/StreamersContentContext";
import type { ApplicationRecord, ApplicationStatus } from "@/data/publicApplicationTypes";
import { appendActivityLog } from "@/lib/activityLog";
import {
  draftFromApplication,
  draftFromStreamerEntry,
  findStreamerByLinkedUserId,
  isStreamerApplication,
  STREAMER_MANAGER_DEFAULT_ROLE,
  type StreamerCardDraft,
} from "@/lib/streamerApplication";
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

const StreamerApplicationsPage = () => {
  const { user } = useAuth();
  const { applications, setDecision } = useApplicationsContent();
  const { items, upsertFromApplication } = useStreamersContent();
  const [filter, setFilter] = useState<ApplicationStatus | "all">("pending");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [cardDraft, setCardDraft] = useState<StreamerCardDraft>({
    name: "",
    role: STREAMER_MANAGER_DEFAULT_ROLE,
    bio: "",
    streamUrl: "",
    image: "/placeholder.svg",
  });
  const [search, setSearch] = useState("");

  const sorted = useMemo(
    () =>
      [...applications]
        .filter(isStreamerApplication)
        .sort((a, b) => +new Date(b.submittedAt) - +new Date(a.submittedAt)),
    [applications],
  );

  const filtered = useMemo(() => {
    const byStatus = filter === "all" ? sorted : sorted.filter((a) => a.status === filter);
    const q = search.trim().toLowerCase();
    if (!q) return byStatus;
    return byStatus.filter((a) =>
      `${a.snapshot.firstName} ${a.snapshot.lastName} ${a.snapshot.streamUrl ?? ""} ${a.snapshot.discord}`
        .toLowerCase()
        .includes(q),
    );
  }, [sorted, filter, search]);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    return sorted.find((a) => a.id === selectedId) ?? null;
  }, [sorted, selectedId]);

  useEffect(() => {
    setDecisionNote("");
    if (!selected) {
      setCardDraft({
        name: "",
        role: STREAMER_MANAGER_DEFAULT_ROLE,
        bio: "",
        streamUrl: "",
        image: "/placeholder.svg",
      });
      return;
    }
    const linked = findStreamerByLinkedUserId(items, selected.applicantUserId);
    if (linked) {
      setCardDraft(draftFromStreamerEntry(linked));
    } else {
      setCardDraft(draftFromApplication(selected, STREAMER_MANAGER_DEFAULT_ROLE));
    }
  }, [selected, items]);

  const saveLinkedCard = () => {
    if (!selected) return;
    upsertFromApplication(selected, cardDraft.role, cardDraft);
    appendActivityLog(
      user?.username?.trim() || "streamer_manager",
      "تعديل بطاقة صانع محتوى",
      cardDraft.name,
    );
    toast.success("تم حفظ تعديلات البطاقة");
  };

  const runDecision = (status: "approved" | "rejected") => {
    if (!selected || selected.status !== "pending") return;
    const actor = user?.username?.trim() || "streamer_manager";

    if (status === "approved") {
      upsertFromApplication(
        selected,
        cardDraft.role.trim() || STREAMER_MANAGER_DEFAULT_ROLE,
        cardDraft,
      );
    }

    setDecision(selected.id, status, actor, decisionNote);
    appendActivityLog(
      actor,
      status === "approved" ? "قبول صانع محتوى" : "رفض صانع محتوى",
      `${selected.snapshot.firstName} ${selected.snapshot.lastName}`,
    );
    setDecisionNote("");
    setSelectedId(null);
    toast.success(
      status === "approved"
        ? "تم القبول — أُضيفت البطاقة إلى صنّاع المحتوى تلقائياً"
        : "تم تسجيل الرفض",
    );
  };

  return (
    <div className={cn(adminPageWrap, "max-w-6xl")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center justify-end gap-2 font-display text-2xl font-bold text-slate-900 dark:text-slate-50">
            <ClipboardList className={adminTitleIcon} />
            طلبات الستريمر
          </h1>
          <p className={adminPageDesc}>
            طلبات التقديم كصانع محتوى من البروفايل أو صفحة صنّاع المحتوى. عند القبول تُنشأ البطاقة تلقائياً.
          </p>
        </div>
        <Button asChild variant="outline" className="border-rose-300">
          <Link to="/dashboard/streamers">
            <Video className="ms-2 h-4 w-4" />
            محرّر البطاقات
          </Link>
        </Button>
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
            placeholder="ابحث بالاسم أو رابط البث…"
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
                  {a.snapshot.avatarDataUrl ? (
                    <img
                      src={a.snapshot.avatarDataUrl}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 object-cover"
                    />
                  ) : null}
                  <p className="truncate text-sm font-display font-semibold text-slate-900 dark:text-slate-100">
                    {a.snapshot.firstName} {a.snapshot.lastName}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent dir="rtl" className={cn("w-[calc(100%-1rem)] max-w-2xl", adminDialogSurface)}>
          <DialogHeader className="text-right">
            <DialogTitle>طلب صانع محتوى</DialogTitle>
          </DialogHeader>
          {selected ? (
            <div className="space-y-4 text-right text-sm">
              <div className="flex items-start gap-3">
                {selected.snapshot.avatarDataUrl ? (
                  <img
                    src={selected.snapshot.avatarDataUrl}
                    alt=""
                    className="h-20 w-20 rounded-xl border object-cover"
                  />
                ) : null}
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-display text-lg font-bold text-slate-900">
                    {selected.snapshot.firstName} {selected.snapshot.lastName}
                  </p>
                  <p className="text-xs text-slate-500" dir="ltr">
                    {selected.snapshot.discord}
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-rose-200/80 bg-rose-50/40 p-4">
                <p className="mb-3 text-xs font-display font-semibold text-rose-800">
                  {selected.status === "pending"
                    ? "تعديل بيانات البطاقة قبل القبول"
                    : "تعديل بطاقة صانع المحتوى على الموقع"}
                </p>
                <StreamerCardEditFields
                  value={cardDraft}
                  onChange={setCardDraft}
                  inputClassName={adminInput}
                  compact
                />
              </div>

              {selected.status === "pending" ? (
                <>
                  <div>
                    <Label className="text-xs">ملاحظة (اختياري)</Label>
                    <Textarea
                      className="mt-1 min-h-[72px]"
                      value={decisionNote}
                      onChange={(e) => setDecisionNote(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      type="button"
                      className="bg-emerald-600 text-white hover:bg-emerald-700"
                      onClick={() => runDecision("approved")}
                    >
                      <CheckCircle2 className="ms-2 h-4 w-4" />
                      قبول وإضافة للبطاقات
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-rose-300 text-rose-700"
                      onClick={() => runDecision("rejected")}
                    >
                      <XCircle className="ms-2 h-4 w-4" />
                      رفض
                    </Button>
                  </div>
                </>
              ) : selected.status === "approved" ? (
                <>
                  <p className="text-slate-500">
                    القرار: {statusLabel(selected.status)} — {selected.decidedBy ?? "—"}
                  </p>
                  <div className="flex justify-end">
                    <Button type="button" className="bg-[#36164f] text-white hover:bg-[#2f1344]" onClick={saveLinkedCard}>
                      حفظ تعديلات البطاقة
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-slate-500">
                  القرار: {statusLabel(selected.status)} — {selected.decidedBy ?? "—"}
                </p>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StreamerApplicationsPage;
