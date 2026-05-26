import { useMemo, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import InstitutionHero from "@/components/InstitutionHero";
import LawsReaderDialog from "@/components/LawsReaderDialog";
import Stepper, { Step } from "@/components/Stepper";
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
import { DEFAULT_ARAB_COUNTRY_CODE, arabCountries, getArabCountryLabel, isArabCountryCode } from "@/data/arabCountries";
import { ARABIC_MONTHS, getFullYearsSinceBirth, parseBirthDateParts } from "@/lib/birthdate";
import { cn, isValidArabicNamePart } from "@/lib/utils";
import { DISCORD_INVITE_URL } from "@/config/communityLinks";
import { DiscordIcon } from "@/components/DiscordIcon";
import { useApplicationsContent } from "@/contexts/ApplicationsContentContext";
import type { LawsQuizResult } from "@/data/publicApplicationTypes";
import { Navigate, useNavigate } from "react-router-dom";
import { useSiteVisibility } from "@/lib/siteVisibility";
import {
  branchIdFromApplicationRoleKey,
  useApplicationsClosure,
} from "@/lib/applicationsClosure";
import { usePublicUser } from "@/contexts/PublicUserContext";
import {
  hasApprovedApplicationForRole,
  hasApprovedCitizenApplication,
  hasPendingCitizenApplication,
  isCitizenApplyFormBlocked,
} from "@/lib/publicProfileEligibility";
import { BadgeCheck, IdCard, Lock, ShieldAlert } from "lucide-react";
import { OptionalNarrativeField } from "@/components/apply/OptionalNarrativeField";

const TOTAL_STEPS = 10;
/** نص جاهز للمستخدمين بدون سجل سابق أو بدون نبذة */
const NONE_PLACEHOLDER = "لا يوجد";

type Gender = "" | "male" | "female";

function genderLabel(g: Gender): string {
  if (g === "male") return "ذكر";
  if (g === "female") return "أنثى";
  return "";
}

type ApplicationTarget = {
  title: string;
  subtitle: string;
  dashboardPath: string;
  heroEyebrow: string;
  heroTitleParts: readonly [string, string];
};

const targets: Record<string, ApplicationTarget> = {
  citizen: {
    title: "تقديم المواطن",
    subtitle: "املأ بياناتك الأساسية ثم أكمل رحلتك داخل المدينة.",
    dashboardPath: "/",
    heroEyebrow: "CITIZEN APPLICATION",
    heroTitleParts: ["تقديم", "المواطن"],
  },
  police: {
    title: "تقديم الشرطة",
    subtitle: "تسجيل بيانات المرشح لفرع الشرطة ضمن وزارة الداخلية.",
    dashboardPath: "/interior/police",
    heroEyebrow: "MINISTRY OF INTERIOR — LSPD",
    heroTitleParts: ["تقديم", "الشرطة"],
  },
  interior_sheriff: {
    title: "تقديم الداخلية — الشيرف",
    subtitle: "تسجيل بيانات المرشح لفرع الشيرف ضمن وزارة الداخلية.",
    dashboardPath: "/interior/sheriff",
    heroEyebrow: "MINISTRY OF INTERIOR — SHERIFF",
    heroTitleParts: ["تقديم", "الشيرف"],
  },
  interior_cia: {
    title: "تقديم الداخلية — CIA",
    subtitle: "تسجيل بيانات المرشح لفرع الاستخبارات ضمن وزارة الداخلية.",
    dashboardPath: "/interior/cia",
    heroEyebrow: "MINISTRY OF INTERIOR — CIA",
    heroTitleParts: ["تقديم", "CIA"],
  },
  interior_marines: {
    title: "تقديم الداخلية — المارينز",
    subtitle: "تسجيل بيانات المرشح لفرع المارينز ضمن وزارة الداخلية.",
    dashboardPath: "/interior/marines",
    heroEyebrow: "MINISTRY OF INTERIOR — MARINES",
    heroTitleParts: ["تقديم", "المارينز"],
  },
  interior_fpi: {
    title: "تقديم الداخلية — FPI",
    subtitle: "تسجيل بيانات المرشح لوحدة FPI ضمن وزارة الداخلية.",
    dashboardPath: "/interior/fpi",
    heroEyebrow: "MINISTRY OF INTERIOR — FPI",
    heroTitleParts: ["تقديم", "FPI"],
  },
  ems: {
    title: "تقديم وزارة الصحة",
    subtitle: "تسجيل بيانات مرشحي الطاقم الطبي والإسعافي.",
    dashboardPath: "/health",
    heroEyebrow: "MINISTRY OF HEALTH",
    heroTitleParts: ["تقديم", "وزارة الصحة"],
  },
  streamers: {
    title: "تقديم صناع المحتوى",
    subtitle: "أدخل معلومات البث ليتم تحويلك إلى لوحة صناع المحتوى.",
    dashboardPath: "/streamers",
    heroEyebrow: "CONTENT CREATOR",
    heroTitleParts: ["تقديم", "صنّاع المحتوى"],
  },
  oversight: {
    title: "تقديم الرقابة",
    subtitle: "تسجيل بيانات المرشح لقسم الرقابة والمتابعة.",
    dashboardPath: "/oversight",
    heroEyebrow: "OVERSIGHT DIVISION",
    heroTitleParts: ["تقديم", "الرقابة"],
  },
  justice: {
    title: "تقديم وزارة العدل",
    subtitle: "أدخل بياناتك للانضمام إلى وزارة العدل.",
    dashboardPath: "/justice",
    heroEyebrow: "MINISTRY OF JUSTICE",
    heroTitleParts: ["تقديم", "وزارة العدل"],
  },
  developer: {
    title: "تقديم مبرمج",
    subtitle: "أدخل معلوماتك التقنية للانضمام لفريق البرمجة.",
    dashboardPath: "/developer",
    heroEyebrow: "DEVELOPER TEAM",
    heroTitleParts: ["تقديم", "المبرمج"],
  },
  lawyer: {
    title: "تقديم هيئة المحاماة",
    subtitle: "أدخل بياناتك للانضمام إلى هيئة المحاماة ضمن وزارة العدل.",
    dashboardPath: "/justice",
    heroEyebrow: "MINISTRY OF JUSTICE — LEGAL",
    heroTitleParts: ["تقديم", "هيئة المحاماة"],
  },
  gang: {
    title: "تقديم فتح عصابة",
    subtitle: "سجل بياناتك وبيانات العصابة المقترحة للمراجعة.",
    dashboardPath: "/gangs",
    heroEyebrow: "GANG REGISTRATION",
    heroTitleParts: ["تقديم", "فتح عصابة"],
  },
  vip: {
    title: "طلب باقة VIP",
    subtitle: "أدخل معلوماتك ونوع الباقة المطلوبة (سيارات/تجهيزات).",
    dashboardPath: "/store",
    heroEyebrow: "VIP PACKAGE",
    heroTitleParts: ["طلب", "باقة VIP"],
  },
};

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-primary/25 bg-background/50 px-4 py-3 text-right backdrop-blur-sm transition-colors hover:border-primary/40 hover:bg-background/60">
      <span className="font-display text-[11px] tracking-wide text-primary">{label}</span>
      <span className="text-sm font-medium text-foreground">{value || "—"}</span>
    </div>
  );
}

const ApplicationFormPage = () => {
  const { role = "" } = useParams();
  const navigate = useNavigate();
  const { submitApplication, applications } = useApplicationsContent();
  const publicUser = usePublicUser();
  const visibility = useSiteVisibility();
  const closure = useApplicationsClosure();
  const closureBranchId = branchIdFromApplicationRoleKey(role);
  const isRoleClosed = closureBranchId
    ? closure.closed[closureBranchId] === true
    : false;
  const closureNote = closureBranchId ? closure.notes[closureBranchId] : undefined;
  const isDiscordUser = publicUser.user?.authProvider === "discord";
  const effectiveRoleKey = targets[role] ? role : "citizen";
  /** ملف المستخدم الكامل — يحتوي على discordId والاسم على Discord */
  const profile = useMemo(
    () => (publicUser.user ? publicUser.getProfile() : null),
    [publicUser],
  );
  const citizenApplyApproved = useMemo(
    () => !!profile && hasApprovedCitizenApplication(profile, applications),
    [profile, applications],
  );
  const citizenApplyPending = useMemo(
    () => !!profile && hasPendingCitizenApplication(profile, applications),
    [profile, applications],
  );
  const electronicApplyBlocked = useMemo(() => {
    if (!profile || !isDiscordUser) return false;
    if (effectiveRoleKey === "citizen") {
      return isCitizenApplyFormBlocked(profile, applications);
    }
    return hasApprovedApplicationForRole(profile, applications, effectiveRoleKey);
  }, [profile, isDiscordUser, effectiveRoleKey, applications]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const finalSubmitStarted = useRef(false);

  useEffect(() => {
    finalSubmitStarted.current = false;
  }, [role]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState<Gender>("");
  /**
   * بيانات Discord تُحدَّث تلقائياً من حساب المستخدم — يُمنع التعديل اليدوي
   * (لذلك ما عاد فيه setDiscord علني للنموذج).
   */
  const discord = useMemo(() => {
    if (!profile) return "";
    const handle = profile.username?.trim() ?? "";
    const id = profile.discordId?.trim() ?? "";
    if (handle && id) return `${handle} (ID: ${id})`;
    if (handle) return handle;
    return id;
  }, [profile]);
  /** مدن أو سيرفرات RP لعب بها المستخدم سابقًا */
  const [previousCities, setPreviousCities] = useState("");
  const [noPreviousCities, setNoPreviousCities] = useState(false);
  const [birthYear, setBirthYear] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [country, setCountry] = useState(DEFAULT_ARAB_COUNTRY_CODE);
  const [experience, setExperience] = useState("");
  const [noExperience, setNoExperience] = useState(false);
  const [lawsAccepted, setLawsAccepted] = useState(false);
  const [lawsDialogOpen, setLawsDialogOpen] = useState(false);
  /** نتيجة اختبار قراءة قوانين المدينة — تُرفق بالطلب وتظهر للأدمن */
  const [lawsQuizResult, setLawsQuizResult] = useState<LawsQuizResult | null>(null);

  const target = useMemo<ApplicationTarget>(() => {
    const t = targets[role];
    if (t) return t;
    return targets.citizen;
  }, [role]);

  const roleVisible = useMemo(() => {
    if (!targets[role]) return true;
    if (role === "streamers") return visibility.pages.streamers;
    if (role === "gang") return visibility.pages.gangs;
    if (role === "vip") return visibility.pages.vipCars;
    if (role === "justice" || role === "lawyer") return visibility.institutions.justice_lawyers;
    if (role === "developer") return visibility.institutions.developer;
    if (role === "oversight") return visibility.institutions.oversight;
    if (role === "ems") return visibility.institutions.health;
    if (role === "police") return visibility.institutions.interior_police;
    if (role === "interior_sheriff") return visibility.institutions.interior_sheriff;
    if (role === "interior_cia") return visibility.institutions.interior_cia;
    if (role === "interior_marines") return visibility.institutions.interior_marines;
    if (role === "interior_fpi") return visibility.institutions.interior_fpi;
    return true;
  }, [role, visibility]);


  const yearOptions = useMemo(() => {
    const cy = new Date().getFullYear();
    const years: number[] = [];
    for (let y = cy; y >= cy - 100; y -= 1) {
      years.push(y);
    }
    return years;
  }, []);

  const dayOptions = useMemo(() => {
    if (!birthYear || !birthMonth) {
      return Array.from({ length: 31 }, (_, i) => i + 1);
    }
    const y = Number.parseInt(birthYear, 10);
    const m = Number.parseInt(birthMonth, 10);
    if (Number.isNaN(y) || Number.isNaN(m)) return Array.from({ length: 31 }, (_, i) => i + 1);
    const dim = new Date(y, m, 0).getDate();
    return Array.from({ length: dim }, (_, i) => i + 1);
  }, [birthYear, birthMonth]);

  useEffect(() => {
    if (!birthDay || !birthYear || !birthMonth) return;
    const d = Number.parseInt(birthDay, 10);
    const y = Number.parseInt(birthYear, 10);
    const m = Number.parseInt(birthMonth, 10);
    if (Number.isNaN(d) || Number.isNaN(y) || Number.isNaN(m)) return;
    const max = new Date(y, m, 0).getDate();
    if (d > max) {
      setBirthDay(String(max));
    }
  }, [birthYear, birthMonth, birthDay]);

  const validateBirthComplete = useCallback((): boolean => {
    const birth = parseBirthDateParts(birthYear, birthMonth, birthDay);
    if (!birth) {
      toast.error("اختر اليوم والشهر وسنة الميلاد بالكامل");
      return false;
    }
    if (birth > new Date()) {
      toast.error("لا يمكن اختيار تاريخ في المستقبل");
      return false;
    }
    if (getFullYearsSinceBirth(birth) < 16) {
      toast.error("يجب أن يكون عمرك 16 سنة على الأقل");
      return false;
    }
    return true;
  }, [birthYear, birthMonth, birthDay]);

  const birthSummaryLine = useMemo(() => {
    if (!birthYear || !birthMonth || !birthDay) return "—";
    return `${birthDay} / ${birthMonth} / ${birthYear}`;
  }, [birthYear, birthMonth, birthDay]);

  const ageSummaryLine = useMemo(() => {
    const birth = parseBirthDateParts(birthYear, birthMonth, birthDay);
    if (!birth) return "—";
    return `${getFullYearsSinceBirth(birth)} سنة`;
  }, [birthYear, birthMonth, birthDay]);

  /** يُعرض تحت القوائم مباشرةً بعد اكتمال التاريخ */
  const liveBirthAgeYears = useMemo(() => {
    const birth = parseBirthDateParts(birthYear, birthMonth, birthDay);
    if (!birth) return null;
    if (birth > new Date()) return null;
    return getFullYearsSinceBirth(birth);
  }, [birthYear, birthMonth, birthDay]);

  const validateAllFields = useCallback(() => {
    if (!isValidArabicNamePart(firstName)) {
      toast.error("أدخل الاسم الأول بالعربي فقط (حرفين على الأقل)");
      return false;
    }
    if (!isValidArabicNamePart(lastName)) {
      toast.error("أدخل اسم العائلة بالعربي فقط (حرفين على الأقل)");
      return false;
    }
    if (gender !== "male" && gender !== "female") {
      toast.error("اختر الجنس");
      return false;
    }
    if (!validateBirthComplete()) {
      return false;
    }
    if (!isArabCountryCode(country)) {
      toast.error("اختر الدولة من القائمة");
      return false;
    }
    if (!discord.trim()) {
      toast.error("أدخل معرف الديسكورد");
      return false;
    }
    if (!noPreviousCities) {
      if (!previousCities.trim()) {
        toast.error("اختر «لدي سجل سابق» واذكر المدن أو السيرفرات، أو «لم يسبق لي ذلك»");
        return false;
      }
      if (previousCities.trim().length < 3) {
        toast.error("أضف تفاصيل أكثر عن تجاربك السابقة");
        return false;
      }
    }
    if (!noExperience) {
      if (!experience.trim()) {
        toast.error("اكتب نبذة عن خبرتك ودوافع الانضمام، أو اختر «لا توجد خبرة سابقة»");
        return false;
      }
      if (experience.trim().length < 20) {
        toast.error("اجعل النبذة أوضح (20 حرفًا على الأقل)");
        return false;
      }
    }
    if (!lawsAccepted) {
      toast.error("يجب فتح «قراءة القوانين» والإقرار بالاطلاع قبل الإرسال");
      return false;
    }
    return true;
  }, [
    firstName,
    lastName,
    gender,
    validateBirthComplete,
    country,
    discord,
    noPreviousCities,
    previousCities,
    noExperience,
    experience,
    lawsAccepted,
  ]);

  const validateStep = useCallback(
    (step: number) => {
      switch (step) {
        case 1:
          if (!isValidArabicNamePart(firstName)) {
            toast.error("اكتب الاسم الأول بالعربي فقط، من حرفين فما فوق");
            return false;
          }
          return true;
        case 2:
          if (!isValidArabicNamePart(lastName)) {
            toast.error("اكتب اسم العائلة بالعربي فقط، من حرفين فما فوق");
            return false;
          }
          return true;
        case 3:
          if (gender !== "male" && gender !== "female") {
            toast.error("اختر ذكرًا أو أنثى");
            return false;
          }
          return true;
        case 4:
          return validateBirthComplete();
        case 5:
          if (!isArabCountryCode(country)) {
            toast.error("اختر دولة من القائمة");
            return false;
          }
          return true;
        case 6:
          if (!discord.trim()) {
            toast.error("أدخل معرف الديسكورد");
            return false;
          }
          return true;
        case 7:
          if (noPreviousCities) return true;
          if (!previousCities.trim()) {
            toast.error("اذكر مدن أو سيرفرات لعبت بها، أو اختر «لم يسبق لي ذلك»");
            return false;
          }
          if (previousCities.trim().length < 3) {
            toast.error("أضف تفاصيل أكثر");
            return false;
          }
          return true;
        case 8: {
          if (noExperience) return true;
          if (!experience.trim()) {
            toast.error("اكتب نبذة عن خبرتك ودوافع الانضمام، أو اختر «لا توجد خبرة سابقة»");
            return false;
          }
          if (experience.trim().length < 20) {
            toast.error("اجعل النبذة أوضح (20 حرفًا على الأقل)");
            return false;
          }
          return true;
        }
        case 9:
          if (!lawsAccepted) {
            toast.error("اضغط «قراءة القوانين» ثم أقر بالاطلاع للانتقال إلى المراجعة");
            return false;
          }
          return true;
        case 10:
          return validateAllFields();
        default:
          return true;
      }
    },
    [
      firstName,
      lastName,
      gender,
      validateBirthComplete,
      country,
      discord,
      noPreviousCities,
      previousCities,
      noExperience,
      experience,
      lawsAccepted,
      validateAllFields,
    ],
  );

  const handleFinal = useCallback(() => {
    if (finalSubmitStarted.current) return;
    if (isRoleClosed) {
      toast.error("التقديم مغلق حالياً لهذه الجهة");
      return;
    }
    const roleKey = targets[role] ? role : "citizen";
    if (profile && isDiscordUser) {
      if (roleKey === "citizen") {
        if (isCitizenApplyFormBlocked(profile, applications)) {
          toast.error(
            hasApprovedCitizenApplication(profile, applications)
              ? "تم قبول تقديمك مسبقاً — لا حاجة لإرسال طلب جديد من هنا"
              : "لديك طلب مواطن قيد المراجعة — انتظر قرار الإدارة",
          );
          return;
        }
      } else if (hasApprovedApplicationForRole(profile, applications, roleKey)) {
        toast.error("يوجد لديك طلب مقبول مسبقاً لهذا المسار — لا حاجة لإرسال طلب جديد");
        return;
      }
    }
    if (!validateAllFields()) return;
    finalSubmitStarted.current = true;
    setIsSubmitting(true);
    try {
      const cityNameForProfile = `${firstName.trim()} ${lastName.trim()}`.trim();
      const birthForAge = parseBirthDateParts(birthYear, birthMonth, birthDay);
      const ageYearsForProfile = birthForAge ? getFullYearsSinceBirth(birthForAge) : 0;

      const result = submitApplication({
        roleKey,
        targetTitle: target.title,
        applicantUserId: publicUser.user?.id,
        applicantUsername: publicUser.user?.username,
        applicantDisplayName: publicUser.user?.displayName,
        snapshot: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          gender: gender as "male" | "female",
          birthSummaryLine,
          ageSummaryLine,
          countryCode: country,
          discord: discord.trim(),
          previousCities: noPreviousCities ? NONE_PLACEHOLDER : previousCities.trim(),
          experience: noExperience ? NONE_PLACEHOLDER : experience.trim(),
          lawsAccepted,
          lawsQuizResult: lawsQuizResult ?? undefined,
          cityName: cityNameForProfile || undefined,
        },
      });
      if (result === "ok") {
        if (cityNameForProfile && ageYearsForProfile >= 13) {
          publicUser.updateProfile({ cityName: cityNameForProfile, age: ageYearsForProfile });
        }
        setSubmitSuccess(true);
      } else {
        finalSubmitStarted.current = false;
        if (result === "storage_quota") {
          toast.error(
            "مساحة تخزين المتصفح ممتلئة. احذف طلبات قديمة من لوحة الإدارة (طلبات التقديم) أو امسح بيانات الموقع من إعدادات المتصفح ثم أعد المحاولة.",
          );
        } else if (result === "storage_blocked") {
          toast.error(
            "المتصفح منع حفظ الطلب (وضع خاص صارم، أو حظر التخزين/ملفات تعريف الارتباط لهذا الموقع). فعّل التخزين المحلي للموقع أو جرّب متصفحاً آخر — لا يُنصح بوضع التصفح الخاص إذا كان يمنع التخزين.",
          );
        } else {
          toast.error("تعذر حفظ الطلب. حدّث الصفحة وأعد المحاولة، أو تحقق من وحدة التخزين في المتصفح.");
        }
      }
    } catch {
      finalSubmitStarted.current = false;
      toast.error("حدث خطأ أثناء الإرسال. أعد المحاولة.");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isRoleClosed,
    validateAllFields,
    role,
    target.title,
    firstName,
    lastName,
    gender,
    birthSummaryLine,
    ageSummaryLine,
    country,
    discord,
    noPreviousCities,
    previousCities,
    noExperience,
    experience,
    lawsAccepted,
    lawsQuizResult,
    submitApplication,
    profile,
    isDiscordUser,
    applications,
    birthYear,
    birthMonth,
    birthDay,
    publicUser,
  ]);

  const stepIntro = (n: number, title: string, hint: string) => (
    <div className="space-y-1 pb-4 text-right">
      <p className="font-display text-xs text-muted-foreground">
        الخطوة {n} من {TOTAL_STEPS}
      </p>
      <h2 className="font-display text-xl font-bold text-foreground md:text-2xl">{title}</h2>
      <p className="text-sm text-muted-foreground">{hint}</p>
    </div>
  );

  const fieldWrap = (children: ReactNode) => (
    <div className="mx-auto w-full max-w-lg py-2">{children}</div>
  );

  const previousCitiesReview = noPreviousCities
    ? "لم يسبق لي اللعب في مدن أو سيرفرات أخرى"
    : previousCities.trim() || "—";
  const experienceReview = noExperience ? "لا توجد خبرة سابقة في الرول بلاي" : experience.trim() || "—";

  if (!roleVisible) {
    return <Navigate to="/" replace />;
  }

  if (!publicUser.user) {
    return (
      <div dir="rtl" className="relative min-h-screen overflow-hidden bg-background text-foreground antialiased">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70%_60%_at_50%_0%,hsl(350_64%_40%/0.22),transparent_70%),radial-gradient(60%_60%_at_50%_100%,hsl(6_74%_52%/0.18),transparent_70%)]" />
        <Navbar />
        <main className="relative z-10 mx-auto flex min-h-[calc(100vh-200px)] max-w-3xl flex-col items-center justify-center px-4 py-24 md:px-8">
          <div className="w-full overflow-hidden rounded-3xl border border-indigo-200/80 bg-gradient-to-l from-indigo-50 via-white to-rose-50 p-8 text-right shadow-[0_28px_70px_-30px_rgba(99,102,241,0.45)] md:p-10">
            <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-start sm:text-right">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#5865F2] text-white shadow-inner">
                <DiscordIcon className="h-8 w-8" />
              </div>
              <div className="flex-1 space-y-2">
                <p className="font-display text-[11px] font-semibold tracking-[0.32em] text-indigo-700/90">
                  تسجيل الدخول مطلوب
                </p>
                <h1 className="flex flex-wrap items-center justify-center gap-2 font-display text-2xl font-bold text-slate-900 sm:justify-start md:text-3xl">
                  <ShieldAlert className="h-6 w-6 text-indigo-600" aria-hidden />
                  سجّل الدخول للمتابعة
                </h1>
                <p className="text-sm leading-relaxed text-slate-700">
                  لا يمكن إرسال طلب التقديم بدون تسجيل الدخول. اضغط زر تسجيل الدخول في الشريط العلوي
                  واختر <span className="font-semibold">Discord</span> للمتابعة.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl border-rose-300 bg-white text-rose-700 hover:bg-rose-50"
                    onClick={() => navigate("/", { replace: true })}
                  >
                    الذهاب للصفحة الرئيسية
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (publicUser.user && !isDiscordUser) {
    return (
      <div dir="rtl" className="relative min-h-screen overflow-hidden bg-background text-foreground antialiased">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70%_60%_at_50%_0%,hsl(350_64%_40%/0.22),transparent_70%),radial-gradient(60%_60%_at_50%_100%,hsl(6_74%_52%/0.18),transparent_70%)]" />
        <Navbar />
        <main className="relative z-10 mx-auto flex min-h-[calc(100vh-200px)] max-w-3xl flex-col items-center justify-center px-4 py-24 md:px-8">
          <div className="w-full overflow-hidden rounded-3xl border border-indigo-200/80 bg-gradient-to-l from-indigo-50 via-white to-rose-50 p-8 text-right shadow-[0_28px_70px_-30px_rgba(99,102,241,0.45)] md:p-10">
            <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-start sm:text-right">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#5865F2] text-white shadow-inner">
                <DiscordIcon className="h-8 w-8" />
              </div>
              <div className="flex-1 space-y-2">
                <p className="font-display text-[11px] font-semibold tracking-[0.32em] text-indigo-700/90">
                  تسجيل الدخول مطلوب
                </p>
                <h1 className="flex flex-wrap items-center justify-center gap-2 font-display text-2xl font-bold text-slate-900 sm:justify-start md:text-3xl">
                  <ShieldAlert className="h-6 w-6 text-indigo-600" aria-hidden />
                  التقديم متاح عبر Discord فقط
                </h1>
                <p className="text-sm leading-relaxed text-slate-700">
                  للحفاظ على هويتك ومنع الازدواجية، التقديم الإلكتروني يتطلب تسجيل الدخول عبر حسابك على
                  Discord. حسابك الحالي مسجّل بطريقة محلية، لذا يُرجى تسجيل الخروج ثم الدخول من جديد عبر
                  Discord.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                  <Button
                    type="button"
                    className="rounded-xl bg-[#5865F2] text-white shadow-md hover:bg-[#4752c4]"
                    onClick={() => {
                      publicUser.logout();
                      toast.message(
                        "تم تسجيل الخروج — اضغط زر تسجيل الدخول أعلى الصفحة واختر Discord",
                      );
                      navigate("/", { replace: true });
                    }}
                  >
                    <DiscordIcon className="ms-2 h-4 w-4" />
                    تسجيل الخروج والدخول عبر Discord
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl border-rose-300 bg-white text-rose-700 hover:bg-rose-50"
                    onClick={() => navigate(target.dashboardPath)}
                  >
                    العودة إلى الجهة
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (electronicApplyBlocked) {
    return (
      <div dir="rtl" className="relative min-h-screen overflow-hidden bg-background text-foreground antialiased">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70%_60%_at_50%_0%,hsl(142_76%_36%/0.16),transparent_70%),radial-gradient(60%_60%_at_50%_100%,hsl(350_64%_40%/0.12),transparent_70%)]"
        />
        <Navbar />
        <main className="relative z-10 mx-auto flex min-h-[calc(100vh-200px)] max-w-3xl flex-col items-center justify-center px-4 py-24 md:px-8">
          <div className="w-full overflow-hidden rounded-3xl border border-emerald-200/80 bg-gradient-to-l from-emerald-50 via-white to-teal-50 p-8 text-right shadow-[0_28px_70px_-30px_rgba(16,185,129,0.35)] md:p-10">
            <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-start sm:text-right">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-inner">
                <BadgeCheck className="h-8 w-8" />
              </div>
              <div className="flex-1 space-y-2">
                <p className="font-display text-[11px] font-semibold tracking-[0.32em] text-emerald-800/90">
                  {citizenApplyApproved ? "أنت مفعّل بالفعل" : "طلبك قيد المراجعة"}
                </p>
                <h1 className="font-display text-2xl font-bold text-emerald-950 md:text-3xl">
                  {citizenApplyApproved ? "لا حاجة لإعادة التقديم الإلكتروني" : "تقديمك بانتظار الإدارة"}
                </h1>
                <p className="text-sm leading-relaxed text-emerald-900/85">
                  {citizenApplyApproved
                    ? "تم قبول تقديمك كمواطن. استخدم البروفايل والتكت للمتابعة مع الإدارة."
                    : "لديك طلب مواطن قيد المراجعة. بعد قرار الإدارة يمكنك المتابعة من البروفايل."}
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2 sm:justify-start">
                  <Button
                    type="button"
                    className="rounded-xl bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
                    onClick={() => navigate("/profile")}
                  >
                    الذهاب إلى البروفايل
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-50"
                    onClick={() => navigate(target.dashboardPath)}
                  >
                    العودة إلى الجهة
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
        <Footer />
      </div>
    );
  }

  if (isRoleClosed) {
    return (
      <div dir="rtl" className="relative min-h-screen overflow-hidden bg-background text-foreground antialiased">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70%_60%_at_50%_0%,hsl(0_72%_50%/0.18),transparent_70%),radial-gradient(60%_60%_at_50%_100%,hsl(350_64%_40%/0.18),transparent_70%)]" />
        <Navbar />
        <main className="relative z-10 mx-auto flex min-h-[calc(100vh-200px)] max-w-3xl flex-col items-center justify-center px-4 py-24 md:px-8">
          <div className="w-full overflow-hidden rounded-3xl border border-rose-200/80 bg-gradient-to-l from-rose-50 via-white to-rose-50 p-8 text-right shadow-[0_28px_70px_-30px_rgba(244,63,94,0.45)] md:p-10">
            <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-start sm:text-right">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 shadow-inner">
                <Lock className="h-8 w-8" />
              </div>
              <div className="flex-1 space-y-2">
                <p className="font-display text-[11px] font-semibold tracking-[0.32em] text-rose-700/80">
                  ملاحظة هامة
                </p>
                <h1 className="font-display text-2xl font-bold text-rose-800 md:text-3xl">
                  التقديم مغلق حالياً
                </h1>
                <p className="text-sm leading-relaxed text-rose-900/80">
                  لا يمكن إرسال طلبات جديدة لـ
                  <span className="mx-1 font-semibold text-rose-900">{target.title}</span>
                  في هذه الفترة. يُرجى المتابعة لاحقاً عند إعادة فتح التقديم.
                </p>
                {closureNote ? (
                  <div className="mt-3 rounded-xl border border-rose-200 bg-white/80 px-4 py-3 text-sm leading-relaxed text-rose-800 shadow-sm">
                    <span className="font-semibold text-rose-700">من الإدارة:</span> {closureNote}
                  </div>
                ) : null}
                <div className="mt-5 flex flex-wrap justify-center gap-2 sm:justify-start">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl border-rose-300 bg-white text-rose-700 hover:bg-rose-50"
                    onClick={() => navigate(target.dashboardPath)}
                  >
                    العودة إلى الجهة
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
        <Footer />
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground antialiased">
      <Navbar />

      <InstitutionHero
        badgeEn={target.heroEyebrow}
        alt={target.title}
        title={
          <>
            <span className="text-gradient-neon">{target.heroTitleParts[0]}</span>{" "}
            <span className="text-foreground">{target.heroTitleParts[1]}</span>
          </>
        }
      />

      <main className="pb-20">
        <section className="mx-auto w-full max-w-4xl px-4 md:px-8 xl:px-12 mt-10">
          <div className="glass-panel rounded-2xl p-5 md:p-8">
            <div className="mb-6 flex flex-col items-center gap-2 text-center md:items-end md:text-right">
              <div className="h-1 w-12 rounded-full bg-gradient-to-l from-primary to-secondary md:self-end" aria-hidden />
              <p className="max-w-2xl text-base leading-relaxed text-foreground/85">{target.subtitle}</p>
            </div>

            {submitSuccess ? (
              <div className="mx-auto max-w-lg overflow-hidden rounded-2xl border border-emerald-500/35 bg-emerald-500/[0.08] p-8 text-center backdrop-blur-sm md:p-10">
                <div className="mx-auto mb-6 flex h-28 w-28 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300 ring-4 ring-emerald-400/25">
                  <CheckCircle2 className="h-16 w-16" strokeWidth={1.5} aria-hidden />
                </div>
                <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">تم تقديم الطلب بنجاح</h2>
                <p className="mt-4 text-base leading-relaxed text-foreground/80">
                  تواصل مع الإدارة على الديسكورد لترتيب موعد المقابلة ومتابعة طلبك.
                </p>
                <div className="mt-8 flex w-full justify-center">
                  <Button
                    type="button"
                    className="h-12 w-full max-w-sm gap-2 rounded-xl bg-[#5865F2] font-display text-base text-white shadow-lg shadow-[#5865F2]/25 hover:bg-[#4752C4] sm:w-auto"
                    asChild
                  >
                    <a href={DISCORD_INVITE_URL} target="_blank" rel="noopener noreferrer">
                      <DiscordIcon className="h-6 w-6 shrink-0" />
                      فتح الديسكورد
                    </a>
                  </Button>
                </div>
              </div>
            ) : (
            <Stepper
            initialStep={1}
            onStepChange={() => {}}
            onFinalStepCompleted={handleFinal}
            validateStep={validateStep}
            stayOnLastStepAfterSubmit
            backButtonText="السابق"
            nextButtonText="التالي"
            finalButtonText={isSubmitting ? "جاري الإرسال..." : "إرسال الطلب"}
            nextButtonProps={{ disabled: isSubmitting }}
            stepCircleContainerClassName="step-circle-container--sharp"
            className="min-h-0"
          >
            <Step>
              {stepIntro(1, "الاسم الأول", "بالعربي فقط — بدون أحرف إنجليزية أو أرقام.")}
              {fieldWrap(
                <>
                  <Label htmlFor="firstName" className="font-display text-xs text-primary">
                    الاسم الأول
                  </Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="مثال: محمد"
                    className="mt-3 h-12 rounded-md border-primary/30 font-display"
                    autoComplete="given-name"
                    lang="ar"
                    dir="rtl"
                  />
                </>,
              )}
            </Step>

            <Step>
              {stepIntro(2, "اسم العائلة", "بالعربي فقط — نفس قواعد الاسم الأول.")}
              {fieldWrap(
                <>
                  <Label htmlFor="lastName" className="font-display text-xs text-primary">
                    اسم العائلة
                  </Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="مثال: العلي"
                    className="mt-3 h-12 rounded-md border-primary/30 font-display"
                    autoComplete="family-name"
                    lang="ar"
                    dir="rtl"
                  />
                </>,
              )}
            </Step>

            <Step>
              {stepIntro(3, "الجنس", "اختر أحد الخيارين للمتابعة.")}
              {fieldWrap(
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setGender("male")}
                    className={cn(
                      "min-h-[52px] rounded-md border-2 px-3 py-3 font-display text-base transition-all",
                      gender === "male"
                        ? "border-primary bg-primary/15 text-foreground shadow-[0_0_22px_hsl(var(--primary)/0.28)]"
                        : "border-primary/25 bg-background/60 text-muted-foreground hover:border-primary/45 hover:text-foreground",
                    )}
                  >
                    ذكر
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender("female")}
                    className={cn(
                      "min-h-[52px] rounded-md border-2 px-3 py-3 font-display text-base transition-all",
                      gender === "female"
                        ? "border-primary bg-primary/15 text-foreground shadow-[0_0_22px_hsl(var(--primary)/0.28)]"
                        : "border-primary/25 bg-background/60 text-muted-foreground hover:border-primary/45 hover:text-foreground",
                    )}
                  >
                    أنثى
                  </button>
                </div>,
              )}
            </Step>

            <Step>
              {stepIntro(4, "تاريخ الميلاد", "اختر اليوم والشهر والسنة — العمر 16 سنة فأكثر.")}
              {fieldWrap(
                <>
                  <div className="rounded-xl border border-primary/25 bg-card/40 p-4 shadow-inner">
                    <div dir="rtl" className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="birthYear" className="font-display text-xs text-primary">
                          السنة
                        </Label>
                        <Select value={birthYear} onValueChange={setBirthYear}>
                          <SelectTrigger
                            id="birthYear"
                            className="h-12 rounded-md border-primary/30 font-display text-right [&>span]:w-full [&>span]:text-right"
                            dir="rtl"
                          >
                            <SelectValue placeholder="السنة" />
                          </SelectTrigger>
                          <SelectContent dir="rtl" className="max-h-60">
                            {yearOptions.map((y) => (
                              <SelectItem
                                key={y}
                                value={String(y)}
                                className="cursor-pointer font-display pr-8 pl-2 text-right [&>span:first-child]:left-auto [&>span:first-child]:right-2"
                              >
                                {y}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="birthMonth" className="font-display text-xs text-primary">
                          الشهر
                        </Label>
                        <Select value={birthMonth} onValueChange={setBirthMonth}>
                          <SelectTrigger
                            id="birthMonth"
                            className="h-12 rounded-md border-primary/30 font-display text-right [&>span]:w-full [&>span]:text-right"
                            dir="rtl"
                          >
                            <SelectValue placeholder="الشهر" />
                          </SelectTrigger>
                          <SelectContent dir="rtl" className="max-h-60">
                            {ARABIC_MONTHS.map((name, i) => {
                              const value = String(i + 1);
                              return (
                                <SelectItem
                                  key={value}
                                  value={value}
                                  className="cursor-pointer font-display pr-8 pl-2 text-right [&>span:first-child]:left-auto [&>span:first-child]:right-2"
                                >
                                  {name}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="birthDay" className="font-display text-xs text-primary">
                          اليوم
                        </Label>
                        <Select value={birthDay} onValueChange={setBirthDay}>
                          <SelectTrigger
                            id="birthDay"
                            className="h-12 rounded-md border-primary/30 font-display text-right [&>span]:w-full [&>span]:text-right"
                            dir="rtl"
                          >
                            <SelectValue placeholder="اليوم" />
                          </SelectTrigger>
                          <SelectContent dir="rtl" className="max-h-60">
                            {dayOptions.map((d) => (
                              <SelectItem
                                key={d}
                                value={String(d)}
                                className="cursor-pointer font-display pr-8 pl-2 text-right [&>span:first-child]:left-auto [&>span:first-child]:right-2"
                              >
                                {d}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  {liveBirthAgeYears !== null && (
                    <p className="mt-4 text-right font-display text-sm leading-relaxed text-muted-foreground">
                      عمرك{" "}
                      <span className="text-lg font-bold tabular-nums text-gradient-neon">{liveBirthAgeYears}</span>{" "}
                      سنة
                    </p>
                  )}
                </>,
              )}
            </Step>

            <Step>
              {stepIntro(5, "الدولة", "اختر دولتك من القائمة — الافتراضي الأردن.")}
              {fieldWrap(
                <>
                  <Label htmlFor="country" className="font-display text-xs text-primary">
                    الدولة
                  </Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger
                      id="country"
                      className="mt-3 h-12 rounded-md border-primary/30 font-display text-right [&>span]:w-full [&>span]:text-right"
                      dir="rtl"
                    >
                      <SelectValue placeholder="اختر الدولة" />
                    </SelectTrigger>
                    <SelectContent dir="rtl" className="max-h-72">
                      {arabCountries.map((c) => (
                        <SelectItem
                          key={c.code}
                          value={c.code}
                          className="cursor-pointer text-right font-display pr-8 pl-2 [&>span:first-child]:left-auto [&>span:first-child]:right-2"
                        >
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>,
              )}
            </Step>

            <Step>
              {stepIntro(
                6,
                "حساب الديسكورد",
                "بياناتك مأخوذة تلقائياً من حسابك المتصل عبر Discord — لا داعي للكتابة.",
              )}
              {fieldWrap(
                <div className="mt-3 rounded-2xl border border-primary/30 bg-background/40 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#5865F2] text-white shadow-md">
                      <DiscordIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1 text-right">
                      <p className="flex items-center gap-1.5 font-display text-sm font-semibold text-foreground">
                        حسابك على Discord
                        <BadgeCheck className="h-4 w-4 text-emerald-500" aria-hidden />
                      </p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <div className="rounded-lg border border-primary/25 bg-background/60 px-3 py-2">
                          <p className="text-[11px] text-muted-foreground">الاسم على Discord</p>
                          <p className="truncate font-mono text-sm font-semibold text-foreground" dir="ltr">
                            @{profile?.username ?? "—"}
                          </p>
                        </div>
                        <div className="rounded-lg border border-primary/25 bg-background/60 px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] text-muted-foreground">Discord ID</p>
                            <IdCard className="h-3.5 w-3.5 text-primary/70" aria-hidden />
                          </div>
                          <p className="truncate font-mono text-sm font-semibold text-foreground" dir="ltr">
                            {profile?.discordId || "—"}
                          </p>
                        </div>
                      </div>
                      <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
                        إذا أردت تحديث هذه البيانات، حدّث ملفك على Discord ثم أعد تسجيل الدخول.
                      </p>
                    </div>
                  </div>
                </div>,
              )}
            </Step>

            <Step>
              {stepIntro(
                7,
                "مدن أو سيرفرات سبق لك اللعب فيها",
                "اختر إن كان لديك سجل سابق في رول بلاي، أو أن هذه تجربتك الأولى.",
              )}
              {fieldWrap(
                <OptionalNarrativeField
                  id="previousCities"
                  fieldLabel="السجل السابق"
                  value={previousCities}
                  onChange={setPreviousCities}
                  noneSelected={noPreviousCities}
                  onNoneSelectedChange={setNoPreviousCities}
                  fillOptionLabel="لدي سجل سابق"
                  noneOptionLabel="لم يسبق لي ذلك"
                  noneTitle="تجربتي الأولى في الرول بلاي"
                  noneDescription="سجّلنا أنك لم تلعب في مدن أو سيرفرات أخرى من قبل — لا حاجة لكتابة أي شيء."
                  placeholder="مثال: TRUST CFW، مدينة كذا، سيرفر كذا…"
                  rows={5}
                />,
              )}
            </Step>

            <Step>
              {stepIntro(
                8,
                "نبذة عن الخبرة",
                "شاركنا دوافع انضمامك وخلفيتك في الرول بلاي، أو اختر أنك مبتدئ بدون خبرة سابقة.",
              )}
              {fieldWrap(
                <OptionalNarrativeField
                  id="experience"
                  fieldLabel="النبذة"
                  value={experience}
                  onChange={setExperience}
                  noneSelected={noExperience}
                  onNoneSelectedChange={setNoExperience}
                  fillOptionLabel="أريد كتابة نبذة"
                  noneOptionLabel="لا توجد خبرة سابقة"
                  noneTitle="لا توجد خبرة سابقة بعد"
                  noneDescription="سجّلنا أنك مبتدئ في الرول بلاي — يمكنك المتابعة دون كتابة نبذة."
                  placeholder="لماذا تريد الانضمام؟ ما أدوارك أو تجاربك السابقة في الرول بلاي؟"
                  rows={6}
                />,
              )}
            </Step>

            <Step>
              {stepIntro(
                9,
                "القوانين",
                "يجب فتح نافذة القوانين والإقرار بالاطلاع قبل المراجعة النهائية.",
              )}
              <div className="mt-4 space-y-4">
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 w-full border-primary/40 font-display text-base hover:bg-primary/10"
                  onClick={() => setLawsDialogOpen(true)}
                >
                  قراءة القوانين
                </Button>
                {lawsAccepted && lawsQuizResult?.passed ? (
                  <p className="text-center text-sm text-success">تم تأكيد قراءة القوانين واجتياز الأسئلة.</p>
                ) : lawsAccepted && lawsQuizResult && !lawsQuizResult.passed ? (
                  <p className="text-center text-sm text-amber-600">
                    أُرسلت إجاباتك للمراجع — النتيجة: {lawsQuizResult.correctCount} من {lawsQuizResult.totalQuestions}
                  </p>
                ) : (
                  <p className="text-center text-xs text-muted-foreground">
                    لن يُسمح بالانتقال للخطوة التالية حتى تؤكد الاطلاع من النافذة.
                  </p>
                )}
              </div>
              <LawsReaderDialog
                open={lawsDialogOpen}
                onOpenChange={setLawsDialogOpen}
                onAccept={(result) => {
                  setLawsAccepted(true);
                  setLawsQuizResult(result);
                }}
              />
            </Step>

            <Step>
              {stepIntro(10, "مراجعة الطلب", "تأكد من صحة البيانات ثم أرسل.")}
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <SummaryRow label="الاسم الأول" value={firstName} />
                <SummaryRow label="اسم العائلة" value={lastName} />
                <SummaryRow label="الجنس" value={genderLabel(gender)} />
                <SummaryRow label="تاريخ الميلاد" value={birthSummaryLine} />
                <SummaryRow label="العمر" value={ageSummaryLine} />
                <SummaryRow label="الدولة" value={getArabCountryLabel(country)} />
                <SummaryRow label="ديسكورد" value={discord} />
              </div>
              <div className="mt-4 rounded-lg border border-primary/25 bg-background/50 p-4 text-right">
                <span className="font-display text-[11px] tracking-wide text-primary">مدن / سيرفرات لعبت بها سابقًا</span>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{previousCitiesReview}</p>
              </div>
              <div className="mt-4 rounded-lg border border-primary/25 bg-background/50 p-4 text-right">
                <span className="font-display text-[11px] tracking-wide text-primary">نبذة الخبرة</span>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{experienceReview}</p>
              </div>
              </Step>
            </Stepper>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default ApplicationFormPage;
