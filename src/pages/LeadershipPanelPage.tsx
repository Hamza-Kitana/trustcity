import { useCallback, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowUpDown,
  Award,
  Crown,
  ImagePlus,
  ShieldAlert,
  ShieldCheck,
  Star,
  Trash2,
  UserCog,
  Users,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePublicUser } from "@/contexts/PublicUserContext";
import {
  useInstitutionRostersContent,
  type RosterMembershipRole,
} from "@/contexts/InstitutionRostersContentContext";
import { INSTITUTION_BRANCH_META } from "@/data/institutionBranches";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("read"));
    r.readAsDataURL(file);
  });
}

const roleLabel = (r: RosterMembershipRole): string =>
  r === "leader" ? "قائد" : r === "deputy" ? "نائب" : "عضو";

const LeadershipPanelPage = () => {
  const reduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const { user } = usePublicUser();
  const {
    findMembershipForUser,
    getBranchRoster,
    promoteMember,
    updateMember,
    removeMember,
  } = useInstitutionRostersContent();

  /** عضوية المستخدم الحالي في أي طاقم */
  const myMembership = useMemo(() => findMembershipForUser(user?.id), [findMembershipForUser, user?.id]);

  /** هل يحق للمستخدم استخدام الصفحة؟ — قائد أو نائب فقط */
  const canManage = !!myMembership && (myMembership.role === "leader" || myMembership.role === "deputy");

  const branchId = myMembership?.branchId ?? null;
  const branchMeta = branchId ? INSTITUTION_BRANCH_META[branchId] : null;
  const roster = branchId ? getBranchRoster(branchId) : null;

  const [editTarget, setEditTarget] = useState<
    | null
    | {
        kind: "leader" | "deputy" | "member";
        memberIndex?: number;
      }
  >(null);
  const [editName, setEditName] = useState("");
  const [editRank, setEditRank] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editImage, setEditImage] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [promoteTarget, setPromoteTarget] = useState<{
    memberIndex: number;
    name: string;
    image: string;
    currentRank?: string;
  } | null>(null);
  const [promoteRole, setPromoteRole] = useState<RosterMembershipRole>("deputy");
  const [promoteRank, setPromoteRank] = useState("");

  const [confirmRemove, setConfirmRemove] = useState<{ index: number; name: string } | null>(null);

  const openEdit = (
    kind: "leader" | "deputy" | "member",
    data: { name: string; rank: string; bio: string; image: string },
    memberIndex?: number,
  ) => {
    setEditTarget({ kind, memberIndex });
    setEditName(data.name);
    setEditRank(data.rank);
    setEditBio(data.bio);
    setEditImage(data.image);
  };

  const handleEditFile = useCallback(async (file: File | null | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("الصورة كبيرة جداً (حد أقصى 2 ميجابايت)");
      return;
    }
    try {
      const url = await readFileAsDataUrl(file);
      setEditImage(url);
      toast.success("تم تحديث الصورة");
    } catch {
      toast.error("تعذر قراءة الصورة");
    }
  }, []);

  if (!user) return <Navigate to="/" replace />;

  const saveEdit = () => {
    if (!editTarget || !branchId || !roster) return;
    if (editTarget.kind === "member" && typeof editTarget.memberIndex === "number") {
      const idx = editTarget.memberIndex;
      const prev = roster.members[idx];
      const editingSelfMember = prev?.userId === user.id;
      const patch: Parameters<typeof updateMember>[2] = {
        title: editName.trim() || prev.title,
        bio: editBio.trim() || undefined,
        image: editImage || prev.image,
      };
      if (!editingSelfMember) {
        patch.subtitle = editRank.trim() || prev.subtitle;
        patch.rankLabel = editRank.trim() || prev.rankLabel || "عضو";
      }
      updateMember(branchId, idx, patch);
      toast.success(editingSelfMember ? "تم تحديث صورتك ونبذتك (الرتبة لا تُعدَّل بنفسك)" : "تم تحديث بيانات العضو");
      setEditTarget(null);
      return;
    }
    /** للقائد/النائب: استخدم API الترقية لإعادة كتابة بياناته */
    const slot = editTarget.kind;
    const personUserId = slot === "leader" ? roster.leader.userId : roster.deputy.userId;
    if (!personUserId) {
      toast.error("لا يمكن تعديل هذا الحقل عبر هذه الصفحة (الشخص ليس له حساب مستخدم مرتبط).");
      return;
    }
    if (personUserId === user.id) {
      toast.error("لا يمكنك تغيير رتبتك في الطاقم بنفسك — اطلب قائد المؤسسة أو الإدارة.");
      return;
    }
    promoteMember(branchId, { userId: personUserId }, slot, editRank.trim() || undefined);
    /** نحدّث الصورة والاسم بشكل يدوي عبر setBranchRoster لو احتجنا — لكن هنا فقط الرتبة */
    toast.success("تم حفظ التغييرات");
    setEditTarget(null);
  };

  const submitPromote = () => {
    if (!promoteTarget || !branchId || !roster) return;
    const promoted = roster.members[promoteTarget.memberIndex];
    if (promoted?.userId === user.id) {
      toast.error("لا يمكنك ترقية نفسك أو تغيير دورك بنفسك من هذه اللوحة.");
      return;
    }
    const result = promoteMember(
      branchId,
      { memberIndex: promoteTarget.memberIndex },
      promoteRole,
      promoteRank.trim() || undefined,
    );
    if (result === "leader_conflict") {
      toast.error("يوجد قائد حالياً — خفّض القائد القديم إلى عضو أولاً");
      return;
    }
    if (result === "deputy_conflict") {
      toast.error("يوجد نائب حالياً — خفّض النائب القديم إلى عضو أولاً");
      return;
    }
    if (result === "ok") {
      toast.success(
        promoteRole === "leader"
          ? "تم تعيين قائد جديد"
          : promoteRole === "deputy"
            ? "تم تعيين نائب جديد"
            : "تم تحديث رتبة العضو",
      );
      setPromoteTarget(null);
      setPromoteRole("deputy");
      setPromoteRank("");
    }
  };

  if (!canManage || !branchId || !roster || !branchMeta) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#f4f0fb] text-slate-900 antialiased">
        <Navbar />
        <main className="relative z-10 mx-auto flex min-h-[calc(100vh-200px)] max-w-3xl flex-col items-center justify-center px-4 py-24 md:px-8">
          <div className="w-full overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-l from-amber-50 via-white to-amber-50 p-8 text-right shadow-xl md:p-10">
            <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-start sm:text-right">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 shadow-inner">
                <ShieldAlert className="h-8 w-8" />
              </div>
              <div className="flex-1 space-y-2">
                <p className="font-display text-[11px] font-semibold tracking-[0.32em] text-amber-700">
                  الوصول مقيد
                </p>
                <h1 className="font-display text-2xl font-bold text-slate-900 md:text-3xl">
                  هذه الصفحة للقادة والنواب فقط
                </h1>
                <p className="text-sm leading-relaxed text-slate-700">
                  يمكن للقائد أو نائب القائد لأي مؤسسة معتمدة الوصول إلى هذه اللوحة لإدارة رتب أعضاء طاقمه.
                  يبدو أنك لست مسجَّلاً حالياً كقائد أو نائب لأي مؤسسة.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                  <Button
                    type="button"
                    className="rounded-xl bg-rose-700 text-white hover:bg-rose-800"
                    onClick={() => navigate("/profile")}
                  >
                    العودة إلى البروفايل
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl border-rose-300 bg-white text-rose-700 hover:bg-rose-50"
                    onClick={() => navigate("/")}
                  >
                    الصفحة الرئيسية
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer forceLight />
      </div>
    );
  }

  const isLeader = myMembership.role === "leader";
  const leaderSlotIsSelf = roster.leader.userId === user.id;
  const deputySlotIsSelf = roster.deputy.userId === user.id;

  const editingOwnMember =
    !!editTarget &&
    editTarget.kind === "member" &&
    typeof editTarget.memberIndex === "number" &&
    roster.members[editTarget.memberIndex]?.userId === user.id;

  return (
    <div dir="rtl" className="min-h-screen bg-[#f4f0fb] text-slate-900 antialiased">
      <Navbar />

      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute -left-24 top-0 h-56 w-56 rounded-full bg-amber-300/30 blur-[90px]" />
        <div className="pointer-events-none absolute -right-20 top-24 h-48 w-48 rounded-full bg-red-300/25 blur-[80px]" />

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="relative mx-auto max-w-6xl px-4 pt-24 md:px-8"
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="text-center md:text-right">
              <p className="font-display text-[11px] tracking-[0.28em] text-amber-700/90">
                لوحة قيادة المؤسسة
              </p>
              <h1 className="mt-2 flex flex-wrap items-center gap-2 font-display text-3xl font-bold text-slate-900 md:text-4xl">
                {isLeader ? <Crown className="h-7 w-7 text-amber-500" /> : <Star className="h-7 w-7 text-indigo-500" />}
                {branchMeta.labelAr}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                مرحباً <span className="font-semibold text-slate-900">{user.displayName}</span> — أنت تعمل
                هنا بصفة <span className="font-semibold text-amber-700">{roleLabel(myMembership.role)}</span>.
                يمكنك إدارة أعضاء الطاقم الآخرين؛ لا يمكنك تغيير رتبتك أو دورك بنفسك من هذه اللوحة.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl border-rose-300 bg-white text-rose-700 hover:bg-rose-50"
                onClick={() => navigate(branchMeta.previewPath)}
              >
                معاينة في الموقع
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl border-rose-300 bg-white text-rose-700 hover:bg-rose-50"
                onClick={() => navigate("/profile")}
              >
                البروفايل
              </Button>
            </div>
          </div>
        </motion.div>
      </div>

      <main className="relative z-10 mx-auto max-w-6xl space-y-8 px-4 py-10 md:px-8">
        {/* القيادة العليا */}
        <Card className="border-amber-200/80 bg-white shadow-[0_24px_60px_-28px_rgba(245,158,11,0.35)]">
          <CardHeader className="border-b border-amber-100 bg-gradient-to-l from-amber-50/80 to-white text-right">
            <CardTitle className="flex items-center justify-end gap-2 font-display text-lg text-slate-900">
              <ShieldCheck className="h-5 w-5 text-amber-600" />
              القيادة العليا
            </CardTitle>
            <CardDescription className="text-slate-600">
              القائد والنائب يظهران في أعلى صفحة المؤسسة. لا يمكنك تعديل بطاقتك الخاصة هنا — غيّر رتبتك عبر
              الإدارة أو زميل قائد. يمكنك تعديل الآخرين حسب صلاحيتك.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 p-4 md:grid-cols-2 md:p-6">
            <LeadershipSlotCard
              roleBadge="القائد"
              accent="amber"
              icon={<Crown className="h-5 w-5" />}
              person={roster.leader}
              canEditSelf={isLeader && !leaderSlotIsSelf}
              onEdit={() =>
                openEdit("leader", {
                  name: roster.leader.name,
                  rank: roster.leader.title,
                  bio: roster.leader.bio || "",
                  image: roster.leader.image,
                })
              }
            />
            <LeadershipSlotCard
              roleBadge="النائب"
              accent="indigo"
              icon={<Star className="h-5 w-5" />}
              person={roster.deputy}
              canEditSelf={(isLeader || myMembership.role === "deputy") && !deputySlotIsSelf}
              onEdit={() =>
                openEdit("deputy", {
                  name: roster.deputy.name,
                  rank: roster.deputy.title,
                  bio: roster.deputy.bio || "",
                  image: roster.deputy.image,
                })
              }
            />
          </CardContent>
        </Card>

        {/* الأعضاء */}
        <Card className="border-rose-200/80 bg-white shadow-[0_24px_60px_-28px_rgba(54,22,79,0.28)]">
          <CardHeader className="border-b border-rose-100 bg-gradient-to-l from-rose-50/80 to-white text-right">
            <CardTitle className="flex items-center justify-end gap-2 font-display text-lg text-slate-900">
              <Users className="h-5 w-5 text-rose-600" />
              أعضاء الطاقم ({roster.members.length})
            </CardTitle>
            <CardDescription className="text-slate-600">
              هنا تظهر بطاقات أعضاء طاقمك. يمكنك إدارة الآخرين؛ بطاقتك لا يُسمح بتغيير رتبتها أو دورك منها
              بنفسك.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 p-4 md:p-6">
            {roster.members.length === 0 ? (
              <div className="rounded-xl border border-dashed border-rose-200 bg-rose-50/40 p-6 text-center text-sm text-slate-600">
                لا يوجد أعضاء حالياً في الطاقم.
              </div>
            ) : (
              <ul className="space-y-2">
                {roster.members.map((member, idx) => {
                  const memberIsSelf = !!member.userId && member.userId === user.id;
                  return (
                  <li
                    key={`${member.userId ?? idx}-${idx}`}
                    className="flex flex-wrap items-center gap-3 rounded-2xl border border-rose-200 bg-white p-3 shadow-sm md:flex-nowrap"
                  >
                    <img
                      src={member.image || "/placeholder.svg"}
                      alt={member.title}
                      className="h-14 w-14 shrink-0 rounded-xl border border-rose-100 object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-sm font-semibold text-slate-900">
                        {member.title}
                      </p>
                      <p className="truncate text-xs text-slate-600">
                        {member.rankLabel || member.subtitle}
                      </p>
                      {member.discordId ? (
                        <p className="mt-0.5 truncate font-mono text-[10px] text-slate-400" dir="ltr">
                          discord:{member.discordId}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-lg border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
                        onClick={() =>
                          openEdit(
                            "member",
                            {
                              name: member.title,
                              rank: member.rankLabel || member.subtitle,
                              bio: member.bio || "",
                              image: member.image,
                            },
                            idx,
                          )
                        }
                      >
                        <UserCog className="ms-1 h-3.5 w-3.5" /> تعديل
                      </Button>
                      {memberIsSelf ? (
                        <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] text-slate-600">
                          لا يمكن تغيير رتبتك أو دورك بنفسك
                        </span>
                      ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-lg border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                        onClick={() => {
                          setPromoteTarget({
                            memberIndex: idx,
                            name: member.title,
                            image: member.image,
                            currentRank: member.rankLabel || member.subtitle,
                          });
                          setPromoteRole("deputy");
                          setPromoteRank(member.rankLabel || member.subtitle || "");
                        }}
                      >
                        <ArrowUpDown className="ms-1 h-3.5 w-3.5" /> ترقية / تغيير الدور
                      </Button>
                      )}
                      {isLeader && !memberIsSelf ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-lg border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                          onClick={() => setConfirmRemove({ index: idx, name: member.title })}
                        >
                          <Trash2 className="ms-1 h-3.5 w-3.5" /> إزالة
                        </Button>
                      ) : null}
                    </div>
                  </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>

      {/* نافذة تعديل عضو/قائد/نائب */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent dir="rtl" className="max-w-xl border-rose-200 bg-white text-slate-900 shadow-2xl">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center justify-end gap-2 font-display text-lg">
              <UserCog className="h-5 w-5 text-rose-700" />
              تعديل بيانات{" "}
              {editTarget?.kind === "leader" ? "القائد" : editTarget?.kind === "deputy" ? "النائب" : "العضو"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-right">
            <div className="flex flex-wrap items-center gap-3">
              <img
                src={editImage || "/placeholder.svg"}
                alt=""
                className="h-20 w-20 rounded-2xl border border-rose-200 object-cover"
              />
              <Button
                type="button"
                variant="outline"
                className="border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImagePlus className="ms-1 h-4 w-4" /> تغيير الصورة
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  void handleEditFile(f);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">الاسم</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="border-rose-200 bg-white"
                disabled={editTarget?.kind !== "member"}
              />
              {editTarget?.kind !== "member" ? (
                <p className="text-[11px] text-slate-500">
                  اسم القائد/النائب مرتبط بحساب المستخدم نفسه ولا يُعدّل من هنا.
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">الرتبة</Label>
              <Input
                value={editRank}
                onChange={(e) => setEditRank(e.target.value)}
                placeholder="مثال: ضابط مرور — رقيب — مسعف"
                className="border-rose-200 bg-white"
                disabled={!!editingOwnMember}
              />
              {editingOwnMember ? (
                <p className="text-[11px] text-slate-500">
                  لا يمكنك تعديل رتبتك بنفسك — اطلب القائد أو الإدارة. يمكنك تحديث الصورة أو الاسم الظاهر أو النبذة
                  فقط.
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">نبذة (اختياري)</Label>
              <Textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                placeholder="نبذة قصيرة"
                className="min-h-[90px] border-rose-200 bg-white"
                disabled={editTarget?.kind !== "member"}
              />
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2 border-t border-rose-100 pt-4">
            <Button
              type="button"
              variant="outline"
              className="border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
              onClick={() => setEditTarget(null)}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              className="bg-rose-600 text-white hover:bg-rose-700"
              onClick={saveEdit}
            >
              حفظ
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* نافذة الترقية/تغيير الدور */}
      <Dialog open={!!promoteTarget} onOpenChange={(open) => !open && setPromoteTarget(null)}>
        <DialogContent dir="rtl" className="max-w-md border-amber-200 bg-white text-slate-900 shadow-2xl">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center justify-end gap-2 font-display text-lg">
              <Award className="h-5 w-5 text-amber-600" />
              تغيير دور العضو
            </DialogTitle>
          </DialogHeader>
          {promoteTarget ? (
            <div className="space-y-3 text-right">
              <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                <img
                  src={promoteTarget.image || "/placeholder.svg"}
                  alt=""
                  className="h-14 w-14 rounded-xl border border-amber-200 object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display font-semibold text-slate-900">{promoteTarget.name}</p>
                  <p className="truncate text-xs text-slate-600">
                    الرتبة الحالية: {promoteTarget.currentRank || "—"}
                  </p>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">الدور الجديد</Label>
                <div className="grid grid-cols-3 gap-2 rounded-xl border border-rose-200 bg-white p-1">
                  {(
                    [
                      { v: "member", l: "عضو" },
                      { v: "deputy", l: "نائب" },
                      { v: "leader", l: "قائد" },
                    ] as { v: RosterMembershipRole; l: string }[]
                  ).map((opt) => {
                    const disabled = opt.v === "leader" && !isLeader;
                    return (
                      <button
                        key={opt.v}
                        type="button"
                        disabled={disabled}
                        onClick={() => setPromoteRole(opt.v)}
                        className={cn(
                          "rounded-lg px-3 py-2 text-sm font-display transition",
                          disabled && "cursor-not-allowed opacity-40",
                          promoteRole === opt.v
                            ? opt.v === "leader"
                              ? "bg-amber-100 text-amber-800 ring-1 ring-amber-400"
                              : opt.v === "deputy"
                                ? "bg-indigo-100 text-indigo-800 ring-1 ring-indigo-400"
                                : "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-400"
                            : "text-slate-600 hover:bg-rose-50",
                        )}
                      >
                        {opt.l}
                      </button>
                    );
                  })}
                </div>
                {!isLeader ? (
                  <p className="text-[11px] text-slate-500">
                    تعيين القائد متاح للقائد الحالي فقط.
                  </p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">الرتبة (نص حر)</Label>
                <Input
                  value={promoteRank}
                  onChange={(e) => setPromoteRank(e.target.value)}
                  placeholder={
                    promoteRole === "leader"
                      ? "قائد المؤسسة"
                      : promoteRole === "deputy"
                        ? "نائب القائد"
                        : "ضابط — رقيب — مسعف…"
                  }
                  className="border-rose-200 bg-white"
                />
              </div>
            </div>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2 border-t border-amber-100 pt-4">
            <Button
              type="button"
              variant="outline"
              className="border-amber-200 bg-white text-amber-700 hover:bg-amber-50"
              onClick={() => setPromoteTarget(null)}
            >
              إلغاء
            </Button>
            <Button type="button" className="bg-amber-600 text-white hover:bg-amber-700" onClick={submitPromote}>
              تأكيد
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!confirmRemove}
        onOpenChange={(open) => !open && setConfirmRemove(null)}
      >
        <AlertDialogContent dir="rtl" className="border-rose-200 bg-white text-slate-900">
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle className="font-display text-lg">إزالة العضو من الطاقم</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">
              هل أنت متأكد من إزالة <span className="font-semibold text-rose-700">{confirmRemove?.name}</span>{" "}
              من قائمة الأعضاء؟ يمكنك إعادة تعيينه لاحقاً عبر طلب جديد أو من لوحة الإدارة.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:flex-row-reverse">
            <AlertDialogAction
              className="bg-rose-600 text-white hover:bg-rose-700"
              onClick={() => {
                if (!confirmRemove || !branchId) return;
                removeMember(branchId, confirmRemove.index);
                toast.success("تمت إزالة العضو من الطاقم");
                setConfirmRemove(null);
              }}
            >
              تأكيد الإزالة
            </AlertDialogAction>
            <AlertDialogCancel className="border-rose-200 bg-white text-slate-700 hover:bg-rose-50">
              إلغاء
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer forceLight />
    </div>
  );
};

export default LeadershipPanelPage;

/** بطاقة شاغر للقائد/النائب */
function LeadershipSlotCard({
  roleBadge,
  accent,
  icon,
  person,
  canEditSelf,
  onEdit,
}: {
  roleBadge: string;
  accent: "amber" | "indigo";
  icon: React.ReactNode;
  person: { name: string; title: string; image: string; bio: string; userId?: string; discordId?: string };
  canEditSelf: boolean;
  onEdit: () => void;
}) {
  const empty = !person.name || person.name.trim().length <= 1;
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-gradient-to-br from-white via-white to-slate-50 p-4 shadow-sm",
        accent === "amber" ? "border-amber-200" : "border-indigo-200",
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-1",
          accent === "amber" ? "bg-gradient-to-l from-amber-400 to-orange-500" : "bg-gradient-to-l from-indigo-400 to-rose-500",
        )}
      />
      <div className="flex flex-wrap items-start gap-3">
        <div className="relative">
          <img
            src={person.image || "/placeholder.svg"}
            alt={person.name}
            className="h-20 w-20 rounded-2xl border border-slate-200 object-cover shadow-sm"
          />
          <span
            className={cn(
              "absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full border bg-white px-2 py-0.5 text-[10px] font-display shadow-sm",
              accent === "amber" ? "border-amber-300 text-amber-700" : "border-indigo-300 text-indigo-700",
            )}
          >
            <span className="inline-flex items-center gap-1">{icon}{roleBadge}</span>
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-semibold text-slate-900">
            {empty ? <span className="text-slate-400">— شاغر —</span> : person.name}
          </p>
          <p className="truncate text-xs text-slate-600">{person.title || "—"}</p>
          {person.discordId ? (
            <p className="mt-0.5 truncate font-mono text-[10px] text-slate-400" dir="ltr">
              discord:{person.discordId}
            </p>
          ) : null}
        </div>
      </div>
      {person.bio ? (
        <p className="mt-3 line-clamp-3 text-[12px] leading-relaxed text-slate-600">{person.bio}</p>
      ) : null}
      <div className="mt-3 flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canEditSelf || empty}
          className={cn(
            "rounded-lg",
            accent === "amber"
              ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
              : "border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100",
          )}
          onClick={onEdit}
        >
          <UserCog className="ms-1 h-3.5 w-3.5" /> تعديل
        </Button>
      </div>
    </div>
  );
}
