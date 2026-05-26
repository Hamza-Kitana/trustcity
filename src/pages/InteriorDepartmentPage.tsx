import { Navigate, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { InstitutionLawsPlaceholder } from "@/components/InstitutionLawsPlaceholder";
import { InstitutionClosedBanner } from "@/components/InstitutionClosedBanner";
import { InteriorMinistryNav } from "@/components/InteriorMinistryNav";
import InstitutionHero from "@/components/InstitutionHero";
import { InstitutionRoster } from "@/components/InstitutionRoster";
import { useInstitutionRoster } from "@/contexts/InstitutionRostersContentContext";
import type { InstitutionBranchId } from "@/data/institutionBranches";
import type { JobRoleKey } from "@/data/jobRoleLaws";
import { Eye, Fingerprint, Shield, Siren, Users } from "lucide-react";
import type { ReactNode } from "react";
import { useSiteVisibility } from "@/lib/siteVisibility";

type DeptKey = "police" | "sheriff" | "cia" | "marines" | "fpi";

type DeptConfig = {
  branchId: InstitutionBranchId;
  badgeEn: string;
  title: ReactNode;
  alt: string;
  leaderBadge: string;
  deputyBadge: string;
  leadershipIntro: string;
  membersTitle: string;
  membersSubtitle: string;
  cards: { icon: typeof Shield; title: string; body: string }[];
  lawsPlaceholderLabel: string;
  jobRoleKey: JobRoleKey;
};

const DEPT_CONFIG: Record<DeptKey, DeptConfig> = {
  police: {
    branchId: "interior_police",
    badgeEn: "LSPD — POLICE",
    title: (
      <>
        <span className="text-gradient-neon">الشرطة</span>
      </>
    ),
    alt: "الشرطة — TRUST CFW",
    leaderBadge: "قائد الشرطة",
    deputyBadge: "نائب القائد",
    leadershipIntro: "قائد الشرطة ونائبه، ثم ضباط وأعضاء LSPD في الشبكة أدناه.",
    membersTitle: "ضباط وأعضاء الشرطة",
    membersSubtitle: "شبكة تفاعلية — مرّر المؤشر لإظهار التفاصيل بوضوح.",
    cards: [
      {
        icon: Siren,
        title: "غرفة العمليات",
        body: "تنسيق البلاغات والمطاردات مع توزيع وحدات الاستجابة.",
      },
      {
        icon: Shield,
        title: "الأنظمة والانضباط",
        body: "قوانين السلوك، المخالفات، وإجراءات المساءلة الداخلية.",
      },
      {
        icon: Users,
        title: "الرتب والتدريب",
        body: "مسار واضح للترقيات وبرامج تدريب للضباط الجدد.",
      },
    ],
    lawsPlaceholderLabel: "الشرطة",
    jobRoleKey: "police",
  },
  sheriff: {
    branchId: "interior_sheriff",
    badgeEn: "SHERIFF — COUNTY",
    title: (
      <>
        <span className="text-gradient-neon">الشيرف</span>
      </>
    ),
    alt: "الشيرف — TRUST CFW",
    leaderBadge: "قائد الشيرف",
    deputyBadge: "نائب الشيرف",
    leadershipIntro: "قيادة الشيرف ونائبها، ثم أعضاء وحدة المقاطعة في الشبكة أدناه.",
    membersTitle: "أعضاء الشيرف",
    membersSubtitle: "دوريات ريفية وطرق — حرك المؤشر داخل الشبكة للتفاصيل.",
    cards: [
      {
        icon: Shield,
        title: "الدوريات الخارجية",
        body: "تغطية الطرق السريعة والمناطق النائية والكمائن.",
      },
      {
        icon: Siren,
        title: "التكتيك والـ SWAT",
        body: "دعم العمليات الثقيلة والتنسيق مع الشرطة الحضرية.",
      },
      {
        icon: Users,
        title: "السجون والنقل",
        body: "إجراءات التوقيف والنقل تحت الحراسة وفق اللائحة.",
      },
    ],
    lawsPlaceholderLabel: "الشيرف",
    jobRoleKey: "interior_sheriff",
  },
  cia: {
    branchId: "interior_cia",
    badgeEn: "CIA — INTELLIGENCE",
    title: (
      <>
        <span className="text-gradient-neon">CIA</span>
      </>
    ),
    alt: "CIA — TRUST CFW",
    leaderBadge: "مدير الاستخبارات",
    deputyBadge: "نائب المدير",
    leadershipIntro: "مدير الجهاز ونائبه، ثم فريق الاستخبارات في الشبكة أدناه.",
    membersTitle: "فريق الاستخبارات",
    membersSubtitle: "مصادر وتحليل — استكشف الشبكة التفاعلية للأعضاء.",
    cards: [
      {
        icon: Eye,
        title: "جمع المعلومات",
        body: "مصادر بشرية وتقنية وتحليل تهديدات قبل التصعيد.",
      },
      {
        icon: Shield,
        title: "العمليات الخاصة",
        body: "مهام سرية بالتنسيق مع الأذرع التنفيذية عند الاقتضاء.",
      },
      {
        icon: Users,
        title: "غرفة التحليل",
        body: "ربط البيانات مع غرف عمليات الشرطة والمارينز.",
      },
    ],
    lawsPlaceholderLabel: "CIA",
    jobRoleKey: "interior_cia",
  },
  marines: {
    branchId: "interior_marines",
    badgeEn: "MARINES — USMC",
    title: (
      <>
        <span className="text-gradient-neon">المارينز</span>
      </>
    ),
    alt: "المارينز — TRUST CFW",
    leaderBadge: "قائد الكتيبة",
    deputyBadge: "نائب القائد",
    leadershipIntro: "قائد المارينز ونائبه، ثم أفراد الكتيبة في الشبكة أدناه.",
    membersTitle: "أفراد المارينز",
    membersSubtitle: "تكتيك واستجابة — تفاعل مع بطاقات الأعضاء في الشبكة.",
    cards: [
      {
        icon: Shield,
        title: "العمليات العسكرية",
        body: "تأمين المنشآت والتدخل في الأزمات عالية الخطورة.",
      },
      {
        icon: Siren,
        title: "الدعم السريع",
        body: "تنسيق مع CIA والشرطة في العمليات المشتركة.",
      },
      {
        icon: Users,
        title: "التدريب والجاهزية",
        body: "مناورات دورية وصيانة جاهزية الوحدات.",
      },
    ],
    lawsPlaceholderLabel: "المارينز",
    jobRoleKey: "interior_marines",
  },
  fpi: {
    branchId: "interior_fpi",
    badgeEn: "FPI — FEDERAL INVESTIGATIONS",
    title: (
      <>
        <span className="text-gradient-neon">FPI</span>
      </>
    ),
    alt: "FPI — TRUST CFW",
    leaderBadge: "قائد FPI",
    deputyBadge: "نائب قائد FPI",
    leadershipIntro: "قيادة وحدة FPI ونائبها، ثم الوكلاء والمحققون في الشبكة أدناه.",
    membersTitle: "وكلاء ومحققو FPI",
    membersSubtitle: "تحقيقات، أدلة، وتنسيق مع الشرطة والادعاء — مرّر المؤشر للتفاصيل.",
    cards: [
      {
        icon: Fingerprint,
        title: "غرفة التحقيق",
        body: "متابعة القضايا المعقّدة وسلسلة الأدلة والشهود.",
      },
      {
        icon: Shield,
        title: "التنسيق الوزاري",
        body: "ربط الملفات مع LSPD والشيرف والادعاء عند الحاجة.",
      },
      {
        icon: Users,
        title: "فرق الاختصاص",
        body: "توزيع القضايا حسب نوع الجريمة والخبرة الميدانية.",
      },
    ],
    lawsPlaceholderLabel: "FPI",
    jobRoleKey: "interior_fpi",
  },
};

const InteriorDepartmentPage = () => {
  const { dept } = useParams();
  const deptKey = dept && dept in DEPT_CONFIG ? (dept as DeptKey) : null;
  const visibility = useSiteVisibility();
  const firstVisibleDept =
    (Object.keys(DEPT_CONFIG) as DeptKey[]).find((k) => visibility.institutions[DEPT_CONFIG[k].branchId]) ??
    "police";
  const effectiveDeptKey = deptKey && visibility.institutions[DEPT_CONFIG[deptKey].branchId] ? deptKey : firstVisibleDept;
  const roster = useInstitutionRoster(DEPT_CONFIG[effectiveDeptKey].branchId);

  if (deptKey && !visibility.institutions[DEPT_CONFIG[deptKey].branchId]) {
    return <Navigate to={`/interior/${firstVisibleDept}`} replace />;
  }

  if (!deptKey) {
    return <Navigate to={`/interior/${firstVisibleDept}`} replace />;
  }

  const cfg = DEPT_CONFIG[deptKey];

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground antialiased">
      <Navbar />
      <InstitutionHero badgeEn={cfg.badgeEn} alt={cfg.alt} title={cfg.title} />
      <InteriorMinistryNav />
      <main className="pb-20">
        <InstitutionClosedBanner branchId={cfg.branchId} organizationLabel={cfg.lawsPlaceholderLabel} />
        <section className="w-full px-4 md:px-8 xl:px-12 mt-10">
          <InstitutionRoster
            {...roster}
            leaderBadge={cfg.leaderBadge}
            deputyBadge={cfg.deputyBadge}
            leadershipIntro={cfg.leadershipIntro}
            membersTitle={cfg.membersTitle}
            membersSubtitle={cfg.membersSubtitle}
            chromaRadius={560}
          />
        </section>

        <section className="w-full px-4 md:px-8 xl:px-12 mt-10 grid md:grid-cols-3 gap-5">
          {cfg.cards.map((c) => (
            <div key={c.title} className="glass-panel rounded-xl p-6">
              <c.icon className="h-8 w-8 text-primary" />
              <h3 className="mt-4 font-display text-2xl">{c.title}</h3>
              <p className="mt-2 text-muted-foreground">{c.body}</p>
            </div>
          ))}
        </section>

        <InstitutionLawsPlaceholder organizationLabel={cfg.lawsPlaceholderLabel} jobRoleKey={cfg.jobRoleKey} />
      </main>
      <Footer />
    </div>
  );
};

export default InteriorDepartmentPage;
