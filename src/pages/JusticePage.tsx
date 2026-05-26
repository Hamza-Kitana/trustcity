import { useLayoutEffect } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useReducedMotion } from "framer-motion";
import { BookOpen, Gavel, Scale } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { InstitutionLawsPlaceholder } from "@/components/InstitutionLawsPlaceholder";
import { InstitutionClosedBanner } from "@/components/InstitutionClosedBanner";
import InstitutionHero from "@/components/InstitutionHero";
import { InstitutionRoster } from "@/components/InstitutionRoster";
import { useInstitutionRoster } from "@/contexts/InstitutionRostersContentContext";
import { useSiteVisibility } from "@/lib/siteVisibility";

const JusticePage = () => {
  const lawyerRoster = useInstitutionRoster("justice_lawyers");
  const visibility = useSiteVisibility();
  const location = useLocation();
  const reduceMotion = useReducedMotion();

  useLayoutEffect(() => {
    if (location.hash !== "#lawyers") return;
    const el = document.getElementById("lawyers");
    if (!el) return;
    el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  }, [location.hash, location.pathname, reduceMotion]);

  if (!visibility.institutions.justice_lawyers) return <Navigate to="/" replace />;

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground antialiased">
      <Navbar />

      <InstitutionHero
        badgeEn="MINISTRY OF JUSTICE"
        alt="وزارة العدل — TRUST CFW"
        title={
          <>
            صفحة <span className="text-gradient-neon">وزارة العدل</span>
          </>
        }
      />

      <main className="pb-20">
        <InstitutionClosedBanner branchId="justice_lawyers" organizationLabel="هيئة المحاماة — وزارة العدل" />
        <section id="lawyers" className="scroll-mt-28 w-full px-4 md:px-8 xl:px-12 mt-10">
          <InstitutionRoster
            {...lawyerRoster}
            leaderBadge="رئيس هيئة المحاماة"
            deputyBadge="نائب رئيس الهيئة"
            leadershipIntro="رئيس هيئة المحاماة ونائبه تحت مظلة وزارة العدل، ثم شبكة المحامين والمحاميات أدناه."
            membersTitle="المحامون والمحاميات"
            membersSubtitle="حرك المؤشر داخل الشبكة لإبراز بطاقات الأعضاء بوضوح."
            chromaRadius={560}
          />
        </section>

        <section className="w-full px-4 md:px-8 xl:px-12 mt-10 grid md:grid-cols-3 gap-5">
          <div className="glass-panel rounded-xl p-6">
            <Scale className="h-8 w-8 text-primary" />
            <h3 className="mt-4 font-display text-2xl">السيادة القانونية</h3>
            <p className="mt-2 text-muted-foreground">
              تطبيق اللوائح بشكل متساوٍ على الجميع، وتمثيل الدولة في الجلسات والمرافعات وفق أصول الرول بلاي.
            </p>
          </div>
          <div className="glass-panel rounded-xl p-6">
            <Gavel className="h-8 w-8 text-secondary" />
            <h3 className="mt-4 font-display text-2xl">القضاء والإجراءات</h3>
            <p className="mt-2 text-muted-foreground">
              مسارات واضحة للقضايا، الغرامات، والاستئناف — بالتنسيق مع القطاعات الأمنية عند الحاجة.
            </p>
          </div>
          <Link
            to="/laws"
            className="glass-panel group block rounded-xl border border-primary/25 p-6 transition-all hover:border-primary/45 hover:shadow-[0_16px_48px_-20px_hsl(var(--primary)/0.25)]"
          >
            <BookOpen className="h-8 w-8 text-accent transition-transform group-hover:scale-105" />
            <h3 className="mt-4 font-display text-2xl">دستور المدينة</h3>
            <p className="mt-2 text-muted-foreground">
              الاطلاع على القوانين المعتمدة كاملةً مع البحث والتبويبات — انقر للانتقال.
            </p>
            <span className="mt-4 inline-flex font-display text-sm font-semibold text-primary group-hover:underline">
              عرض القوانين كاملةً
            </span>
          </Link>
        </section>

        <InstitutionLawsPlaceholder organizationLabel="وزارة العدل (اللائحة التنظيمية)" jobRoleKey="lawyer" />
      </main>

      <Footer />
    </div>
  );
};

export default JusticePage;
