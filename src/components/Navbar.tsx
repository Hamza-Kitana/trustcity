import { type FormEvent, useEffect, useRef, useState } from "react";
import {
  Menu,
  X,
  Lock,
  ChevronDown,
  Volume2,
  VolumeX,
  LayoutDashboard,
  UserCircle2,
  Shield,
  Sparkles,
  MessageSquareMore,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useOptionalHeroBackgroundVideo } from "@/contexts/HeroBackgroundVideoContext";
import { getPostLoginDashboardPath, useAuth } from "@/contexts/AuthContext";
import { useApplicationsContent } from "@/contexts/ApplicationsContentContext";
import { usePublicUser } from "@/contexts/PublicUserContext";
import { useInstitutionRostersContent } from "@/contexts/InstitutionRostersContentContext";
import { DiscordIcon } from "@/components/DiscordIcon";
import { isDiscordOAuthConfigured, startDiscordLogin } from "@/lib/discordOAuth";
import { useSiteVisibility } from "@/lib/siteVisibility";
import { useTicketsCenter } from "@/lib/ticketsCenter";
import {
  isPublicTicketsUnlocked,
  MSG_TICKETS_NEED_CITY_PROFILE,
  isCitizenApplyFormBlocked,
} from "@/lib/publicProfileEligibility";
import { NotificationsBell } from "@/components/NotificationsBell";

const institutionLinks = [
  { label: "وزارة الصحة", to: "/health" },
  { label: "وزارة الداخلية", to: "/interior" },
  { label: "الرقابة", to: "/oversight" },
  { label: "وزارة العدل", to: "/justice" },
  { label: "المبرمجين", to: "/developer" },
];

function institutionLinkActive(pathname: string, to: string) {
  if (to === "/interior") return pathname === "/interior" || pathname.startsWith("/interior/");
  return pathname === to;
}

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, canUseDashboard } = useAuth();
  const publicUser = usePublicUser();
  const { applications } = useApplicationsContent();
  const { findMembershipForUser } = useInstitutionRostersContent();
  /** عضوية المستخدم الحالي (إن وُجدت) — تحدد إذا كان قائداً/نائباً يحتاج لوحة قيادة */
  const myMembership = findMembershipForUser(publicUser.user?.id);
  const tickets = useTicketsCenter();
  const [staffUser, setStaffUser] = useState("");
  const [staffPass, setStaffPass] = useState("");
  const [staffLoginVisible, setStaffLoginVisible] = useState(false);
  const staffUserRef = useRef<HTMLInputElement>(null);
  const staffPassRef = useRef<HTMLInputElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [institutionsOpen, setInstitutionsOpen] = useState(false);
  const [publicMenuOpen, setPublicMenuOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const heroBgVideo = useOptionalHeroBackgroundVideo();
  const visibility = useSiteVisibility();
  const canShowInterior =
    visibility.institutions.interior_police ||
    visibility.institutions.interior_sheriff ||
    visibility.institutions.interior_cia ||
    visibility.institutions.interior_marines ||
    visibility.institutions.interior_fpi;
  const visibleInstitutionLinks = institutionLinks.filter((item) => {
    if (item.to === "/health") return visibility.institutions.health;
    if (item.to === "/interior") return canShowInterior;
    if (item.to === "/oversight") return visibility.institutions.oversight;
    if (item.to === "/justice") return visibility.institutions.justice_lawyers;
    if (item.to === "/developer") return visibility.institutions.developer;
    return true;
  });
  const hideApplyNowForPublicProfile = !!publicUser.user && (location.pathname === "/profile" || location.pathname === "/tickets");
  const discordPublicProfile =
    publicUser.user?.authProvider === "discord" ? publicUser.getProfile() : null;
  const hideCitizenApplyForOnboardedUser =
    !!discordPublicProfile && isCitizenApplyFormBlocked(discordPublicProfile, applications);
  const showPublicApplyButton = !hideApplyNowForPublicProfile && !hideCitizenApplyForOnboardedUser;
  /** صفحات بخلفية فاتحة — يتغيّر معها لون شريط التنقّل عند التمرير */
  const isLightSurface = (() => {
    const lightPaths = ["/profile", "/tickets", "/jobs", "/apply/streamers"];
    return lightPaths.some((p) => location.pathname === p || location.pathname.startsWith(`${p}/`));
  })();
  /** نوحّد لون علامة TRUST مع لون السطح حتى تظل واضحة فوق الخلفيات الفاتحة */
  const useLightBrandText = isLightSurface;
  /** لون النص للروابط غير النشطة — أغمق على الخلفيات الفاتحة لقابلية القراءة */
  const navInactiveTextCls = isLightSurface
    ? "text-slate-800 hover:text-primary"
    : "text-muted-foreground hover:text-primary";
  /** زر دائري/مستطيل في الناڤبار (الجرس + قائمة المستخدم) — يتكيّف مع لون الخلفية */
  const navTriggerButtonCls = isLightSurface
    ? "border-rose-300 bg-white text-rose-700 hover:bg-rose-50"
    : "border-primary/30 bg-background/40 text-foreground backdrop-blur-md hover:bg-primary/15 hover:border-primary/50";

  const publicUnreadTickets = (() => {
    if (!publicUser.user) return 0;
    const uid = publicUser.user.id;
    let total = 0;
    for (const ticket of tickets) {
      if (!(ticket.openedById === uid || ticket.openedBy === publicUser.user.username || ticket.openedBy === publicUser.user.displayName))
        continue;
      const cutoff = ticket.lastPublicReadAt ? new Date(ticket.lastPublicReadAt).getTime() : 0;
      const hasUnread = ticket.messages.some(
        (m) => (m.senderType ?? "public") === "staff" && new Date(m.at).getTime() > cutoff,
      );
      if (hasUnread) total += 1;
    }
    return total;
  })();

  const goToPublicTickets = () => {
    const profile = publicUser.getProfile();
    if (!isPublicTicketsUnlocked(profile, applications)) {
      toast.message(MSG_TICKETS_NEED_CITY_PROFILE);
      navigate("/profile");
      return;
    }
    navigate("/tickets");
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setInstitutionsOpen(false);
    setOpen(false);
    setPublicMenuOpen(false);
  }, [location.pathname]);

  return (
    <>
      <header
        dir="rtl"
        className={`fixed inset-x-0 top-0 z-[100] py-3 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] transition-[background-color,border-color,box-shadow,backdrop-filter] duration-500 sm:py-4 sm:pt-[calc(env(safe-area-inset-top,0px)+1rem)] ${
          scrolled
            ? isLightSurface
              ? "border-b border-rose-300/45 bg-gradient-to-l from-rose-100/75 via-white/72 to-red-50/78 shadow-[0_10px_36px_-18px_rgba(159,18,57,0.35)] backdrop-blur-xl supports-[backdrop-filter]:from-rose-100/65 supports-[backdrop-filter]:via-white/60 supports-[backdrop-filter]:to-red-50/68"
              : "border-b border-primary/20 bg-background/70 backdrop-blur-xl"
            : "border-b border-transparent bg-transparent"
        }`}
      >
        {/* z أعلى من شريط الصوت (z-110) حتى دروبداون المؤسسات والروابط تُنقَط فوقه */}
        <div className="relative z-[120] flex w-full min-w-0 items-center justify-between gap-2 pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] sm:gap-4 md:px-8 xl:px-12">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Link to="/" className="group inline-block shrink-0 leading-none" aria-label="العودة للرئيسية">
              <img
                src="/trustLogo.png"
                alt="TRUST CFW Logo"
                className="h-9 w-9 object-contain drop-shadow-[0_0_22px_hsl(var(--primary)/0.95)] sm:h-10 sm:w-10"
                loading="eager"
              />
            </Link>
            <div className="min-w-0 leading-tight">
              <div
                className={`truncate font-latin-display text-sm font-bold tracking-widest sm:text-base ${
                  useLightBrandText ? "text-slate-900" : "text-white"
                }`}
              >
                TRUST
              </div>
              <div className="-mt-1 font-latin-display text-[9px] tracking-[0.28em] text-primary sm:text-[10px] sm:tracking-[0.3em]">
                C F W
              </div>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-6">
            <Link
              to="/"
              className={`relative font-body font-medium text-sm transition-colors after:absolute after:bottom-[-6px] after:right-0 after:h-px after:bg-primary after:transition-all ${
                location.pathname === "/"
                  ? "text-primary after:w-full"
                  : `${navInactiveTextCls} after:w-0 hover:after:w-full`
              }`}
            >
              الرئيسية
            </Link>
            <Link
              to="/contact"
              className={`relative font-body font-medium text-sm transition-colors after:absolute after:bottom-[-6px] after:right-0 after:h-px after:bg-primary after:transition-all ${
                location.pathname === "/contact"
                  ? "text-primary after:w-full"
                  : `${navInactiveTextCls} after:w-0 hover:after:w-full`
              }`}
            >
              من نحن
            </Link>
            {visibility.pages.laws ? (
              <Link
                to="/laws"
                className={`relative font-body font-medium text-sm transition-colors after:absolute after:bottom-[-6px] after:right-0 after:h-px after:bg-primary after:transition-all ${
                  location.pathname === "/laws"
                    ? "text-primary after:w-full"
                    : `${navInactiveTextCls} after:w-0 hover:after:w-full`
                }`}
              >
                القوانين
              </Link>
            ) : null}
            {visibility.pages.streamers ? (
              <Link
                to="/streamers"
                className={`relative font-body font-medium text-sm transition-colors after:absolute after:bottom-[-6px] after:right-0 after:h-px after:bg-primary after:transition-all ${
                  location.pathname === "/streamers"
                    ? "text-primary after:w-full"
                    : `${navInactiveTextCls} after:w-0 hover:after:w-full`
                }`}
              >
                صنّاع المحتوى
              </Link>
            ) : null}
            {visibility.pages.gangs ? (
              <Link
                to="/gangs"
                className={`relative font-body font-medium text-sm transition-colors after:absolute after:bottom-[-6px] after:right-0 after:h-px after:bg-primary after:transition-all ${
                  location.pathname === "/gangs"
                    ? "text-primary after:w-full"
                    : `${navInactiveTextCls} after:w-0 hover:after:w-full`
                }`}
              >
                العصابات
              </Link>
            ) : null}
            {visibility.pages.vipCars ? (
              <Link
                to="/store"
                className={`relative font-body font-medium text-sm transition-colors after:absolute after:bottom-[-6px] after:right-0 after:h-px after:bg-primary after:transition-all ${
                  location.pathname === "/store" || location.pathname.startsWith("/store/")
                    ? "text-primary after:w-full"
                    : `${navInactiveTextCls} after:w-0 hover:after:w-full`
                }`}
              >
                المتجر
              </Link>
            ) : null}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setInstitutionsOpen((prev) => !prev);
                }}
                className={`inline-flex items-center gap-2 text-sm font-body transition-colors ${navInactiveTextCls}`}
              >
                المؤسسات
                <ChevronDown className={`h-4 w-4 transition-transform ${institutionsOpen ? "rotate-180" : ""}`} />
              </button>

              {institutionsOpen && (
                <div className="absolute top-full z-[130] mt-3 right-0 w-64 rounded-xl border border-primary/30 bg-background/95 backdrop-blur-xl p-2 shadow-xl">
                  {visibleInstitutionLinks.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                        institutionLinkActive(location.pathname, item.to)
                          ? "bg-primary/15 text-primary"
                          : "text-muted-foreground hover:bg-primary/10 hover:text-foreground"
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                if (publicUser.user) {
                  goToPublicTickets();
                } else {
                  setLoginOpen(true);
                  toast.message("سجّل الدخول أولاً لفتح مركز التكت");
                }
              }}
              className={`relative inline-flex items-center gap-1.5 font-body text-sm font-medium transition-colors after:absolute after:bottom-[-6px] after:right-0 after:h-px after:bg-primary after:transition-all ${
                location.pathname === "/tickets"
                  ? "text-primary after:w-full"
                  : `${navInactiveTextCls} after:w-0 hover:after:w-full`
              }`}
              aria-label="مركز التكت"
            >
              <MessageSquareMore className="h-4 w-4 opacity-90" aria-hidden />
              <span>التكت</span>
              {publicUser.user && publicUnreadTickets > 0 ? (
                <span className="inline-flex min-w-[1.1rem] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold leading-4 text-white shadow-[0_0_10px_-1px_rgba(244,63,94,0.65)]">
                  {publicUnreadTickets}
                </span>
              ) : null}
            </button>
          </nav>

          <div className="flex items-center gap-3">
            {publicUser.user ? <NotificationsBell buttonClassName={navTriggerButtonCls} /> : null}
            {publicUser.user ? (
              <div className="relative hidden sm:block">
                <button
                  type="button"
                  onClick={() => setPublicMenuOpen((v) => !v)}
                  className={`inline-flex items-center rounded-xl border px-3 py-2 text-sm transition-colors ${navTriggerButtonCls}`}
                >
                  <UserCircle2 className="h-4 w-4 ml-1 shrink-0" />
                  <span className="ml-1 max-w-[11rem] truncate" title={publicUser.user.username}>
                    {publicUser.user.displayName}
                  </span>
                  <ChevronDown className={`me-2 h-4 w-4 transition-transform ${publicMenuOpen ? "rotate-180" : ""}`} />
                </button>
                {publicMenuOpen ? (
                  <div className="absolute left-0 z-[130] mt-2 w-48 overflow-hidden rounded-xl border border-rose-200 bg-white shadow-xl">
                    <Link
                      to="/profile"
                      className="block px-3 py-2 text-right text-sm text-slate-700 transition-colors hover:bg-rose-50 hover:text-rose-800"
                      onClick={() => setPublicMenuOpen(false)}
                    >
                      البروفايل
                    </Link>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between border-t border-rose-100 px-3 py-2 text-right text-sm text-slate-700 transition-colors hover:bg-rose-50 hover:text-rose-800"
                      onClick={() => {
                        setPublicMenuOpen(false);
                        goToPublicTickets();
                      }}
                    >
                      <span>التكت</span>
                      {publicUnreadTickets > 0 ? (
                        <span className="inline-flex min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold text-white">
                          {publicUnreadTickets}
                        </span>
                      ) : null}
                    </button>
                    <Link
                      to="/jobs"
                      className="block border-t border-rose-100 px-3 py-2 text-right text-sm text-slate-700 transition-colors hover:bg-rose-50 hover:text-rose-800"
                      onClick={() => setPublicMenuOpen(false)}
                    >
                      التقديم لوظيفة
                    </Link>
                    {myMembership && (myMembership.role === "leader" || myMembership.role === "deputy") ? (
                      <Link
                        to="/leadership"
                        className="flex items-center justify-between border-t border-amber-100 bg-amber-50/40 px-3 py-2 text-right text-sm text-amber-800 transition-colors hover:bg-amber-100/60"
                        onClick={() => setPublicMenuOpen(false)}
                      >
                        <span>لوحة القيادة</span>
                        <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-display font-semibold text-amber-800">
                          {myMembership.role === "leader" ? "قائد" : "نائب"}
                        </span>
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      className="block w-full border-t border-rose-100 px-3 py-2 text-right text-sm text-rose-700 transition-colors hover:bg-rose-50"
                      onClick={() => {
                        publicUser.logout();
                        setPublicMenuOpen(false);
                      }}
                    >
                      تسجيل الخروج
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
            {showPublicApplyButton ? (
              <button
                type="button"
                onClick={() => {
                  if (!publicUser.user) {
                    setLoginOpen(true);
                    toast.message("سجّل الدخول عبر Discord للمتابعة في التقديم الإلكتروني");
                    return;
                  }
                  if (publicUser.user.authProvider !== "discord") {
                    toast.message(
                      "التقديم الإلكتروني متاح للحسابات المسجّلة عبر Discord — اضغط للمتابعة",
                    );
                    navigate("/apply/citizen");
                    return;
                  }
                  navigate("/apply/citizen");
                }}
                className="group relative hidden h-10 items-center gap-2 overflow-hidden rounded-full bg-gradient-neon px-5 font-display text-sm font-semibold tracking-wide text-primary-foreground shadow-[0_0_24px_-4px_hsl(var(--primary)/0.65)] ring-1 ring-white/15 transition-all duration-500 hover:scale-[1.04] hover:shadow-[0_0_36px_-2px_hsl(var(--primary)/0.85)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background md:inline-flex"
                aria-label="التقديم الإلكتروني — يتطلب الدخول عبر Discord"
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 -translate-x-[120%] bg-gradient-to-l from-transparent via-white/35 to-transparent opacity-0 transition-all duration-700 group-hover:translate-x-[120%] group-hover:opacity-100"
                />
                <Sparkles className="relative h-4 w-4 shrink-0 transition-transform duration-500 group-hover:rotate-12" aria-hidden />
                <span className="relative">التقديم الإلكتروني</span>
              </button>
            ) : null}
            {canUseDashboard ? (
              <Button
                asChild
                variant="outline"
                className="hidden sm:inline-flex border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 hover:border-primary font-display tracking-wider"
              >
                <Link to="/dashboard">
                  <LayoutDashboard className="h-4 w-4 ml-2" />
                  لوحة التحكم
                </Link>
              </Button>
            ) : publicUser.user ? null : (
              <Button
                onClick={() => setLoginOpen(true)}
                variant="outline"
                className="hidden sm:inline-flex border-primary/40 bg-primary/5 text-primary hover:bg-primary/15 hover:border-primary hover:shadow-glow-primary font-display tracking-wider"
              >
                <Lock className="h-4 w-4 ml-2" />
                تسجيل دخول
              </Button>
            )}
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg p-2 text-foreground touch-manipulation active:bg-primary/10 lg:hidden"
              aria-label="القائمة"
            >
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {heroBgVideo && location.pathname === "/" ? (
          <div className="pointer-events-none absolute inset-x-0 top-full z-[110] bg-transparent py-1.5 sm:py-2">
            <div className="pointer-events-auto flex w-full min-w-0 items-center pl-[max(0.75rem,env(safe-area-inset-left,0px))] md:pl-8 xl:pl-12">
              <div className="ms-auto mr-[max(0.75rem,env(safe-area-inset-right,0px))] flex max-w-[min(100%-1rem,17rem)] shrink-0 items-center gap-2 rounded-xl border-0 bg-transparent px-2 py-2 shadow-none ring-0 sm:mr-4 md:mr-5">
                <button
                  type="button"
                  onClick={heroBgVideo.handleMuteToggle}
                  className="inline-flex h-9 w-9 shrink-0 touch-manipulation items-center justify-center rounded-lg border-0 bg-transparent text-primary transition-colors hover:bg-primary/10 sm:h-8 sm:w-8"
                  aria-label={heroBgVideo.muted ? "إلغاء كتم الصوت" : "كتم الصوت"}
                >
                  {heroBgVideo.muted || heroBgVideo.volume === 0 ? (
                    <VolumeX className="h-3.5 w-3.5" />
                  ) : (
                    <Volume2 className="h-3.5 w-3.5" />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 font-latin-display text-[9px] uppercase tracking-[0.2em] text-primary/85">Volume</div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={heroBgVideo.volume}
                    onChange={(e) => heroBgVideo.handleVolumeChange(Number(e.target.value))}
                    className="h-1.5 w-full cursor-pointer accent-primary"
                    aria-label="مستوى صوت الفيديو"
                  />
                </div>
                <span className="shrink-0 font-latin-display text-[10px] tabular-nums text-primary">{heroBgVideo.volume}%</span>
              </div>
            </div>
          </div>
        ) : null}

        {/* Mobile */}
        {open && (
          <div className="glass-panel relative z-[125] mx-4 mt-2 max-h-[min(72vh,calc(100dvh-8rem))] overflow-y-auto overscroll-contain rounded-xl p-4 animate-fade-in lg:hidden">
            <nav className="flex flex-col gap-0.5 sm:gap-1">
              <Link
                to="/"
                onClick={() => setOpen(false)}
                className="touch-manipulation rounded-lg py-3 text-foreground transition-colors active:bg-primary/10 hover:text-primary"
              >
                الرئيسية
              </Link>
              <Link
                to="/contact"
                onClick={() => setOpen(false)}
                className="touch-manipulation rounded-lg py-3 text-foreground transition-colors active:bg-primary/10 hover:text-primary"
              >
                من نحن
              </Link>
              {visibility.pages.laws ? (
                <Link
                  to="/laws"
                  onClick={() => setOpen(false)}
                  className="touch-manipulation rounded-lg py-3 text-foreground transition-colors active:bg-primary/10 hover:text-primary"
                >
                  القوانين
                </Link>
              ) : null}
              {visibility.pages.streamers ? (
                <Link
                  to="/streamers"
                  onClick={() => setOpen(false)}
                  className="touch-manipulation rounded-lg py-3 text-foreground transition-colors active:bg-primary/10 hover:text-primary"
                >
                  صنّاع المحتوى
                </Link>
              ) : null}
              {visibility.pages.gangs ? (
                <Link
                  to="/gangs"
                  onClick={() => setOpen(false)}
                  className="touch-manipulation rounded-lg py-3 text-foreground transition-colors active:bg-primary/10 hover:text-primary"
                >
                  العصابات
                </Link>
              ) : null}
              {visibility.pages.vipCars ? (
                <Link
                  to="/store"
                  onClick={() => setOpen(false)}
                  className="touch-manipulation rounded-lg py-3 text-foreground transition-colors active:bg-primary/10 hover:text-primary"
                >
                  المتجر
                </Link>
              ) : null}
              <div className="pt-2 pb-1 text-xs tracking-[0.2em] text-primary font-display">المؤسسات</div>
              {visibleInstitutionLinks.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className="touch-manipulation rounded-lg py-3 text-foreground transition-colors active:bg-primary/10 hover:text-primary"
                >
                  {l.label}
                </Link>
              ))}
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  if (publicUser.user) {
                    goToPublicTickets();
                  } else {
                    setLoginOpen(true);
                    toast.message("سجّل الدخول أولاً لفتح مركز التكت");
                  }
                }}
                className="flex w-full touch-manipulation items-center justify-between rounded-lg py-3 text-right text-foreground transition-colors hover:text-primary active:bg-primary/10"
              >
                <span className="inline-flex items-center gap-2">
                  <MessageSquareMore className="h-4 w-4 opacity-90" aria-hidden />
                  التكت
                </span>
                {publicUser.user && publicUnreadTickets > 0 ? (
                  <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-rose-600 px-1.5 text-[10px] font-semibold leading-4 text-white">
                    {publicUnreadTickets}
                  </span>
                ) : null}
              </button>
              {showPublicApplyButton ? (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    if (!publicUser.user) {
                      setLoginOpen(true);
                      toast.message("سجّل الدخول عبر Discord للمتابعة في التقديم الإلكتروني");
                      return;
                    }
                    if (publicUser.user.authProvider !== "discord") {
                      toast.message(
                        "التقديم الإلكتروني متاح للحسابات المسجّلة عبر Discord — اضغط للمتابعة",
                      );
                    }
                    navigate("/apply/citizen");
                  }}
                  className="group inline-flex w-full touch-manipulation items-center justify-center gap-2 rounded-xl bg-gradient-neon px-5 py-3 font-display text-sm font-semibold tracking-wide text-primary-foreground shadow-[0_0_24px_-4px_hsl(var(--primary)/0.55)] ring-1 ring-white/15"
                  aria-label="التقديم الإلكتروني — يتطلب الدخول عبر Discord"
                >
                  <Sparkles className="h-4 w-4 shrink-0 transition-transform group-hover:rotate-12" aria-hidden />
                  التقديم الإلكتروني
                </button>
              ) : null}
              {publicUser.user ? (
                <>
                  <Button asChild className="w-full touch-manipulation bg-rose-700 text-white hover:bg-rose-800">
                    <Link to="/profile" onClick={() => setOpen(false)}>
                      <UserCircle2 className="h-4 w-4 ml-2" /> حسابي
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full touch-manipulation border-rose-300 bg-white text-rose-700 hover:bg-rose-50"
                    onClick={() => {
                      publicUser.logout();
                      setOpen(false);
                    }}
                  >
                    تسجيل خروج المستخدم
                  </Button>
                </>
              ) : null}
              {canUseDashboard ? (
                <Button asChild className="w-full touch-manipulation bg-primary text-primary-foreground hover:bg-primary-glow">
                  <Link to="/dashboard" onClick={() => setOpen(false)}>
                    <LayoutDashboard className="h-4 w-4 ml-2" /> لوحة التحكم
                  </Link>
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setLoginOpen(true);
                  }}
                  className="w-full touch-manipulation bg-primary text-primary-foreground hover:bg-primary-glow"
                >
                  <Lock className="h-4 w-4 ml-2" /> تسجيل دخول
                </Button>
              )}
            </nav>
          </div>
        )}
      </header>

      <Dialog
        open={loginOpen}
        onOpenChange={(next) => {
          setLoginOpen(next);
          if (!next) {
            setStaffUser("");
            setStaffPass("");
            setStaffLoginVisible(false);
          }
        }}
      >
        <DialogContent
          dir="rtl"
          className="max-h-[90dvh] gap-0 overflow-y-auto rounded-3xl border border-rose-300/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.97)_0%,rgba(255,241,244,0.97)_100%)] p-0 text-slate-900 shadow-[0_30px_80px_-24px_rgba(127,29,29,0.30)] backdrop-blur-xl sm:max-w-[560px]"
        >
          <div className="relative bg-[radial-gradient(ellipse_120%_100%_at_50%_-20%,rgba(127,29,29,0.16),transparent_58%)] px-6 pb-2 pt-12 text-center sm:px-8 sm:pt-14">
            <img
              src="/trustLogo.png"
              alt="TRUST CFW"
              className="mx-auto h-[4.25rem] w-[4.25rem] object-contain drop-shadow-[0_0_24px_rgba(127,29,29,0.35)]"
              loading="eager"
            />
            <p className="mt-3 font-latin-display text-[10px] font-semibold tracking-[0.38em] text-primary/90 sm:text-[11px] sm:tracking-[0.42em]">
              TRUST CFW
            </p>
            <DialogHeader className="mt-5 space-y-2 text-center sm:text-center">
              <DialogTitle className="font-display text-xl font-bold text-slate-900 sm:text-2xl">تسجيل الدخول</DialogTitle>
              <DialogDescription className="mx-auto max-w-[22rem] text-pretty text-sm leading-relaxed text-slate-600">
                الطريقة الأساسية للاعبين والزوار هي <strong className="font-semibold text-slate-800">Discord</strong>.
                دخول لوحة الإدارة بالاسم وكلمة المرور يظهر فقط بعد الضغط على «تسجيل دخول إدمن».
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="h-px bg-gradient-to-l from-transparent via-rose-200 to-transparent" aria-hidden />

          <div className="space-y-4 px-6 py-6 sm:px-9 sm:py-7">
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                className="flex min-h-[4rem] w-full items-center justify-center gap-3 rounded-2xl border-[#5865F2]/50 bg-[#5865F2] px-5 py-4 text-base text-white shadow-md hover:bg-[#4752C4] hover:text-white sm:min-h-[4.25rem]"
                onClick={() => {
                  if (!isDiscordOAuthConfigured()) {
                    toast.error("أضف VITE_DISCORD_CLIENT_ID في ملف .env ثم أعد تشغيل السيرفر.");
                    return;
                  }
                  void startDiscordLogin().catch(() => {
                    toast.error("تعذر بدء تسجيل الدخول عبر Discord");
                  });
                }}
              >
                <DiscordIcon className="h-8 w-8 shrink-0 text-white sm:h-9 sm:w-9" />
                <span className="font-display text-base font-semibold tracking-wide sm:text-lg">
                  تسجيل الدخول عبر Discord
                </span>
              </Button>
              {!isDiscordOAuthConfigured() ? (
                <p className="text-center text-[11px] leading-snug text-amber-800/90">
                  لتفعيل الزر: أنشئ تطبيقاً في Discord Developer Portal وأضف نفس رابط الإرجاع في OAuth2 → Redirects.
                </p>
              ) : (
                <p className="text-center text-xs text-slate-500">الطريقة الموصى بها للاعبين والزوار.</p>
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border-rose-300 bg-white text-sm font-semibold text-rose-900 shadow-sm hover:border-rose-400 hover:bg-rose-100 hover:text-rose-950 focus-visible:ring-rose-300"
              onClick={() => {
                setStaffLoginVisible((v) => {
                  const next = !v;
                  if (next) {
                    requestAnimationFrame(() => staffUserRef.current?.focus());
                  }
                  return next;
                });
              }}
              aria-expanded={staffLoginVisible}
            >
              <Shield className="h-4 w-4 shrink-0 opacity-90" />
              {staffLoginVisible ? "إخفاء تسجيل دخول الإدمن" : "تسجيل دخول إدمن"}
              <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${staffLoginVisible ? "rotate-180" : ""}`} />
            </Button>

            <form
              noValidate
              hidden={!staffLoginVisible}
              aria-hidden={!staffLoginVisible}
              className="space-y-4 border-t border-rose-200/90 pt-4"
              onSubmit={(e: FormEvent) => {
                  e.preventDefault();
                  try {
                    const session = login(staffUser, staffPass);
                    if (session) {
                      toast.success("تم الدخول كموظف");
                      setLoginOpen(false);
                      setStaffUser("");
                      setStaffPass("");
                      setStaffLoginVisible(false);
                      navigate(getPostLoginDashboardPath(session.roles));
                      return;
                    }
                    toast.error("بيانات الموظف غير صحيحة");
                  } catch (err) {
                    if (err instanceof Error && err.message === "IC_SESSION_STORAGE") {
                      toast.error("تعذر حفظ جلسة الموظف في المتصفح.");
                    } else {
                      toast.error("حدث خطأ أثناء الدخول");
                      console.error(err);
                    }
                  }
                }}
              >
                <p className="text-center text-xs font-medium text-rose-800">لوحة التحكم — موظفون معتمدون فقط</p>
                <div className="space-y-1.5 text-right">
                  <Label htmlFor="staff-user" className="text-xs font-medium text-slate-700">
                    اسم المستخدم
                  </Label>
                  <Input
                    ref={staffUserRef}
                    id="staff-user"
                    name="username"
                    autoComplete="username"
                    tabIndex={staffLoginVisible ? 0 : -1}
                    value={staffUser}
                    onChange={(ev) => setStaffUser(ev.target.value)}
                    onKeyDown={(ev) => {
                      if (ev.key === "Tab" && !ev.shiftKey) {
                        ev.preventDefault();
                        staffPassRef.current?.focus();
                      }
                    }}
                    placeholder="اسم المستخدم"
                    className="h-11 rounded-xl border-rose-200 bg-white text-right text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus-visible:border-rose-400 focus-visible:ring-rose-200"
                  />
                </div>
                <div className="space-y-1.5 text-right">
                  <Label htmlFor="staff-pass" className="text-xs font-medium text-slate-700">
                    كلمة المرور
                  </Label>
                  <Input
                    ref={staffPassRef}
                    id="staff-pass"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    tabIndex={staffLoginVisible ? 0 : -1}
                    value={staffPass}
                    onChange={(ev) => setStaffPass(ev.target.value)}
                    onKeyDown={(ev) => {
                      if (ev.key === "Tab" && ev.shiftKey) {
                        ev.preventDefault();
                        staffUserRef.current?.focus();
                      }
                    }}
                    placeholder="كلمة المرور"
                    className="h-11 rounded-xl border-rose-200 bg-white text-right text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus-visible:border-rose-400 focus-visible:ring-rose-200"
                  />
                </div>
                <Button
                  type="submit"
                  className="h-11 w-full rounded-xl bg-gradient-neon font-display text-sm font-semibold tracking-wide text-primary-foreground shadow-md transition-all hover:brightness-110 hover:shadow-[var(--glow-primary)] active:scale-[0.99]"
                >
                  <Lock className="ms-2 h-4 w-4 opacity-90" />
                  دخول لوحة التحكم
                </Button>
                <p className="text-center text-[11px] text-slate-500">لا يُستخدم هذا القسم لتسجيل اللاعبين.</p>
              </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Navbar;
