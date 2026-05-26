import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, ExternalLink, ShieldQuestion, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LawsTabPanel } from "@/components/admin/institution-manage/LawsTabPanel";
import { QuizQuestionEditorDialog } from "@/components/admin/institution-manage/QuizQuestionEditorDialog";
import { QuizTabPanel } from "@/components/admin/institution-manage/QuizTabPanel";
import type { InstitutionBranchId } from "@/data/institutionBranches";
import { INSTITUTION_BRANCH_META } from "@/data/institutionBranches";
import type { QuizQuestion } from "@/data/lawsQuiz";
import type { JobRoleLawSet } from "@/data/jobRoleLaws";
import { useAuth } from "@/contexts/AuthContext";
import { appendActivityLog } from "@/lib/activityLog";
import { jobRoleKeyFromInstitutionBranch } from "@/lib/institutionJobRole";
import { loadJobRoleLawSet, saveJobRoleLawSet } from "@/lib/jobRoleLawsContent";
import {
  loadQuizQuestions,
  saveQuizQuestions,
  LAWS_QUIZ_CONTENT_CHANGED_EVENT,
  LAWS_QUIZ_STORAGE_KEY,
} from "@/lib/lawsQuizContent";
import {
  cleanQuestions,
  cleanSingleQuestion,
  cloneQuizQuestion,
  cloneQuizQuestions,
  makeQuizQuestion,
  QUIZ_OPTION_IDS,
} from "@/lib/quizQuestionUtils";
import { JOB_ROLE_LAWS_CONTENT_CHANGED_EVENT, JOB_ROLE_LAWS_STORAGE_KEY } from "@/lib/jobRoleLawsContent";

type Props = {
  branchId: InstitutionBranchId | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type QuestionDialogState = {
  mode: "add" | "edit";
  draft: QuizQuestion;
};

function cloneLawSet(set: JobRoleLawSet): JobRoleLawSet {
  return { ...set, rules: [...set.rules] };
}

export function InstitutionManageDialog({ branchId, open, onOpenChange }: Props) {
  const { user } = useAuth();
  const meta = branchId ? INSTITUTION_BRANCH_META[branchId] : null;
  const jobRoleKey = branchId ? jobRoleKeyFromInstitutionBranch(branchId) : null;

  const [tab, setTab] = useState<"laws" | "quiz">("laws");
  const [lawsDraft, setLawsDraft] = useState<JobRoleLawSet | null>(null);
  const [quizDraft, setQuizDraft] = useState<QuizQuestion[]>([]);
  const [questionDialog, setQuestionDialog] = useState<QuestionDialogState | null>(null);
  const [savingLaws, setSavingLaws] = useState(false);
  const [savingQuiz, setSavingQuiz] = useState(false);
  const skipLawsHydrateRef = useRef(false);
  const skipQuizHydrateRef = useRef(false);

  const hydrate = useCallback(() => {
    if (!jobRoleKey) return;
    if (!skipLawsHydrateRef.current) {
      setLawsDraft(cloneLawSet(loadJobRoleLawSet(jobRoleKey)));
    } else {
      skipLawsHydrateRef.current = false;
    }
    if (!skipQuizHydrateRef.current) {
      setQuizDraft(cloneQuizQuestions(loadQuizQuestions(jobRoleKey)));
    } else {
      skipQuizHydrateRef.current = false;
    }
  }, [jobRoleKey]);

  const persistLawsIfValid = useCallback(
    (draft: JobRoleLawSet) => {
      if (!jobRoleKey) return false;
      const title = draft.title.trim();
      const subtitle = draft.subtitle.trim();
      const rules = draft.rules.map((r) => r.trim()).filter(Boolean);
      if (title.length < 3 || rules.length === 0) return false;
      skipLawsHydrateRef.current = true;
      saveJobRoleLawSet(jobRoleKey, { title, subtitle, rules });
      return true;
    },
    [jobRoleKey],
  );

  const applyLawsDraft = useCallback(
    (next: JobRoleLawSet) => {
      setLawsDraft(next);
      persistLawsIfValid(next);
    },
    [persistLawsIfValid],
  );

  useEffect(() => {
    if (!open) return;
    setTab("laws");
    skipLawsHydrateRef.current = false;
    skipQuizHydrateRef.current = false;
    hydrate();
    const onStorage = (e: StorageEvent) => {
      if (e.key === LAWS_QUIZ_STORAGE_KEY || e.key === JOB_ROLE_LAWS_STORAGE_KEY) hydrate();
    };
    const onQuizChanged = () => hydrate();
    const onLawsChanged = () => hydrate();
    window.addEventListener(LAWS_QUIZ_CONTENT_CHANGED_EVENT, onQuizChanged);
    window.addEventListener(JOB_ROLE_LAWS_CONTENT_CHANGED_EVENT, onLawsChanged as EventListener);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(LAWS_QUIZ_CONTENT_CHANGED_EVENT, onQuizChanged);
      window.removeEventListener(JOB_ROLE_LAWS_CONTENT_CHANGED_EVENT, onLawsChanged as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, [open, hydrate]);

  /** حفظ فوري دون إعادة التحقق من كل الأسئلة (يتجنب فشل الحفظ بسبب سؤال قديم ناقص) */
  const persistQuizDraftNow = useCallback(
    (next: QuizQuestion[]) => {
      if (!jobRoleKey) return false;
      skipQuizHydrateRef.current = true;
      saveQuizQuestions(jobRoleKey, next);
      return true;
    },
    [jobRoleKey],
  );

  const saveLaws = () => {
    if (!jobRoleKey || !lawsDraft || !meta) return;
    const title = lawsDraft.title.trim();
    const subtitle = lawsDraft.subtitle.trim();
    const rules = lawsDraft.rules.map((r) => r.trim()).filter(Boolean);
    if (title.length < 3) {
      toast.error("أدخل عنواناً للقوانين");
      return;
    }
    if (rules.length === 0) {
      toast.error("أضف قاعدة واحدة على الأقل");
      return;
    }
    setSavingLaws(true);
    skipLawsHydrateRef.current = true;
    saveJobRoleLawSet(jobRoleKey, { title, subtitle, rules });
    appendActivityLog(user?.username ?? "admin", "تعديل قوانين مؤسسة", `${meta.labelAr}`);
    setSavingLaws(false);
    toast.success("تم حفظ القوانين");
  };

  const saveQuiz = () => {
    if (!jobRoleKey || !meta) return;
    const cleaned = cleanQuestions(quizDraft);
    if (!cleaned) return;
    setSavingQuiz(true);
    skipQuizHydrateRef.current = true;
    saveQuizQuestions(jobRoleKey, cleaned);
    appendActivityLog(user?.username ?? "admin", "تعديل أسئلة مؤسسة", `${meta.labelAr} — ${cleaned.length} سؤال`);
    setSavingQuiz(false);
    toast.success("تم حفظ الأسئلة");
  };

  const patchDialogQuestion = (patch: Partial<QuizQuestion>) => {
    setQuestionDialog((prev) => (prev ? { ...prev, draft: { ...prev.draft, ...patch } } : null));
  };

  const patchDialogOption = (optionId: string, label: string) => {
    setQuestionDialog((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        draft: {
          ...prev.draft,
          options: prev.draft.options.map((opt) => (opt.id === optionId ? { ...opt, label } : opt)),
        },
      };
    });
  };

  const addDialogOption = () => {
    setQuestionDialog((prev) => {
      if (!prev || prev.draft.options.length >= QUIZ_OPTION_IDS.length) return prev;
      const nextId =
        QUIZ_OPTION_IDS.find((id) => !prev.draft.options.some((opt) => opt.id === id)) ?? crypto.randomUUID();
      return { ...prev, draft: { ...prev.draft, options: [...prev.draft.options, { id: nextId, label: "" }] } };
    });
  };

  const removeDialogOption = (optionId: string) => {
    setQuestionDialog((prev) => {
      if (!prev || prev.draft.options.length <= 2) return prev;
      const options = prev.draft.options.filter((opt) => opt.id !== optionId);
      const correctOptionId =
        prev.draft.correctOptionId === optionId ? options[0]!.id : prev.draft.correctOptionId;
      return { ...prev, draft: { ...prev.draft, options, correctOptionId } };
    });
  };

  const confirmQuestionDialog = () => {
    if (!questionDialog) return;
    const current = questionDialog;
    const cleaned = cleanSingleQuestion(current.draft);
    if (!cleaned) return;

    setQuizDraft((prev) => {
      const next =
        current.mode === "add"
          ? [...prev, cleaned]
          : prev.map((q) => (q.id === cleaned.id ? cleaned : q));
      persistQuizDraftNow(next);
      toast.success(current.mode === "add" ? "تم إضافة السؤال وحفظه" : "تم تحديث السؤال وحفظه");
      return next;
    });
    setQuestionDialog(null);
  };

  const deleteQuizQuestion = (id: string) => {
    setQuizDraft((prev) => {
      const next = prev.filter((item) => item.id !== id);
      persistQuizDraftNow(next);
      toast.success("تم حذف السؤال وحفظ التغيير");
      return next;
    });
  };

  if (!branchId || !meta || !jobRoleKey) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          dir="rtl"
          className="flex max-h-[min(92dvh,880px)] w-[calc(100%-1rem)] max-w-4xl flex-col gap-0 overflow-hidden rounded-2xl border border-slate-200/95 bg-white p-0 text-right text-slate-900 shadow-[0_32px_80px_-28px_rgba(15,23,42,0.45)] dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50 sm:w-full"
        >
          <div className="shrink-0 border-b border-rose-200 bg-[radial-gradient(ellipse_100%_120%_at_50%_0%,rgba(139,92,246,0.2),transparent_58%)] px-5 pb-4 pt-12 dark:border-slate-700 sm:px-6 sm:pt-14">
            <DialogHeader className="space-y-1.5 text-right sm:text-right">
              <DialogTitle className="font-display text-xl font-bold sm:text-2xl">{meta.labelAr}</DialogTitle>
              <DialogDescription className="text-sm text-slate-600 dark:text-slate-400">
                إدارة قوانين التقديم وأسئلة الاختبار لهذه المؤسسة — التغييرات تظهر في نموذج التوظيف العام.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button asChild type="button" variant="outline" size="sm" className="gap-1.5 border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900">
                <Link to={`/dashboard/institution/${branchId}`}>
                  <Users className="h-3.5 w-3.5" />
                  تحرير الطاقم
                </Link>
              </Button>
              <Button asChild type="button" variant="outline" size="sm" className="gap-1.5 border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900">
                <a href={meta.previewPath} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                  معاينة الموقع
                </a>
              </Button>
            </div>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as "laws" | "quiz")} className="flex min-h-0 flex-1 flex-col">
            <TabsList className="mx-5 mt-4 grid w-auto shrink-0 grid-cols-2 gap-1 rounded-xl bg-rose-100/80 p-1 dark:bg-slate-800">
              <TabsTrigger
                value="laws"
                className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-rose-900 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-rose-100"
              >
                <BookOpen className="h-4 w-4" />
                القوانين
              </TabsTrigger>
              <TabsTrigger
                value="quiz"
                className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-rose-900 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-rose-100"
              >
                <ShieldQuestion className="h-4 w-4" />
                أسئلة الاختبار
                <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-[10px]">
                  {quizDraft.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="laws"
              className="mt-0 min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50/50 px-5 py-4 data-[state=inactive]:hidden dark:bg-slate-950/40 sm:px-6"
            >
              {lawsDraft ? (
                <LawsTabPanel
                  lawsDraft={lawsDraft}
                  onChange={applyLawsDraft}
                  onSave={saveLaws}
                  saving={savingLaws}
                />
              ) : null}
            </TabsContent>

            <TabsContent
              value="quiz"
              className="mt-0 min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50/50 px-5 py-4 data-[state=inactive]:hidden dark:bg-slate-950/40 sm:px-6"
            >
              <QuizTabPanel
                quizDraft={quizDraft}
                onAdd={() => setQuestionDialog({ mode: "add", draft: makeQuizQuestion() })}
                onEdit={(q) => setQuestionDialog({ mode: "edit", draft: cloneQuizQuestion(q) })}
                onDelete={deleteQuizQuestion}
                onSave={saveQuiz}
                saving={savingQuiz}
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <QuizQuestionEditorDialog
        open={questionDialog !== null}
        mode={questionDialog?.mode ?? "add"}
        draft={questionDialog?.draft ?? null}
        onOpenChange={(o) => !o && setQuestionDialog(null)}
        onConfirm={confirmQuestionDialog}
        onPatchQuestion={patchDialogQuestion}
        onPatchOption={patchDialogOption}
        onAddOption={addDialogOption}
        onRemoveOption={removeDialogOption}
      />
    </>
  );
}
