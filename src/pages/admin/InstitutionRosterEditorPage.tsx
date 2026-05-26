import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BookOpen, Building2, GripVertical, ImagePlus, Lock, Plus, Settings2, ShieldQuestion, Trash2, Unlock } from "lucide-react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import {
  useInstitutionRostersContent,
  type RosterMembershipRole,
} from "@/contexts/InstitutionRostersContentContext";
import { useApplicationsContent } from "@/contexts/ApplicationsContentContext";
import {
  INSTITUTION_BRANCH_IDS,
  INSTITUTION_BRANCH_META,
  institutionRosterBranchIdsFromRoleList,
  isInstitutionBranchId,
  type InstitutionBranchId,
} from "@/data/institutionBranches";
import type { InstitutionRosterData } from "@/data/institutionRosters";
import { defaultRosterForBranch } from "@/data/institutionRostersDefaultState";
import type { RosterPerson } from "@/components/InstitutionRoster";
import type { ChromaGridItem } from "@/components/ChromaGrid";
import { InstitutionManageDialog } from "@/components/admin/InstitutionManageDialog";
import { appendActivityLog } from "@/lib/activityLog";
import { jobRoleKeyFromInstitutionBranch } from "@/lib/institutionJobRole";
import { suggestedMemberRankForAcceptance } from "@/lib/jobRoleRankLabels";
import {
  JOB_ROLE_LAWS_CONTENT_CHANGED_EVENT,
  loadJobRoleLawSet,
} from "@/lib/jobRoleLawsContent";
import { LAWS_QUIZ_CONTENT_CHANGED_EVENT, loadQuizQuestions } from "@/lib/lawsQuizContent";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { setInstitutionVisible, useSiteVisibility } from "@/lib/siteVisibility";
import {
  setBranchApplicationsClosed,
  setBranchApplicationsNote,
  useApplicationsClosure,
} from "@/lib/applicationsClosure";
import type { ApplicationRecord } from "@/data/publicApplicationTypes";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ROSTER_PLACEHOLDER_IMAGE = "/placeholder.svg";

/** صورة الطاقم عند القبول — null يعني تلقائي (مرفقة من المتقدم أو افتراضي) */
function resolveApplicantRosterImage(
  adminImage: string | null,
  submittedAvatar?: string,
): string {
  if (adminImage === ROSTER_PLACEHOLDER_IMAGE) return ROSTER_PLACEHOLDER_IMAGE;
  if (adminImage?.trim()) return adminImage;
  if (submittedAvatar?.trim()) return submittedAvatar;
  return ROSTER_PLACEHOLDER_IMAGE;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("read"));
    r.readAsDataURL(file);
  });
}

type MemberDraft = ChromaGridItem & { _key: string; hidden?: boolean };

type DraftState = {
  leader: RosterPerson;
  deputy: RosterPerson;
  members: MemberDraft[];
};

function rosterToDraft(r: InstitutionRosterData): DraftState {
  return {
    leader: { ...r.leader, highlights: r.leader.highlights ? [...r.leader.highlights] : undefined },
    deputy: { ...r.deputy, highlights: r.deputy.highlights ? [...r.deputy.highlights] : undefined },
    members: r.members.map((m) => ({ ...m, _key: crypto.randomUUID() })),
  };
}

function draftToRoster(d: DraftState): InstitutionRosterData {
  const lh = d.leader.highlights?.filter(Boolean);
  const dh = d.deputy.highlights?.filter(Boolean);
  return {
    leader: { ...d.leader, highlights: lh?.length ? lh : undefined },
    deputy: { ...d.deputy, highlights: dh?.length ? dh : undefined },
    members: d.members.map(({ _key, ...m }) => m),
  };
}

function SortableMemberRow({
  member,
  onEdit,
  onRemove,
}: {
  member: MemberDraft;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: member._key,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "space-y-2 rounded-xl border border-rose-200 bg-rose-50/70 p-3 text-right text-slate-900 dark:border-rose-700/45 dark:bg-slate-800/95 dark:text-slate-100",
        isDragging && "z-20 opacity-90 shadow-lg dark:shadow-rose-950/40",
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="inline-flex h-10 w-9 shrink-0 cursor-grab touch-manipulation items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white/80 text-slate-600 active:cursor-grabbing dark:border-slate-500 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:bg-slate-900"
          aria-label="سحب"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 shrink-0 text-slate-600 dark:text-slate-300" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <img
              src={member.image}
              alt=""
              className="h-14 w-14 shrink-0 rounded-lg border border-rose-200 object-cover dark:border-rose-600/60"
            />
            <div className="min-w-0 flex-1 text-right">
              <p className="truncate font-display font-semibold text-slate-900 dark:text-slate-50">{member.title}</p>
              <p className="truncate text-xs text-slate-600 dark:text-slate-400">{member.subtitle}</p>
            </div>
            {member.hidden ? (
              <span className="shrink-0 rounded-md bg-slate-200 px-1.5 py-0.5 font-display text-[10px] text-slate-700 dark:bg-slate-600 dark:text-slate-200">
                مخفي
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-rose-200 bg-white text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:border-rose-600 dark:bg-slate-900 dark:text-rose-200 dark:hover:bg-slate-950 dark:hover:text-rose-100"
            onClick={onEdit}
          >
            تعديل
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0 border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800 dark:border-rose-700/60 dark:bg-rose-950/50 dark:text-rose-300 dark:hover:bg-rose-950/70 dark:hover:text-rose-200"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent dir="rtl" className="border-slate-200 bg-white text-slate-900 shadow-xl dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50 sm:rounded-2xl">
              <AlertDialogHeader className="text-right">
                <AlertDialogTitle>تأكيد حذف العضو</AlertDialogTitle>
                <AlertDialogDescription>
                  سيتم حذف هذا العضو من شبكة الطاقم. هل تريد المتابعة؟
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-2 sm:justify-start">
                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                <AlertDialogAction onClick={onRemove}>تأكيد الحذف</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}

function PersonSummaryCard({ label, person, onEdit }: { label: string; person: RosterPerson; onEdit: () => void }) {
  return (
    <div className="space-y-3 rounded-xl border border-rose-200 bg-white/90 p-4 text-right text-slate-900 shadow-[0_14px_30px_-22px_rgba(54,22,79,0.35)] dark:border-slate-600 dark:bg-slate-800/95 dark:text-slate-100 dark:shadow-[0_14px_30px_-22px_rgba(0,0,0,0.4)]">
      <div className="flex items-start justify-between gap-3">
        <div className="text-right">
          <p className="font-display text-sm font-semibold text-rose-700 dark:text-rose-300">{label}</p>
          {person.hidden ? (
            <p className="mt-1 text-[11px] font-display text-slate-500 dark:text-slate-400">مخفي من الموقع</p>
          ) : null}
          <p className="mt-1 text-base font-bold text-slate-900 dark:text-slate-50">{person.name}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400">{person.title}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-rose-200 bg-white text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:border-rose-600 dark:bg-slate-900 dark:text-rose-200 dark:hover:bg-slate-950 dark:hover:text-rose-100"
          onClick={onEdit}
        >
          تعديل
        </Button>
      </div>
      <p className="line-clamp-2 text-sm text-slate-600 dark:text-slate-400">{person.bio}</p>
    </div>
  );
}

const DEFAULT_GRADIENT_START = "#0891b2";
const DEFAULT_GRADIENT_END = "#000000";
const defaultGradient = `linear-gradient(160deg, ${DEFAULT_GRADIENT_START}, ${DEFAULT_GRADIENT_END})`;

function normalizeHexColor(value: string | undefined, fallback: string): string {
  const trimmed = (value ?? "").trim();
  const isHex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed);
  if (!isHex) return fallback;
  if (trimmed.length === 4) {
    const r = trimmed[1];
    const g = trimmed[2];
    const b = trimmed[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return trimmed.toLowerCase();
}

function getGradientStops(gradient: string | undefined): { start: string; end: string } {
  const colors = gradient?.match(/#[0-9a-fA-F]{3,6}/g) ?? [];
  return {
    start: normalizeHexColor(colors[0], DEFAULT_GRADIENT_START),
    end: normalizeHexColor(colors[1], DEFAULT_GRADIENT_END),
  };
}

function buildLinearGradient(start: string, end: string): string {
  const safeStart = normalizeHexColor(start, DEFAULT_GRADIENT_START);
  const safeEnd = normalizeHexColor(end, DEFAULT_GRADIENT_END);
  return `linear-gradient(160deg, ${safeStart}, ${safeEnd})`;
}

function roleKeysForBranch(branchId: InstitutionBranchId): string[] {
  if (branchId === "health") return ["ems"];
  if (branchId === "interior_police") return ["police"];
  if (branchId === "interior_sheriff") return ["interior_sheriff"];
  if (branchId === "interior_cia") return ["interior_cia"];
  if (branchId === "interior_marines") return ["interior_marines"];
  if (branchId === "interior_fpi") return ["interior_fpi"];
  if (branchId === "interior_hub") return [];
  if (branchId === "oversight") return ["oversight"];
  if (branchId === "justice_lawyers") return ["lawyer", "justice"];
  if (branchId === "developer") return ["developer"];
  return [];
}

const InstitutionRosterEditorPage = () => {
  const { branchId: branchParam } = useParams<{ branchId: string }>();
  const navigate = useNavigate();
  const { user, isSuperAdmin } = useAuth();
  const {
    getBranchRoster,
    setBranchRoster,
    resetBranchToDefault,
    assignFromApplication,
    promoteMember,
    vacateLeadershipSlot,
  } = useInstitutionRostersContent();
  const { applications, setDecision } = useApplicationsContent();
  const visibility = useSiteVisibility();
  const closure = useApplicationsClosure();
  const [closureDialogOpen, setClosureDialogOpen] = useState(false);
  const [closureNoteDraft, setClosureNoteDraft] = useState("");

  const rosterBranches = useMemo(
    () => institutionRosterBranchIdsFromRoleList(user?.roles ?? []),
    [user?.roles],
  );

  const canAccess = isSuperAdmin || rosterBranches.length > 0;

  const branchId: InstitutionBranchId | null =
    branchParam && isInstitutionBranchId(branchParam) ? branchParam : null;

  const allowedForBranch = branchId != null && (isSuperAdmin || rosterBranches.includes(branchId));

  const [draft, setDraft] = useState<DraftState | null>(null);
  const [personEditTarget, setPersonEditTarget] = useState<"leader" | "deputy" | null>(null);
  const [memberEditKey, setMemberEditKey] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [applicationsOpen, setApplicationsOpen] = useState(false);
  const [manageLawsOpen, setManageLawsOpen] = useState(false);
  const [lawsQuizContentTick, setLawsQuizContentTick] = useState(0);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [applicantRank, setApplicantRank] = useState("");
  const [applicantImage, setApplicantImage] = useState<string | null>(null);
  /** الاسم النهائي عند التعيين (افتراضياً = cityName من الطلب) */
  const [applicantFinalName, setApplicantFinalName] = useState("");
  /** الدور المختار للتعيين */
  const [applicantAssignRole, setApplicantAssignRole] = useState<RosterMembershipRole>("member");
  /** رسالة الصراع عند محاولة تعيين قائد/نائب مع وجود قائم */
  const [assignConflict, setAssignConflict] = useState<null | "leader" | "deputy">(null);
  const membersSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!branchId) return;
    setDraft(rosterToDraft(getBranchRoster(branchId)));
  }, [branchId, getBranchRoster]);

  useEffect(() => {
    const syncRosterDraft = () => {
      if (!branchId) return;
      setDraft(rosterToDraft(getBranchRoster(branchId)));
    };
    window.addEventListener("ic-institution-rosters-changed", syncRosterDraft);
    return () => window.removeEventListener("ic-institution-rosters-changed", syncRosterDraft);
  }, [branchId, getBranchRoster]);

  useEffect(() => {
    const bump = () => setLawsQuizContentTick((n) => n + 1);
    window.addEventListener(LAWS_QUIZ_CONTENT_CHANGED_EVENT, bump);
    window.addEventListener(JOB_ROLE_LAWS_CONTENT_CHANGED_EVENT, bump as EventListener);
    return () => {
      window.removeEventListener(LAWS_QUIZ_CONTENT_CHANGED_EVENT, bump);
      window.removeEventListener(JOB_ROLE_LAWS_CONTENT_CHANGED_EVENT, bump as EventListener);
    };
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onLeaderImage = useCallback(async (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("الصورة كبيرة جداً (حد أقصى 2 ميجابايت).");
      return;
    }
    try {
      const url = await readFileAsDataUrl(file);
      setDraft((d) => (d ? { ...d, leader: { ...d.leader, image: url } } : d));
      toast.success("تم تحديث صورة القائد");
    } catch {
      toast.error("تعذر قراءة الملف");
    }
  }, []);

  const onDeputyImage = useCallback(async (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("الصورة كبيرة جداً.");
      return;
    }
    try {
      const url = await readFileAsDataUrl(file);
      setDraft((d) => (d ? { ...d, deputy: { ...d.deputy, image: url } } : d));
      toast.success("تم تحديث صورة النائب");
    } catch {
      toast.error("تعذر قراءة الملف");
    }
  }, []);

  const onMemberImage = useCallback(async (key: string, file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("الصورة كبيرة جداً.");
      return;
    }
    try {
      const url = await readFileAsDataUrl(file);
      setDraft((d) =>
        d
          ? {
              ...d,
              members: d.members.map((m) => (m._key === key ? { ...m, image: url } : m)),
            }
          : d,
      );
    } catch {
      toast.error("تعذر قراءة الملف");
    }
  }, []);

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id || !draft) return;
    const oldIndex = draft.members.findIndex((m) => m._key === active.id);
    const newIndex = draft.members.findIndex((m) => m._key === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const members = [...draft.members];
    const [moved] = members.splice(oldIndex, 1);
    members.splice(newIndex, 0, moved);
    setDraft({ ...draft, members });
    toast.success("تم تحديث ترتيب الأعضاء");
  };

  const personToEdit = personEditTarget && draft ? draft[personEditTarget] : null;
  const memberToEdit = memberEditKey && draft ? draft.members.find((m) => m._key === memberEditKey) ?? null : null;
  const filteredMembers = useMemo(() => {
    if (!draft) return [];
    const q = memberSearch.trim().toLowerCase();
    if (!q) return draft.members;
    return draft.members.filter((m) => `${m.title} ${m.subtitle}`.toLowerCase().includes(q));
  }, [draft, memberSearch]);

  const branchApplications = useMemo(() => {
    if (!branchId) return [];
    const keys = new Set(roleKeysForBranch(branchId));
    return applications
      .filter((a) => keys.has(a.roleKey))
      .sort((a, b) => +new Date(b.submittedAt) - +new Date(a.submittedAt));
  }, [applications, branchId]);
  const pendingApplicationsCount = branchApplications.filter((a) => a.status === "pending").length;
  const selectedApplication: ApplicationRecord | null = selectedApplicationId
    ? branchApplications.find((a) => a.id === selectedApplicationId) ?? null
    : null;

  /** تعبئة الحقول الافتراضية للقبول عند اختيار طلب */
  useEffect(() => {
    if (!selectedApplication) {
      setApplicantFinalName("");
      setApplicantImage(null);
      setApplicantRank("");
      setApplicantAssignRole("member");
      setAssignConflict(null);
      return;
    }
    const s = selectedApplication.snapshot;
    const cityName =
      s.cityName?.trim() ||
      `${s.firstName} ${s.lastName}`.trim() ||
      selectedApplication.applicantDisplayName ||
      "";
    setApplicantFinalName(cityName);
    setApplicantImage(s.avatarDataUrl ?? null);
    setApplicantAssignRole("member");
    const roleKey = branchId ? jobRoleKeyFromInstitutionBranch(branchId) : null;
    setApplicantRank(roleKey ? suggestedMemberRankForAcceptance(roleKey, "member") : "");
    setAssignConflict(null);
  }, [selectedApplication?.id, branchId]);

  useEffect(() => {
    if (!selectedApplication || !branchId) return;
    const roleKey = jobRoleKeyFromInstitutionBranch(branchId);
    if (!roleKey) return;
    setApplicantRank(suggestedMemberRankForAcceptance(roleKey, applicantAssignRole));
  }, [applicantAssignRole, branchId, selectedApplication?.id]);

  /** تخفيض القائد/النائب الحالي إلى عضو لإفراغ المكان */
  const demoteCurrentLeaderOrDeputy = (slot: "leader" | "deputy") => {
    if (!branchId) return;
    const current = getBranchRoster(branchId);
    const slotPerson = current[slot];
    const slotEmpty = !slotPerson.userId && (!slotPerson.name || slotPerson.name.trim().length <= 1);
    if (slotEmpty) {
      setAssignConflict(null);
      return;
    }
    const result = vacateLeadershipSlot(
      branchId,
      slot,
      slotPerson.title || (slot === "leader" ? "قائد سابق" : "نائب سابق"),
    );
    if (result === "ok") {
      toast.success(slot === "leader" ? "تم تخفيض القائد الحالي إلى عضو" : "تم تخفيض النائب الحالي إلى عضو");
      setAssignConflict(null);
      setDraft(rosterToDraft(getBranchRoster(branchId)));
    } else {
      toast.error("تعذر تخفيض الشخص الحالي. تحقق من البيانات.");
    }
  };

  const promoteDraftMemberToRole = (memberKey: string, role: "leader" | "deputy") => {
    if (!branchId || !draft) return;
    const idx = getBranchRoster(branchId).members.findIndex((m) => {
      const draftMember = draft.members.find((d) => d._key === memberKey);
      if (!draftMember) return false;
      if (draftMember.userId) return m.userId === draftMember.userId;
      return m.title === draftMember.title && m.image === draftMember.image;
    });
    if (idx < 0) {
      toast.error("تعذر العثور على العضو في الطاقم المحفوظ — احفظ التعديلات ثم أعد المحاولة");
      return;
    }
    const member = getBranchRoster(branchId).members[idx];
    const result = promoteMember(
      branchId,
      { memberIndex: idx },
      role,
      member.rankLabel || member.subtitle,
    );
    if (result === "ok") {
      setDraft(rosterToDraft(getBranchRoster(branchId)));
      setMemberEditKey(null);
      toast.success(role === "leader" ? "تم تعيين قائد جديد (القائد السابق أُضيف للأعضاء)" : "تم تعيين نائب جديد");
    } else {
      toast.error("تعذر تعيين المنصب");
    }
  };

  const runApplicationDecision = (status: "approved" | "rejected") => {
    if (!selectedApplication || selectedApplication.status !== "pending") return;
    const actor = user?.username ?? "manager";

    if (status === "approved" && branchId) {
      const finalName = applicantFinalName.trim();
      if (finalName.length < 2) {
        toast.error("اكتب الاسم الذي سيظهر في الطاقم");
        return;
      }
      const jobRoleKey = jobRoleKeyFromInstitutionBranch(branchId);
      const baseRank =
        applicantRank.trim() ||
        (jobRoleKey
          ? suggestedMemberRankForAcceptance(jobRoleKey, applicantAssignRole)
          : applicantAssignRole === "leader"
            ? "قائد المؤسسة"
            : applicantAssignRole === "deputy"
              ? "نائب القائد"
              : "عضو");
      const finalImage = resolveApplicantRosterImage(
        applicantImage,
        selectedApplication.snapshot.avatarDataUrl,
      );

      const assignRes = assignFromApplication({
        branchId,
        role: applicantAssignRole,
        name: finalName,
        rankLabel: baseRank,
        image: finalImage,
        bio: selectedApplication.snapshot.bio || selectedApplication.snapshot.experience || "",
        userId: selectedApplication.applicantUserId,
        discordId: selectedApplication.snapshot.discordId,
      });

      if (assignRes === "not_found") {
        toast.error("تعذر العثور على طاقم هذه المؤسسة");
        return;
      }
      if (assignRes === "leader_conflict") {
        setAssignConflict("leader");
        toast.error("يوجد قائد حالياً — غيّر رتبة القائد القديم أولاً");
        return;
      }
      if (assignRes === "deputy_conflict") {
        setAssignConflict("deputy");
        toast.error("يوجد نائب حالياً — غيّر رتبة النائب القديم أولاً");
        return;
      }
      if (assignRes !== "ok") {
        toast.error("تعذر تعيين المتقدم في الطاقم");
        return;
      }

      setDecision(selectedApplication.id, status, actor, decisionNote);
      setDraft(rosterToDraft(getBranchRoster(branchId)));
      setApplicationsOpen(false);
      setSelectedApplicationId(null);
      requestAnimationFrame(() => {
        membersSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } else {
      setDecision(selectedApplication.id, status, actor, decisionNote);
    }

    appendActivityLog(
      actor,
      status === "approved"
        ? `قرار توظيف: قبول (${
            applicantAssignRole === "leader"
              ? "قائد"
              : applicantAssignRole === "deputy"
                ? "نائب"
                : "عضو"
          })`
        : "قرار توظيف: رفض",
      `${selectedApplication.targetTitle} — ${
        selectedApplication.snapshot.cityName || selectedApplication.snapshot.firstName
      }`,
    );
    toast.success(
      status === "approved"
        ? applicantAssignRole === "member"
          ? "تم قبول الطلب — ظهر المتقدم في قائمة الأعضاء أسفل الطاقم"
          : applicantAssignRole === "leader"
            ? "تم قبول الطلب — تم تعيينه قائداً للمؤسسة"
            : "تم قبول الطلب — تم تعيينه نائباً للقائد"
        : "تم رفض الطلب",
    );
    setDecisionNote("");
    setApplicantRank("");
    setApplicantImage(null);
    setApplicantFinalName("");
    setApplicantAssignRole("member");
    setAssignConflict(null);
  };

  const save = () => {
    if (!draft || !branchId) return;
    if (!isSuperAdmin && !rosterBranches.includes(branchId)) {
      toast.error("لا تملك صلاحية تعديل هذا الفرع.");
      return;
    }
    const l = draft.leader.name.trim();
    const dep = draft.deputy.name.trim();
    if (!l || !dep) {
      toast.error("اسم القائد واسم النائب مطلوبان");
      return;
    }
    const roster = draftToRoster(draft);
    setBranchRoster(branchId, roster);
    appendActivityLog(
      user?.username ?? "—",
      "حفظ طاقم مؤسسة",
      INSTITUTION_BRANCH_META[branchId].labelAr,
    );
    toast.success("تم حفظ الطاقم");
  };

  const jobRoleKey = branchId ? jobRoleKeyFromInstitutionBranch(branchId) : null;
  const { lawsRulesCount, quizQuestionsCount } = useMemo(() => {
    void lawsQuizContentTick;
    if (!jobRoleKey) return { lawsRulesCount: 0, quizQuestionsCount: 0 };
    return {
      lawsRulesCount: loadJobRoleLawSet(jobRoleKey).rules.length,
      quizQuestionsCount: loadQuizQuestions(jobRoleKey).length,
    };
  }, [jobRoleKey, lawsQuizContentTick]);

  if (!canAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!branchId) {
    return <Navigate to="/dashboard/institution" replace />;
  }

  if (!allowedForBranch) {
    return <Navigate to="/dashboard/institution" replace />;
  }

  const previewPath = INSTITUTION_BRANCH_META[branchId].previewPath;

  if (!draft) return null;

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12 text-right">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center justify-end gap-2 font-display text-2xl font-bold text-slate-900 dark:text-slate-50">
            <Building2 className="h-7 w-7 text-rose-700 dark:text-rose-400" />
            محرر الطاقم — {INSTITUTION_BRANCH_META[branchId].labelAr}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-slate-600 dark:text-slate-400">
            إدارة قائد المؤسسة والنائب والأعضاء وطلبات التوظيف.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="relative border-rose-200 bg-white text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:border-rose-600 dark:bg-slate-900 dark:text-rose-200 dark:hover:bg-slate-950 dark:hover:text-rose-100"
            onClick={() => setApplicationsOpen(true)}
          >
            طلبات التوظيف
            {pendingApplicationsCount > 0 ? (
              <span className="absolute -left-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] text-white">
                {pendingApplicationsCount}
              </span>
            ) : null}
          </Button>
          {isSuperAdmin ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-rose-200 bg-white text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:border-rose-600 dark:bg-slate-900 dark:text-rose-200 dark:hover:bg-slate-950 dark:hover:text-rose-100"
              onClick={() => setInstitutionVisible(branchId, !visibility.institutions[branchId])}
            >
              {visibility.institutions[branchId] ? "إخفاء المؤسسة من الموقع" : "إظهار المؤسسة بالموقع"}
            </Button>
          ) : null}
          {closure.closed[branchId] ? (
            <Button
              type="button"
              size="sm"
              className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
              onClick={() => {
                setBranchApplicationsClosed(branchId, false);
                appendActivityLog(
                  user?.username ?? "—",
                  "فتح التقديم على المؤسسة",
                  INSTITUTION_BRANCH_META[branchId].labelAr,
                );
                toast.success("تم فتح التقديم — يمكن للزوار التقديم الآن");
              }}
            >
              <Unlock className="h-4 w-4" />
              فتح التقديم
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5 border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-950/60 dark:hover:text-rose-200"
              onClick={() => {
                setClosureNoteDraft(closure.notes[branchId] ?? "");
                setClosureDialogOpen(true);
              }}
            >
              <Lock className="h-4 w-4" />
              إغلاق التقديم
            </Button>
          )}
          <Button type="button" size="sm" className="bg-[#36164f] text-white hover:bg-[#2f1344]" onClick={save}>
            حفظ الطاقم
          </Button>
          <Button type="button" variant="outline" size="sm" className="border-rose-200 bg-white text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:border-rose-600 dark:bg-slate-900 dark:text-rose-200 dark:hover:bg-slate-950 dark:hover:text-rose-100" asChild>
            <a href={previewPath} target="_blank" rel="noreferrer">
              معاينة الفرع
            </a>
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-gradient-to-l from-rose-50/80 via-white to-red-50/30 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-rose-700/45 dark:bg-gradient-to-l dark:from-slate-800/95 dark:via-slate-900/90 dark:to-rose-950/35">
        <div className="space-y-1 text-right">
          <p className="font-display text-sm font-semibold text-slate-900 dark:text-slate-50">تقديم الوظيفة — قوانين واختبار</p>
          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            ما يقرأه المتقدم ويجيب عليه قبل إرسال طلب التوظيف لهذه المؤسسة.
          </p>
          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-medium text-rose-800 dark:bg-rose-950/60 dark:text-rose-200">
              <BookOpen className="h-3 w-3" />
              {lawsRulesCount} بند قانون
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-medium text-red-800 dark:bg-red-950/50 dark:text-red-200">
              <ShieldQuestion className="h-3 w-3" />
              {quizQuestionsCount} سؤال
            </span>
          </div>
        </div>
        <Button
          type="button"
          className="shrink-0 gap-2 bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-500"
          onClick={() => setManageLawsOpen(true)}
        >
          <Settings2 className="h-4 w-4" />
          فتح إدارة القوانين والأسئلة
        </Button>
      </div>

      {isSuperAdmin ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-end">
          <div className="max-w-md w-full space-y-2 sm:ms-auto">
            <Label>تبديل الفرع</Label>
            <Select value={branchId} onValueChange={(v) => navigate(`/dashboard/institution/${v}`)}>
              <SelectTrigger className="border-rose-200 bg-white text-slate-900 dark:border-slate-600 dark:bg-slate-900/80 dark:text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent dir="rtl">
                {INSTITUTION_BRANCH_IDS.map((id) => (
                  <SelectItem key={id} value={id}>
                    {INSTITUTION_BRANCH_META[id].labelAr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" variant="outline" size="sm" className="shrink-0 border-rose-200 bg-white text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:border-rose-600 dark:bg-slate-900 dark:text-rose-200 dark:hover:bg-slate-950 dark:hover:text-rose-100" asChild>
            <Link to="/dashboard/institution">كل الفروع</Link>
          </Button>
        </div>
      ) : rosterBranches.length > 1 ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50/70 px-4 py-3 text-sm text-slate-700 dark:border-rose-700/45 dark:bg-rose-950/25 dark:text-slate-300">
          الفرع الحالي: <strong>{INSTITUTION_BRANCH_META[branchId].labelAr}</strong>
          {" — "}
          للأفرع الأخرى استخدم{" "}
            <Link to="/dashboard/institution" className="font-semibold text-rose-700 underline-offset-4 hover:underline dark:text-rose-300">
            صفحة المؤسسات
          </Link>{" "}
          أو القائمة الجانبية.
        </p>
      ) : (
        <p className="rounded-lg border border-rose-200 bg-rose-50/70 px-4 py-3 text-sm text-slate-700 dark:border-rose-700/45 dark:bg-rose-950/25 dark:text-slate-300">
          أنت تدير: <strong>{INSTITUTION_BRANCH_META[branchId].labelAr}</strong>
        </p>
      )}

      {closure.closed[branchId] ? (
        <div className="rounded-2xl border border-rose-200/80 bg-gradient-to-l from-rose-50 via-rose-50/60 to-white px-4 py-3 text-right shadow-[0_8px_24px_-16px_rgba(244,63,94,0.45)] dark:border-rose-800/50 dark:bg-gradient-to-l dark:from-rose-950/50 dark:via-slate-900/90 dark:to-slate-900 dark:shadow-[0_8px_24px_-16px_rgba(0,0,0,0.5)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300">
                <Lock className="h-4 w-4" />
              </span>
              <div>
                <p className="font-display text-sm font-semibold dark:text-rose-100">التقديم مغلق حالياً لهذه المؤسسة</p>
                {closure.notes[branchId] ? (
                  <p className="mt-0.5 text-xs leading-relaxed text-rose-700/90 dark:text-rose-300/90">
                    {closure.notes[branchId]}
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs text-rose-700/80 dark:text-rose-400">
                    لن يستطيع الزوار إرسال طلبات جديدة حتى يُعاد فتح التقديم.
                  </p>
                )}
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-rose-300 bg-white text-rose-700 hover:bg-rose-50 dark:border-rose-700/60 dark:bg-slate-800 dark:text-rose-300 dark:hover:bg-rose-950/50"
              onClick={() => {
                setClosureNoteDraft(closure.notes[branchId] ?? "");
                setClosureDialogOpen(true);
              }}
            >
              تعديل الملاحظة
            </Button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <PersonSummaryCard
          label="القائد"
          person={draft.leader}
          onEdit={() => setPersonEditTarget("leader")}
        />
        <PersonSummaryCard
          label="النائب"
          person={draft.deputy}
          onEdit={() => setPersonEditTarget("deputy")}
        />
      </div>

      <div ref={membersSectionRef} className="space-y-3 scroll-mt-24">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-display text-sm font-semibold text-rose-700 dark:text-rose-300">أعضاء الشبكة (Chroma)</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-rose-200 bg-white text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:border-rose-600 dark:bg-slate-900 dark:text-rose-200 dark:hover:bg-slate-950 dark:hover:text-rose-100"
            onClick={() =>
              setDraft((d) =>
                d
                  ? {
                      ...d,
                      members: [
                        ...d.members,
                        {
                          _key: crypto.randomUUID(),
                          image: "/placeholder.svg",
                          title: "اسم العضو",
                          subtitle: "المنصب",
                          borderColor: "#22D3EE",
                          gradient: defaultGradient,
                          hidden: false,
                        },
                      ],
                    }
                  : d,
              )
            }
          >
            <Plus className="ms-1 h-4 w-4" /> إضافة عضو
          </Button>
        </div>
        <div className="max-w-sm">
          <Input
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            placeholder="ابحث بالاسم أو المنصب..."
            className="border-rose-200 bg-white text-slate-900 placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-900/80 dark:text-slate-100 dark:placeholder:text-slate-500"
            autoComplete="off"
          />
        </div>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={filteredMembers.map((m) => m._key)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {filteredMembers.map((m) => (
                <SortableMemberRow
                  key={m._key}
                  member={m}
                  onEdit={() => setMemberEditKey(m._key)}
                  onRemove={() =>
                    setDraft((d) =>
                      d ? { ...d, members: d.members.filter((x) => x._key !== m._key) } : d,
                    )
                  }
                />
              ))}
              {filteredMembers.length === 0 ? (
                <p className="rounded-lg border border-rose-200 bg-white px-4 py-3 text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  لا يوجد أعضاء مطابقون للبحث.
                </p>
              ) : null}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <Dialog open={!!personEditTarget} onOpenChange={(open) => !open && setPersonEditTarget(null)}>
        <DialogContent dir="rtl" className="w-[calc(100%-1rem)] max-w-2xl border-slate-200/95 bg-white shadow-[0_28px_72px_-24px_rgba(15,23,42,0.38)] sm:rounded-2xl text-slate-900">
          <DialogHeader className="text-right">
            <DialogTitle className="text-slate-900">{personEditTarget === "leader" ? "تعديل القائد" : "تعديل النائب"}</DialogTitle>
          </DialogHeader>
          {personToEdit ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs text-slate-700">الاسم</Label>
                  <Input className="mt-1 border-rose-200 bg-white text-slate-900" value={personToEdit.name} onChange={(e) => setDraft((d) => d ? { ...d, [personEditTarget as "leader" | "deputy"]: { ...d[personEditTarget as "leader" | "deputy"], name: e.target.value } } : d)} />
                </div>
                <div>
                  <Label className="text-xs text-slate-700">المنصب</Label>
                  <Input className="mt-1 border-rose-200 bg-white text-slate-900" value={personToEdit.title} onChange={(e) => setDraft((d) => d ? { ...d, [personEditTarget as "leader" | "deputy"]: { ...d[personEditTarget as "leader" | "deputy"], title: e.target.value } } : d)} />
                </div>
              </div>
              <div>
                <Label className="text-xs text-slate-700">سطر تعريفي</Label>
                <Input className="mt-1 border-rose-200 bg-white text-slate-900" value={personToEdit.tagline ?? ""} onChange={(e) => setDraft((d) => d ? { ...d, [personEditTarget as "leader" | "deputy"]: { ...d[personEditTarget as "leader" | "deputy"], tagline: e.target.value || undefined } } : d)} />
              </div>
              <div>
                <Label className="text-xs text-slate-700">نبذة</Label>
                <Textarea className="mt-1 min-h-[90px] border-rose-200 bg-white text-slate-900" value={personToEdit.bio} onChange={(e) => setDraft((d) => d ? { ...d, [personEditTarget as "leader" | "deputy"]: { ...d[personEditTarget as "leader" | "deputy"], bio: e.target.value } } : d)} />
              </div>
              <div>
                <Label className="text-xs text-slate-700">نقاط المسؤوليات (سطر لكل نقطة)</Label>
                <Textarea
                  className="mt-1 min-h-[90px] border-rose-200 bg-white text-slate-900"
                  value={(personToEdit.highlights ?? []).join("\n")}
                  onChange={(e) => {
                    const lines = e.target.value.split("\n").map((l) => l.trim()).filter(Boolean);
                    setDraft((d) =>
                      d
                        ? {
                            ...d,
                            [personEditTarget as "leader" | "deputy"]: {
                              ...d[personEditTarget as "leader" | "deputy"],
                              highlights: lines.length ? lines : undefined,
                            },
                          }
                        : d,
                    );
                  }}
                />
              </div>
              <div>
                <Label className="text-xs text-slate-700">الصورة</Label>
                <div className="mt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-rose-200 bg-white text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                    onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = "image/*";
                      input.onchange = () => {
                        const file = input.files?.[0] ?? null;
                        if (personEditTarget === "leader") onLeaderImage(file);
                        else onDeputyImage(file);
                      };
                      input.click();
                    }}
                  >
                    <ImagePlus className="ms-1 h-3 w-3" /> رفع صورة
                  </Button>
                </div>
              </div>
              <div className="rounded-lg border border-rose-200 bg-white/70 p-3">
                <p className="text-xs text-slate-600">
                  الظهور في الموقع:{" "}
                  <span className="font-display text-slate-900">{personToEdit.hidden ? "مخفي" : "ظاهر"}</span>
                </p>
              </div>
            </div>
          ) : null}
          <DialogFooter className="flex flex-wrap gap-2 sm:justify-start">
            {personEditTarget ? (
              <Button
                type="button"
                variant="outline"
                className="border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                onClick={() => {
                  demoteCurrentLeaderOrDeputy(personEditTarget);
                  setPersonEditTarget(null);
                }}
              >
                نقل {personEditTarget === "leader" ? "القائد" : "النائب"} إلى الأعضاء
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="border-rose-200 bg-white text-rose-700 hover:bg-rose-50 hover:text-rose-800"
              onClick={() =>
                setDraft((d) =>
                  d && personEditTarget
                    ? {
                        ...d,
                        [personEditTarget]: {
                          ...d[personEditTarget],
                          hidden: !d[personEditTarget].hidden,
                        },
                      }
                    : d,
                )
              }
            >
              {personToEdit?.hidden ? "إظهار بالموقع" : "إخفاء من الموقع"}
            </Button>
            <Button type="button" variant="outline" className="border-rose-200 bg-white text-rose-700 hover:bg-rose-50 hover:text-rose-800" onClick={() => setPersonEditTarget(null)}>
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!memberEditKey} onOpenChange={(open) => !open && setMemberEditKey(null)}>
        <DialogContent dir="rtl" className="w-[calc(100%-1rem)] max-w-2xl border-slate-200/95 bg-white shadow-[0_28px_72px_-24px_rgba(15,23,42,0.38)] sm:rounded-2xl text-slate-900">
          <DialogHeader className="text-right">
            <DialogTitle className="text-slate-900">تعديل العضو</DialogTitle>
          </DialogHeader>
          {memberToEdit ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs text-slate-700">الاسم</Label>
                  <Input className="mt-1 border-rose-200 bg-white text-slate-900" value={memberToEdit.title} onChange={(e) => setDraft((d) => d ? { ...d, members: d.members.map((x) => (x._key === memberToEdit._key ? { ...x, title: e.target.value } : x)) } : d)} />
                </div>
                <div>
                  <Label className="text-xs text-slate-700">المنصب</Label>
                  <Input className="mt-1 border-rose-200 bg-white text-slate-900" value={memberToEdit.subtitle} onChange={(e) => setDraft((d) => d ? { ...d, members: d.members.map((x) => (x._key === memberToEdit._key ? { ...x, subtitle: e.target.value } : x)) } : d)} />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs text-slate-700">لون الإطار</Label>
                  <Input
                    type="color"
                    className="mt-1 h-10 border-rose-200 bg-white p-1 text-slate-900"
                    value={normalizeHexColor(memberToEdit.borderColor, "#22d3ee")}
                    onChange={(e) =>
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              members: d.members.map((x) =>
                                x._key === memberToEdit._key ? { ...x, borderColor: e.target.value } : x,
                              ),
                            }
                          : d,
                      )
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-700">التدرج</Label>
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    <Input
                      type="color"
                      className="h-10 border-rose-200 bg-white p-1 text-slate-900"
                      value={getGradientStops(memberToEdit.gradient).start}
                      onChange={(e) => {
                        const stops = getGradientStops(memberToEdit.gradient);
                        const next = buildLinearGradient(e.target.value, stops.end);
                        setDraft((d) =>
                          d
                            ? {
                                ...d,
                                members: d.members.map((x) =>
                                  x._key === memberToEdit._key ? { ...x, gradient: next } : x,
                                ),
                              }
                            : d,
                        );
                      }}
                    />
                    <Input
                      type="color"
                      className="h-10 border-rose-200 bg-white p-1 text-slate-900"
                      value={getGradientStops(memberToEdit.gradient).end}
                      onChange={(e) => {
                        const stops = getGradientStops(memberToEdit.gradient);
                        const next = buildLinearGradient(stops.start, e.target.value);
                        setDraft((d) =>
                          d
                            ? {
                                ...d,
                                members: d.members.map((x) =>
                                  x._key === memberToEdit._key ? { ...x, gradient: next } : x,
                                ),
                              }
                            : d,
                        );
                      }}
                    />
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-xs text-slate-700">الصورة</Label>
                <div className="mt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-rose-200 bg-white text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                    onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = "image/*";
                      input.onchange = () => onMemberImage(memberToEdit._key, input.files?.[0] ?? null);
                      input.click();
                    }}
                  >
                    <ImagePlus className="ms-1 h-3 w-3" /> رفع صورة
                  </Button>
                </div>
              </div>
              <div className="rounded-lg border border-rose-200 bg-white/70 p-3">
                <p className="text-xs text-slate-600">
                  الظهور في الموقع:{" "}
                  <span className="font-display text-slate-900">{memberToEdit.hidden ? "مخفي" : "ظاهر"}</span>
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 border-rose-200 bg-white text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                  onClick={() =>
                    setDraft((d) =>
                      d
                        ? {
                            ...d,
                            members: d.members.map((x) =>
                              x._key === memberToEdit._key ? { ...x, hidden: !x.hidden } : x,
                            ),
                          }
                        : d,
                    )
                  }
                >
                  {memberToEdit.hidden ? "إظهار بالموقع" : "إخفاء من الموقع"}
                </Button>
              </div>
            </div>
          ) : null}
          <DialogFooter className="flex flex-wrap gap-2 sm:justify-start">
            {memberToEdit ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                  onClick={() => promoteDraftMemberToRole(memberToEdit._key, "leader")}
                >
                  تعيين كقائد
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-indigo-300 bg-indigo-50 text-indigo-800 hover:bg-indigo-100"
                  onClick={() => promoteDraftMemberToRole(memberToEdit._key, "deputy")}
                >
                  تعيين كنائب
                </Button>
              </>
            ) : null}
            <Button type="button" variant="outline" className="border-rose-200 bg-white text-rose-700 hover:bg-rose-50 hover:text-rose-800" onClick={() => setMemberEditKey(null)}>
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={applicationsOpen}
        onOpenChange={(open) => {
          setApplicationsOpen(open);
          if (!open) {
            setSelectedApplicationId(null);
            setDecisionNote("");
          }
        }}
      >
        <DialogContent dir="rtl" className="max-w-4xl border-slate-200/95 bg-white shadow-[0_28px_72px_-24px_rgba(15,23,42,0.38)] sm:rounded-2xl text-slate-900">
          <DialogHeader className="text-right">
            <DialogTitle className="text-slate-900">طلبات التوظيف — {INSTITUTION_BRANCH_META[branchId].labelAr}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-[320px,1fr]">
            <div className="max-h-[65vh] space-y-2 overflow-y-auto rounded-xl border border-rose-200 bg-white p-2">
              {branchApplications.length === 0 ? (
                <p className="p-3 text-sm text-slate-500">لا توجد طلبات حالياً.</p>
              ) : (
                branchApplications.map((app) => (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => setSelectedApplicationId(app.id)}
                    className={cn(
                      "w-full rounded-lg border px-3 py-2 text-right",
                      selectedApplicationId === app.id ? "border-rose-400 bg-rose-50" : "border-rose-100 bg-white hover:bg-rose-50/40",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[10px]",
                          app.status === "pending"
                            ? "border-amber-300 bg-amber-50 text-amber-700"
                            : app.status === "approved"
                              ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                              : "border-rose-300 bg-rose-50 text-rose-700",
                        )}
                      >
                        {app.status === "pending" ? "قيد المراجعة" : app.status === "approved" ? "مقبول" : "مرفوض"}
                      </span>
                      <p className="truncate text-xs text-slate-500">{new Date(app.submittedAt).toLocaleString("ar")}</p>
                    </div>
                    <p className="mt-1 truncate font-display text-sm text-slate-900">
                      {app.snapshot.firstName} {app.snapshot.lastName}
                    </p>
                  </button>
                ))
              )}
            </div>
            <div className="max-h-[65vh] overflow-y-auto rounded-xl border border-rose-200 bg-white p-4">
              {selectedApplication ? (
                <ApplicationReviewBody
                  application={selectedApplication}
                  applicantFinalName={applicantFinalName}
                  setApplicantFinalName={setApplicantFinalName}
                  applicantRank={applicantRank}
                  setApplicantRank={setApplicantRank}
                  applicantImage={applicantImage}
                  setApplicantImage={setApplicantImage}
                  applicantAssignRole={applicantAssignRole}
                  setApplicantAssignRole={(r) => {
                    setApplicantAssignRole(r);
                    setAssignConflict(null);
                  }}
                  assignConflict={assignConflict}
                  decisionNote={decisionNote}
                  setDecisionNote={setDecisionNote}
                  onApprove={() => runApplicationDecision("approved")}
                  onReject={() => runApplicationDecision("rejected")}
                  onDemoteCurrent={(slot) => demoteCurrentLeaderOrDeputy(slot)}
                  currentLeaderName={branchId ? getBranchRoster(branchId).leader.name : ""}
                  currentDeputyName={branchId ? getBranchRoster(branchId).deputy.name : ""}
                />
              ) : (
                <p className="text-sm text-slate-500">اختر طلباً من القائمة لعرض التفاصيل.</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={closureDialogOpen}
        onOpenChange={(open) => {
          setClosureDialogOpen(open);
          if (!open) setClosureNoteDraft("");
        }}
      >
        <DialogContent dir="rtl" className="max-w-md border-rose-200 bg-white text-slate-900 dark:border-rose-900/60 dark:bg-slate-900 dark:text-slate-50">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center justify-end gap-2 font-display text-lg text-rose-700 dark:text-rose-400">
              <Lock className="h-5 w-5" />
              إغلاق التقديم — {INSTITUTION_BRANCH_META[branchId].labelAr}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-right">
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              عند الإغلاق، سيتعذّر على الزوار إرسال طلبات جديدة لهذه المؤسسة، وستظهر رسالة "التقديم
              مغلق حالياً" على صفحة التقديم وصفحة المعاينة.
            </p>
            <div className="space-y-2">
              <Label htmlFor="closure-note" className="text-sm text-slate-800 dark:text-slate-200">
                ملاحظة اختيارية تُعرض للمتقدمين
              </Label>
              <Textarea
                id="closure-note"
                value={closureNoteDraft}
                onChange={(e) => setClosureNoteDraft(e.target.value)}
                placeholder="مثلاً: سيُعاد فتح التقديم نهاية الشهر، أو لا توجد شواغر حالياً..."
                className="min-h-[110px] resize-none rounded-xl border-rose-200 bg-rose-50/30 text-sm text-slate-900 dark:border-rose-800/60 dark:bg-slate-800/80 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              onClick={() => {
                setClosureDialogOpen(false);
                setClosureNoteDraft("");
              }}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              className="gap-1.5 bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-500"
              onClick={() => {
                setBranchApplicationsClosed(branchId, true);
                setBranchApplicationsNote(branchId, closureNoteDraft);
                appendActivityLog(
                  user?.username ?? "—",
                  "إغلاق التقديم على المؤسسة",
                  `${INSTITUTION_BRANCH_META[branchId].labelAr}${
                    closureNoteDraft.trim() ? ` — ${closureNoteDraft.trim()}` : ""
                  }`,
                );
                toast.success("تم إغلاق التقديم — لن يتمكن الزوار من إرسال طلبات جديدة");
                setClosureDialogOpen(false);
                setClosureNoteDraft("");
              }}
            >
              <Lock className="h-4 w-4" />
              تأكيد الإغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InstitutionManageDialog
        branchId={branchId}
        open={manageLawsOpen}
        onOpenChange={setManageLawsOpen}
      />
    </div>
  );
};

export default InstitutionRosterEditorPage;

/* -------------------------------------------------------------- */
/*  ApplicationReviewBody — جسم تفاصيل الطلب مع نموذج التعيين      */
/* -------------------------------------------------------------- */

function ApplicationReviewBody({
  application,
  applicantFinalName,
  setApplicantFinalName,
  applicantRank,
  setApplicantRank,
  applicantImage,
  setApplicantImage,
  applicantAssignRole,
  setApplicantAssignRole,
  assignConflict,
  decisionNote,
  setDecisionNote,
  onApprove,
  onReject,
  onDemoteCurrent,
  currentLeaderName,
  currentDeputyName,
}: {
  application: ApplicationRecord;
  applicantFinalName: string;
  setApplicantFinalName: (v: string) => void;
  applicantRank: string;
  setApplicantRank: (v: string) => void;
  applicantImage: string | null;
  setApplicantImage: (v: string | null) => void;
  applicantAssignRole: RosterMembershipRole;
  setApplicantAssignRole: (r: RosterMembershipRole) => void;
  assignConflict: null | "leader" | "deputy";
  decisionNote: string;
  setDecisionNote: (v: string) => void;
  onApprove: () => void;
  onReject: () => void;
  onDemoteCurrent: (slot: "leader" | "deputy") => void;
  currentLeaderName: string;
  currentDeputyName: string;
}) {
  const s = application.snapshot;
  const submittedAvatar = s.avatarDataUrl;
  const cityName = s.cityName?.trim() || `${s.firstName} ${s.lastName}`.trim();
  const bioText = (s.bio?.trim() || s.experience?.trim() || "").trim();

  const onPickImage = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0] ?? null;
      if (!file || !file.type.startsWith("image/")) return;
      if (file.size > MAX_IMAGE_BYTES) {
        toast.error("الصورة كبيرة جداً (حد أقصى 2 ميجابايت).");
        return;
      }
      try {
        const url = await readFileAsDataUrl(file);
        setApplicantImage(url);
        toast.success("تم تحديث صورة العضو");
      } catch {
        toast.error("تعذر قراءة الملف");
      }
    };
    input.click();
  };

  const isPending = application.status === "pending";

  return (
    <div className="space-y-4 text-right">
      {/* رأس الطلب */}
      <div className="flex flex-wrap items-start gap-4 rounded-2xl border border-rose-200 bg-gradient-to-l from-rose-50/60 via-white to-white p-4">
        <img
          src={submittedAvatar || ROSTER_PLACEHOLDER_IMAGE}
          alt={cityName || "applicant"}
          className="h-20 w-20 shrink-0 rounded-2xl border border-rose-200 object-cover shadow-sm"
        />
        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="font-display text-base font-bold text-slate-900">
            {cityName || "—"}
          </h3>
          <p className="text-xs text-rose-700">{application.targetTitle}</p>
          <div className="grid gap-1 pt-1 text-[12px] text-slate-600 sm:grid-cols-2">
            <p className="truncate" dir="ltr">
              <span className="text-slate-400">Discord:</span> {s.discord || "—"}
            </p>
            {s.discordId ? (
              <p className="truncate font-mono" dir="ltr">
                <span className="text-slate-400">ID:</span> {s.discordId}
              </p>
            ) : null}
            <p className="truncate">
              <span className="text-slate-400">قُدِّم في:</span>{" "}
              <span dir="ltr">{new Date(application.submittedAt).toLocaleString("ar")}</span>
            </p>
            <p className="truncate">
              <span className="text-slate-400">الحالة:</span>{" "}
              {application.status === "pending"
                ? "قيد المراجعة"
                : application.status === "approved"
                  ? "مقبول"
                  : "مرفوض"}
            </p>
          </div>
        </div>
      </div>

      {/* النبذة */}
      {bioText ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50/30 p-3">
          <p className="text-[11px] font-display text-rose-700">نبذة المتقدم</p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
            {bioText}
          </p>
        </div>
      ) : null}

      {!isPending ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50/30 p-3 text-sm text-slate-700">
          <p>القرار بواسطة: {application.decidedBy ?? "—"}</p>
          {application.note ? <p className="mt-1">ملاحظة: {application.note}</p> : null}
        </div>
      ) : (
        <>
          <div className="space-y-3 rounded-2xl border border-emerald-200 bg-gradient-to-l from-emerald-50/40 to-white p-4">
            <h4 className="font-display text-sm font-semibold text-emerald-800">
              تعيين في الطاقم عند القبول
            </h4>
            <p className="text-[11px] leading-relaxed text-emerald-800/90">
              الافتراضي: يُضاف كعضو في قائمة «أعضاء الشبكة» أسفل القائد والنائب. يمكنك اختيار قائد أو نائب إن لزم.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-700">الاسم في الطاقم</Label>
                <Input
                  value={applicantFinalName}
                  onChange={(e) => setApplicantFinalName(e.target.value)}
                  placeholder="مثلاً: الضابط آدم"
                  className="border-rose-200 bg-white text-slate-900"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-700">الرتبة / المسمى</Label>
                <Input
                  value={applicantRank}
                  onChange={(e) => setApplicantRank(e.target.value)}
                  placeholder="مسعف، شرطي، شرطي شريف…"
                  className="border-rose-200 bg-white text-slate-900"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-700">الدور في المؤسسة</Label>
              <div className="grid grid-cols-3 gap-2 rounded-xl border border-rose-200 bg-white p-1">
                {(
                  [
                    { v: "member", l: "عضو" },
                    { v: "deputy", l: "نائب" },
                    { v: "leader", l: "قائد" },
                  ] as { v: RosterMembershipRole; l: string }[]
                ).map((opt) => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => setApplicantAssignRole(opt.v)}
                    className={cn(
                      "rounded-lg px-3 py-2 text-sm font-display transition",
                      applicantAssignRole === opt.v
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
                ))}
              </div>
            </div>

            {assignConflict ? (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3">
                <p className="text-sm font-semibold text-amber-800">
                  {assignConflict === "leader"
                    ? `يوجد قائد حالياً: «${currentLeaderName || "—"}»`
                    : `يوجد نائب حالياً: «${currentDeputyName || "—"}»`}
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-amber-700">
                  لإسناد {assignConflict === "leader" ? "القائد الجديد" : "النائب الجديد"}، خفّض الشخص
                  الحالي أولاً إلى عضو، ثم اضغط «قبول» مرة أخرى.
                </p>
                <div className="mt-2">
                  <Button
                    type="button"
                    size="sm"
                    className="bg-amber-600 text-white hover:bg-amber-700"
                    onClick={() => onDemoteCurrent(assignConflict)}
                  >
                    تخفيض {assignConflict === "leader" ? "القائد" : "النائب"} الحالي إلى عضو
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-700">
                صورة العضو في الطاقم <span className="font-normal text-slate-500">(اختياري)</span>
              </Label>
              <p className="text-[11px] leading-relaxed text-slate-500">
                يمكن قبول المتقدم بدون صورة — ارفع صورة هنا أو اترك الصورة الافتراضية.
              </p>
              <div className="flex items-center gap-3">
                <img
                  src={resolveApplicantRosterImage(applicantImage, submittedAvatar)}
                  alt=""
                  className="h-16 w-16 rounded-xl border border-rose-200 object-cover"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-rose-200 bg-white text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                    onClick={onPickImage}
                  >
                    <ImagePlus className="ms-1 h-3 w-3" />
                    {applicantImage && applicantImage !== ROSTER_PLACEHOLDER_IMAGE
                      ? "تغيير الصورة"
                      : "رفع صورة"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    onClick={() => setApplicantImage(ROSTER_PLACEHOLDER_IMAGE)}
                  >
                    بدون صورة (افتراضي)
                  </Button>
                  {submittedAvatar &&
                  applicantImage !== submittedAvatar &&
                  applicantImage !== ROSTER_PLACEHOLDER_IMAGE ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-rose-200 bg-white text-slate-700 hover:bg-rose-50"
                      onClick={() => setApplicantImage(submittedAvatar)}
                    >
                      استخدم صورة المتقدم
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div>
            <Label className="text-xs text-slate-700">ملاحظة القرار (اختياري)</Label>
            <Textarea
              className="mt-1 min-h-[80px] border-rose-200 bg-white text-slate-900"
              value={decisionNote}
              onChange={(e) => setDecisionNote(e.target.value)}
              placeholder="ستُعرض مع الطلب بعد القرار."
            />
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-rose-100 pt-3">
            <Button
              type="button"
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={onApprove}
            >
              قبول وتعيين
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100"
              onClick={onReject}
            >
              رفض الطلب
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
