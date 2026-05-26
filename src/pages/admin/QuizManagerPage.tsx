import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, HelpCircle, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import type { QuizQuestion } from "@/data/lawsQuiz";
import { appendActivityLog } from "@/lib/activityLog";
import {
  saveQuizQuestions,
  loadQuizQuestions,
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
import { cn } from "@/lib/utils";

type QuestionDialogState = {
  mode: "add" | "edit";
  draft: QuizQuestion;
};

/** أسئلة تقديم المواطن فقط — اختبارات الوظائف تُدار من محرر كل مؤسسة */
const CITIZEN_QUIZ_KEY = "citizen" as const;

const QuizManagerPage = () => {
  const { user } = useAuth();
  const [draft, setDraft] = useState<QuizQuestion[]>(() =>
    cloneQuizQuestions(loadQuizQuestions(CITIZEN_QUIZ_KEY)),
  );
  const [questionDialog, setQuestionDialog] = useState<QuestionDialogState | null>(null);
  /** يمنع إعادة تحميل المسودة من التخزين فور حفظنا — كان يمحو السؤال الجديد قبل ظهوره */
  const skipHydrateRef = useRef(false);

  const hydrateFromStorage = useCallback(() => {
    setDraft(cloneQuizQuestions(loadQuizQuestions(CITIZEN_QUIZ_KEY)));
  }, []);

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  useEffect(() => {
    const onQuizContentChanged = () => {
      if (skipHydrateRef.current) {
        skipHydrateRef.current = false;
        return;
      }
      hydrateFromStorage();
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === LAWS_QUIZ_STORAGE_KEY) onQuizContentChanged();
    };
    window.addEventListener(LAWS_QUIZ_CONTENT_CHANGED_EVENT, onQuizContentChanged);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(LAWS_QUIZ_CONTENT_CHANGED_EVENT, onQuizContentChanged);
      window.removeEventListener("storage", onStorage);
    };
  }, [hydrateFromStorage]);

  const openAddDialog = () => {
    setQuestionDialog({ mode: "add", draft: makeQuizQuestion() });
  };

  const openEditDialog = (q: QuizQuestion) => {
    setQuestionDialog({ mode: "edit", draft: cloneQuizQuestion(q) });
  };

  const persistDraftNow = useCallback((next: QuizQuestion[]) => {
    skipHydrateRef.current = true;
    saveQuizQuestions(CITIZEN_QUIZ_KEY, next);
    return true;
  }, []);

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
      return {
        ...prev,
        draft: { ...prev.draft, options: [...prev.draft.options, { id: nextId, label: "" }] },
      };
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

    setDraft((prev) => {
      const next =
        current.mode === "add"
          ? [...prev, cleaned]
          : prev.map((q) => (q.id === cleaned.id ? cleaned : q));
      persistDraftNow(next);
      toast.success(current.mode === "add" ? "تم إضافة السؤال وحفظه" : "تم تحديث السؤال وحفظه");
      return next;
    });
    setQuestionDialog(null);
  };

  const save = () => {
    const cleaned = cleanQuestions(draft);
    if (!cleaned) return;
    skipHydrateRef.current = true;
    saveQuizQuestions(CITIZEN_QUIZ_KEY, cleaned);
    appendActivityLog(
      user?.username ?? "admin",
      "تعديل أسئلة الاختبار",
      `تقديم المواطن — ${cleaned.length} سؤال`,
    );
    toast.success("تم حفظ الأسئلة");
  };

  const dialogDraft = questionDialog?.draft;

  return (
    <div dir="rtl" className="space-y-6 text-slate-900 dark:text-slate-100">
      <Card className="border-rose-200/90 bg-white shadow-sm dark:border-slate-600 dark:bg-slate-900/95 dark:shadow-none">
        <CardHeader className="text-right">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <Badge className="w-fit bg-rose-100 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-200 dark:hover:bg-rose-950/60">
                Quiz Manager
              </Badge>
              <CardTitle className="font-display text-2xl text-slate-900 dark:text-slate-50">
                إدارة أسئلة التقديم الإلكتروني
              </CardTitle>
              <CardDescription className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                أسئلة اختبار قوانين المدينة في نموذج تقديم المواطن (/apply/citizen). اختبارات التوظيف لكل مؤسسة
                تُعدّل من محرر المؤسسة → إدارة القوانين والأسئلة.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={save}
                className="gap-2 bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-500"
              >
                <Save className="h-4 w-4" />
                حفظ الكل
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={openAddDialog}
          className="gap-2 bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-500"
        >
          <Plus className="h-4 w-4" />
          إضافة سؤال
        </Button>
      </div>

      <div className="space-y-3">
        {draft.length === 0 ? (
          <Card className="border-dashed border-slate-300 bg-slate-50/80 dark:border-slate-600 dark:bg-slate-900/50">
            <CardContent className="py-10 text-center text-sm text-slate-600 dark:text-slate-400">
              لا توجد أسئلة بعد. اضغط «إضافة سؤال» لفتح النافذة وإنشاء أول سؤال.
            </CardContent>
          </Card>
        ) : null}
        {draft.map((q, index) => {
          const correctLabel = q.options.find((opt) => opt.id === q.correctOptionId)?.label;
          return (
            <Card
              key={q.id}
              className="border-slate-200 bg-white shadow-sm dark:border-slate-600 dark:bg-slate-900/95 dark:shadow-none"
            >
              <CardContent className="flex flex-wrap items-start justify-between gap-4 p-5 text-right">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-950/55 dark:text-rose-300">
                    <HelpCircle className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <p className="font-display text-sm font-semibold text-rose-700 dark:text-rose-300">
                      السؤال {index + 1}
                    </p>
                    <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-100">
                      {q.question.trim() || "— بدون نص —"}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {q.options.length} خيارات
                      {correctLabel ? (
                        <>
                          {" "}
                          · الإجابة الصحيحة:{" "}
                          <span className="font-medium text-emerald-700 dark:text-emerald-300">{correctLabel}</span>
                        </>
                      ) : null}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(q)}
                    className="gap-1.5 border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    تعديل
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={draft.length <= 1}
                    onClick={() => {
                      setDraft((prev) => {
                        const next = prev.filter((item) => item.id !== q.id);
                        persistDraftNow(next);
                        toast.success("تم حذف السؤال وحفظ التغيير");
                        return next;
                      });
                    }}
                    className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/45 dark:text-rose-200 dark:hover:bg-rose-950/70"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog
        open={questionDialog !== null}
        onOpenChange={(open) => {
          if (!open) setQuestionDialog(null);
        }}
      >
        <DialogContent
          dir="rtl"
          className="flex max-h-[min(90dvh,90svh)] w-[calc(100%-1rem)] max-w-2xl flex-col gap-0 overflow-hidden rounded-2xl border border-slate-200/95 bg-white p-0 text-right text-slate-900 shadow-[0_28px_72px_-24px_rgba(15,23,42,0.38)] dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50 sm:w-full"
        >
          <div className="shrink-0 border-b border-rose-200 bg-[radial-gradient(ellipse_100%_120%_at_50%_0%,rgba(139,92,246,0.18),transparent_58%)] px-5 pb-4 pt-12 dark:border-slate-700 dark:bg-[radial-gradient(ellipse_100%_120%_at_50%_0%,rgba(139,92,246,0.1),transparent_55%)] sm:px-6 sm:pt-14">
            <DialogHeader className="space-y-1.5 text-right sm:text-right">
              <DialogTitle className="font-display text-xl font-bold text-slate-900 dark:text-slate-50 sm:text-2xl">
                {questionDialog?.mode === "edit" ? "تعديل السؤال" : "إضافة سؤال جديد"}
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                اكتب نص السؤال، أضف الخيارات، ثم اضغط «صحيح» بجانب الإجابة الصحيحة.
              </DialogDescription>
            </DialogHeader>
          </div>

          {dialogDraft ? (
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain bg-white px-5 py-5 dark:bg-slate-900 sm:px-6">
              <div className="space-y-2 text-right">
                <Label className="text-slate-800 dark:text-slate-200">نص السؤال</Label>
                <Textarea
                  value={dialogDraft.question}
                  onChange={(e) => patchDialogQuestion({ question: e.target.value })}
                  className="min-h-24 border-slate-200 bg-white text-right text-slate-900 placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                  placeholder="اكتب السؤال هنا..."
                />
              </div>

              <div className="space-y-3 text-right">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-slate-800 dark:text-slate-200">الخيارات والإجابة الصحيحة</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addDialogOption}
                    disabled={dialogDraft.options.length >= QUIZ_OPTION_IDS.length}
                    className="h-8 gap-1 border-slate-300 bg-white text-xs text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    خيار
                  </Button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  اضغط «صحيح» بجانب الإجابة الصحيحة — يُظلَّل الخيار بالأخضر.
                </p>
                <div className="space-y-2">
                  {dialogDraft.options.map((opt, optIdx) => {
                    const isCorrect = dialogDraft.correctOptionId === opt.id;
                    return (
                      <div
                        key={opt.id}
                        className={cn(
                          "flex flex-wrap items-center gap-2 rounded-xl border p-2.5",
                          isCorrect
                            ? "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/40"
                            : "border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-900/80",
                        )}
                      >
                        <span className="w-8 shrink-0 text-center font-display text-sm font-semibold text-slate-500 dark:text-slate-400">
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <Input
                          value={opt.label}
                          onChange={(e) => patchDialogOption(opt.id, e.target.value)}
                          className="min-w-0 flex-1 border-slate-200 bg-white text-right text-slate-900 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                          placeholder={`نص الخيار ${String.fromCharCode(65 + optIdx)}`}
                        />
                        <Button
                          type="button"
                          variant={isCorrect ? "default" : "outline"}
                          size="sm"
                          onClick={() => patchDialogQuestion({ correctOptionId: opt.id })}
                          className={cn(
                            "shrink-0 gap-1",
                            isCorrect
                              ? "bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                              : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800",
                          )}
                        >
                          {isCorrect ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                          صحيح
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          disabled={dialogDraft.options.length <= 2}
                          onClick={() => removeDialogOption(opt.id)}
                          className="shrink-0 border-slate-300 bg-white hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:hover:bg-slate-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-800 dark:text-slate-200">شرح (اختياري)</Label>
                <Textarea
                  value={dialogDraft.explanation ?? ""}
                  onChange={(e) => patchDialogQuestion({ explanation: e.target.value })}
                  className="min-h-16 border-slate-200 bg-white text-right text-slate-900 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                  placeholder="يظهر للمستخدم بعد إجابة خاطئة..."
                />
              </div>
            </div>
          ) : null}

          <DialogFooter className="shrink-0 flex-row-reverse gap-2 border-t border-slate-200 bg-slate-50/90 px-5 py-4 dark:border-slate-700 dark:bg-slate-900/95 sm:justify-start sm:px-6">
            <Button type="button" onClick={confirmQuestionDialog} className="bg-rose-600 text-white hover:bg-rose-700">
              {questionDialog?.mode === "edit" ? "حفظ التعديل" : "إضافة السؤال"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setQuestionDialog(null)}
              className="border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuizManagerPage;
