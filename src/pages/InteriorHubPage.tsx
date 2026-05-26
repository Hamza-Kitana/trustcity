import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { InstitutionLawsPlaceholder } from "@/components/InstitutionLawsPlaceholder";
import { InteriorMinistryNav } from "@/components/InteriorMinistryNav";
import InstitutionHero from "@/components/InstitutionHero";
import { InstitutionRoster } from "@/components/InstitutionRoster";
import { useInstitutionRoster } from "@/contexts/InstitutionRostersContentContext";
import { Anchor, BadgeCheck, Eye, Fingerprint, Shield, ChevronLeft } from "lucide-react";
import { useSiteVisibility } from "@/lib/siteVisibility";

const departments: {
  to: string;
  title: string;
  desc: string;
  icon: typeof Shield;
}[] = [
  {
    to: "/interior/police",
    title: "الشرطة",
    desc: "LSPD — دوريات حضرية، بلاغات، وغرفة عمليات الشرطة.",
    icon: Shield,
  },
  {
    to: "/interior/sheriff",
    title: "الشيرف",
    desc: "Sheriff — مقاطعة، طرق سريعة، وتكتيك ميداني مع الشرطة.",
    icon: BadgeCheck,
  },
  {
    to: "/interior/cia",
    title: "CIA",
    desc: "استخبارات — جمع معلومات، تحليل تهديدات، وعمليات سرية.",
    icon: Eye,
  },
  {
    to: "/interior/marines",
    title: "المارينز",
    desc: "قوات مشاة بحرية — أزمات عسكرية، تأمين، ودعم عالي الخطورة.",
    icon: Anchor,
  },
  {
    to: "/interior/fpi",
    title: "FPI",
    desc: "تحقيقات فدرالية — قضايا معقّدة، أدلة، وتنسيق مع الادعاء.",
    icon: Fingerprint,
  },
];

const InteriorHubPage = () => {
  const visibility = useSiteVisibility();
  const overviewRoster = useInstitutionRoster("interior_hub");
  const visibleDepartments = departments.filter((d) => {
    if (d.to === "/interior/police") return visibility.institutions.interior_police;
    if (d.to === "/interior/sheriff") return visibility.institutions.interior_sheriff;
    if (d.to === "/interior/cia") return visibility.institutions.interior_cia;
    if (d.to === "/interior/marines") return visibility.institutions.interior_marines;
    if (d.to === "/interior/fpi") return visibility.institutions.interior_fpi;
    return true;
  });

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground antialiased">
      <Navbar />
      <InstitutionHero
        badgeEn="MINISTRY OF INTERIOR"
        alt="وزارة الداخلية — TRUST CFW"
        title={
          <>
            <span className="text-gradient-neon">وزارة</span>{" "}
            <span className="text-foreground">الداخلية</span>
          </>
        }
      />
      <InteriorMinistryNav />
      <main className="pb-20">
        <section className="w-full px-4 md:px-8 xl:px-12 mt-10">
          <InstitutionRoster
            {...overviewRoster}
            leaderBadge="وزير الداخلية"
            deputyBadge="نائب وزير الداخلية"
            leadershipIntro="القيادة العليا لوزارة الداخلية؛ يتفرع منها خمسة أذرع تشغيلية — لكل منها صفحة مستقلة أدناه."
            membersTitle=""
            membersSubtitle=""
            chromaRadius={560}
          />
        </section>

        <section className="w-full px-4 md:px-8 xl:px-12 mt-14">
          <div className="mb-8 text-right">
            <h2 className="font-display text-2xl font-bold md:text-3xl">
              أذرع <span className="text-gradient-neon">الوزارة</span>
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              اختر الجهاز للاطلاع على الهيكل القيادي وشبكة الأعضاء لكل فرع.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {visibleDepartments.map(({ to, title, desc, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="group glass-panel relative overflow-hidden rounded-2xl border border-primary/20 p-6 transition-all hover:border-primary/45 hover:shadow-[0_20px_50px_-24px_hsl(var(--primary)/0.35)]"
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-primary via-secondary/60 to-transparent opacity-90" />
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <Icon className="h-6 w-6" />
                  </div>
                  <ChevronLeft className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-1 group-hover:text-primary" />
                </div>
                <h3 className="mt-5 font-display text-xl font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
              </Link>
            ))}
          </div>
        </section>

        <InstitutionLawsPlaceholder organizationLabel="وزارة الداخلية" jobsHubFallback />
      </main>
      <Footer />
    </div>
  );
};

export default InteriorHubPage;
