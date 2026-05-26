import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { InstitutionLawsPlaceholder } from "@/components/InstitutionLawsPlaceholder";
import { InstitutionClosedBanner } from "@/components/InstitutionClosedBanner";
import InstitutionHero from "@/components/InstitutionHero";
import { InstitutionRoster } from "@/components/InstitutionRoster";
import { useInstitutionRoster } from "@/contexts/InstitutionRostersContentContext";
import { Eye, FileCheck2, Scale } from "lucide-react";
import { Navigate } from "react-router-dom";
import { useSiteVisibility } from "@/lib/siteVisibility";

const OversightPage = () => {
  const roster = useInstitutionRoster("oversight");
  const visibility = useSiteVisibility();
  if (!visibility.institutions.oversight) return <Navigate to="/" replace />;

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground antialiased">
      <Navbar />
      <InstitutionHero
        badgeEn="OVERSIGHT"
        alt="الرقابة — TRUST CFW"
        title={
          <>
            صفحة <span className="text-gradient-neon">الرقابة</span>
          </>
        }
      />
      <main className="pb-20">
        <InstitutionClosedBanner branchId="oversight" organizationLabel="مؤسسة الرقابة" />
        <section className="w-full px-4 md:px-8 xl:px-12 mt-10">
          <InstitutionRoster
            {...roster}
            membersTitle="أعضاء الرقابة"
            membersSubtitle="فريق التدقيق والمراجعة الميدانية."
            chromaRadius={560}
          />
        </section>

        <section className="w-full px-4 md:px-8 xl:px-12 mt-10 grid md:grid-cols-3 gap-5">
          <div className="glass-panel rounded-xl p-6">
            <Eye className="h-8 w-8 text-primary" />
            <h3 className="mt-4 font-display text-2xl">مراقبة الأداء</h3>
            <p className="mt-2 text-muted-foreground">متابعة مؤشرات الأداء والتأكد من الالتزام بالمعايير.</p>
          </div>
          <div className="glass-panel rounded-xl p-6">
            <FileCheck2 className="h-8 w-8 text-secondary" />
            <h3 className="mt-4 font-display text-2xl">تدقيق التقارير</h3>
            <p className="mt-2 text-muted-foreground">مراجعة التقارير اليومية والتأكد من صحة الإجراءات.</p>
          </div>
          <div className="glass-panel rounded-xl p-6">
            <Scale className="h-8 w-8 text-accent" />
            <h3 className="mt-4 font-display text-2xl">سياسات عادلة</h3>
            <p className="mt-2 text-muted-foreground">تطبيق المساءلة والعدالة على الجميع بنفس المعايير.</p>
          </div>
        </section>

        <InstitutionLawsPlaceholder organizationLabel="الرقابة" jobRoleKey="oversight" />
      </main>
      <Footer />
    </div>
  );
};

export default OversightPage;
