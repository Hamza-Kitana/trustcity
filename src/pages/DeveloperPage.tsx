import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { InstitutionLawsPlaceholder } from "@/components/InstitutionLawsPlaceholder";
import { InstitutionClosedBanner } from "@/components/InstitutionClosedBanner";
import InstitutionHero from "@/components/InstitutionHero";
import { InstitutionRoster } from "@/components/InstitutionRoster";
import { useInstitutionRoster } from "@/contexts/InstitutionRostersContentContext";
import { Code2, Cpu, ShieldCheck } from "lucide-react";
import { Navigate } from "react-router-dom";
import { useSiteVisibility } from "@/lib/siteVisibility";

const DeveloperPage = () => {
  const roster = useInstitutionRoster("developer");
  const visibility = useSiteVisibility();
  if (!visibility.institutions.developer) return <Navigate to="/" replace />;

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground antialiased">
      <Navbar />
      <InstitutionHero
        badgeEn="DEVELOPER TEAM"
        alt="المبرمجين — TRUST CFW"
        title={
          <>
            صفحة <span className="text-gradient-neon">المبرمجين</span>
          </>
        }
      />
      <main className="pb-20">
        <InstitutionClosedBanner branchId="developer" organizationLabel="مؤسسة المبرمجين" />
        <section className="w-full px-4 md:px-8 xl:px-12 mt-10">
          <InstitutionRoster
            {...roster}
            membersTitle="فريق التطوير"
            membersSubtitle="سكربت، واجهات، وبنية تحتية في شبكة تفاعلية."
            chromaRadius={560}
          />
        </section>

        <section className="w-full px-4 md:px-8 xl:px-12 mt-10 grid md:grid-cols-3 gap-5">
          <div className="glass-panel rounded-xl p-6"><Code2 className="h-8 w-8 text-primary" /><h3 className="mt-4 font-display text-2xl">تطوير</h3></div>
          <div className="glass-panel rounded-xl p-6"><Cpu className="h-8 w-8 text-secondary" /><h3 className="mt-4 font-display text-2xl">أداء</h3></div>
          <div className="glass-panel rounded-xl p-6"><ShieldCheck className="h-8 w-8 text-accent" /><h3 className="mt-4 font-display text-2xl">أمان</h3></div>
        </section>

        <InstitutionLawsPlaceholder organizationLabel="المبرمجين" jobRoleKey="developer" />
      </main>
      <Footer />
    </div>
  );
};

export default DeveloperPage;
