import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import BootLoader from "@/components/BootLoader";
import { AuthProvider } from "@/contexts/AuthContext";
import { PublicUserProvider } from "@/contexts/PublicUserContext";
import { LawsContentProvider } from "@/contexts/LawsContentContext";
import { StreamersContentProvider } from "@/contexts/StreamersContentContext";
import { GangsContentProvider } from "@/contexts/GangsContentContext";
import { VipCarsContentProvider } from "@/contexts/VipCarsContentContext";
import { HousesContentProvider } from "@/contexts/HousesContentContext";
import { PackagesContentProvider } from "@/contexts/PackagesContentContext";
import { InvestmentsContentProvider } from "@/contexts/InvestmentsContentContext";
import { InstitutionRostersContentProvider } from "@/contexts/InstitutionRostersContentContext";
import { ApplicationsContentProvider } from "@/contexts/ApplicationsContentContext";
import { RoleGroupsProvider } from "@/contexts/RoleGroupsContext";
import { RequireStaffAuth } from "@/components/RequireStaffAuth";
import { ALL_TICKET_STAFF_ROLES, DASHBOARD_TICKET_STAFF_ROLES } from "@/lib/ticketTypesConfig";
import { PublicStaffLinkSync } from "@/components/PublicStaffLinkSync";
import AdminLayout from "./pages/admin/AdminLayout.tsx";
import DashboardGate from "./pages/admin/DashboardGate.tsx";
import GangsAdminShell from "./pages/admin/GangsAdminShell.tsx";
import GangsEditorPage from "./pages/admin/GangsEditorPage.tsx";
import LawsEditorPage from "./pages/admin/LawsEditorPage.tsx";
import StaffUsersPage from "./pages/admin/StaffUsersPage.tsx";
import RoleGroupsPage from "./pages/admin/RoleGroupsPage.tsx";
import StreamersEditorPage from "./pages/admin/StreamersEditorPage.tsx";
import StreamersAdminShell from "./pages/admin/StreamersAdminShell.tsx";
import StreamerApplicationsPage from "./pages/admin/StreamerApplicationsPage.tsx";
import VipCarsEditorPage from "./pages/admin/VipCarsEditorPage.tsx";
import HousesEditorPage from "./pages/admin/HousesEditorPage.tsx";
import PackagesEditorPage from "./pages/admin/PackagesEditorPage.tsx";
import InvestmentsEditorPage from "./pages/admin/InvestmentsEditorPage.tsx";
import QuizManagerPage from "./pages/admin/QuizManagerPage.tsx";
import InstitutionRosterEditorPage from "./pages/admin/InstitutionRosterEditorPage.tsx";
import InstitutionRosterHubPage from "./pages/admin/InstitutionRosterHubPage.tsx";
import ApplicationsReviewPage from "./pages/admin/ApplicationsReviewPage.tsx";
import ActivityLogPage from "./pages/admin/ActivityLogPage.tsx";
import AboutManagerPage from "./pages/admin/AboutManagerPage.tsx";
import TicketsManagerPage from "./pages/admin/TicketsManagerPage.tsx";
import Index from "./pages/Index.tsx";
import ApplicationFormPage from "./pages/ApplicationFormPage.tsx";
import StreamerApplyPage from "./pages/StreamerApplyPage.tsx";
import StreamersPage from "./pages/StreamersPage.tsx";
import HealthPage from "./pages/HealthPage.tsx";
import InteriorDepartmentPage from "./pages/InteriorDepartmentPage.tsx";
import InteriorHubPage from "./pages/InteriorHubPage.tsx";
import OversightPage from "./pages/OversightPage.tsx";
import GangHubPage from "./pages/GangHubPage.tsx";
import GangsPage from "./pages/GangsPage.tsx";
import StorePage from "./pages/StorePage.tsx";
import JusticePage from "./pages/JusticePage.tsx";
import LawsPage from "./pages/LawsPage.tsx";
import DeveloperPage from "./pages/DeveloperPage.tsx";
import ContactPage from "./pages/ContactPage.tsx";
import ProfilePage from "./pages/ProfilePage.tsx";
import DiscordCallbackPage from "./pages/DiscordCallbackPage.tsx";
import TicketsPage from "./pages/TicketsPage.tsx";
import JobsPage from "./pages/JobsPage.tsx";
import JobsApplicationFormPage from "./pages/JobsApplicationFormPage.tsx";
import LeadershipPanelPage from "./pages/LeadershipPanelPage.tsx";
import NotFound from "./pages/NotFound.tsx";
import { INSTITUTION_ROSTER_STAFF_ROLES } from "@/data/institutionBranches";

/** عند فتح أي مسار جديد نرجع التمرير لأعلى الصفحة */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

const AppRoutes = () => {
  const location = useLocation();
  const [showBootLoader, setShowBootLoader] = useState(true);

  useEffect(() => {
    setShowBootLoader(true);
  }, [location.pathname]);

  const skipBoot =
    location.pathname.startsWith("/dashboard") ||
    location.pathname.startsWith("/auth/") ||
    location.pathname.startsWith("/store");

  return (
    <>
      <ScrollToTop />
      <PublicStaffLinkSync />
      <AnimatePresence>
        {showBootLoader && !skipBoot ? (
          <BootLoader key={location.pathname} onComplete={() => setShowBootLoader(false)} />
        ) : null}
      </AnimatePresence>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/apply/streamers" element={<StreamerApplyPage />} />
        <Route path="/apply/:role" element={<ApplicationFormPage />} />
        <Route path="/streamers" element={<StreamersPage />} />
        <Route path="/health" element={<HealthPage />} />
        <Route path="/ems" element={<Navigate to="/health" replace />} />
        <Route path="/interior" element={<InteriorHubPage />} />
        <Route path="/interior/:dept" element={<InteriorDepartmentPage />} />
        <Route path="/police" element={<Navigate to="/interior/police" replace />} />
        <Route path="/oversight" element={<OversightPage />} />
        <Route path="/gang-vip" element={<GangHubPage />} />
        <Route path="/gangs" element={<GangsPage />} />
        <Route path="/store" element={<StorePage />} />
        <Route path="/vip-cars" element={<Navigate to="/store" replace />} />
        <Route path="/justice" element={<JusticePage />} />
        <Route path="/laws" element={<LawsPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/auth/discord/callback" element={<DiscordCallbackPage />} />
        <Route path="/tickets" element={<TicketsPage />} />
        <Route path="/jobs" element={<JobsPage />} />
        <Route path="/jobs/apply/:role" element={<JobsApplicationFormPage />} />
        <Route path="/leadership" element={<LeadershipPanelPage />} />
        <Route path="/developer" element={<DeveloperPage />} />
        <Route
          path="/dashboard"
          element={
            <RequireStaffAuth
              allowRoles={[
                "super_admin",
                "laws_editor",
                "streamer_manager",
                "gang_manager",
                "vip_cars_manager",
                "houses_manager",
                "packages_manager",
                "investments_manager",
                "quiz_manager",
                "about_manager",
                ...ALL_TICKET_STAFF_ROLES,
                "store_orders_manager",
                ...INSTITUTION_ROSTER_STAFF_ROLES,
                "application_reviewer",
              ]}
            >
              <AdminLayout />
            </RequireStaffAuth>
          }
        >
          <Route index element={<DashboardGate />} />
          <Route
            path="users"
            element={
              <RequireStaffAuth allowRoles={["super_admin"]}>
                <StaffUsersPage />
              </RequireStaffAuth>
            }
          />
          <Route
            path="role-groups"
            element={
              <RequireStaffAuth allowRoles={["super_admin"]}>
                <RoleGroupsPage />
              </RequireStaffAuth>
            }
          />
          <Route
            path="activity"
            element={
              <RequireStaffAuth allowRoles={["super_admin"]}>
                <ActivityLogPage />
              </RequireStaffAuth>
            }
          />
          <Route
            path="laws"
            element={
              <RequireStaffAuth allowRoles={["super_admin", "laws_editor"]}>
                <LawsEditorPage />
              </RequireStaffAuth>
            }
          />
          <Route
            path="streamers"
            element={
              <RequireStaffAuth allowRoles={["super_admin", "streamer_manager"]}>
                <StreamersAdminShell />
              </RequireStaffAuth>
            }
          >
            <Route index element={<StreamersEditorPage />} />
            <Route path="applications" element={<StreamerApplicationsPage />} />
          </Route>
          <Route
            path="gangs"
            element={
              <RequireStaffAuth allowRoles={["super_admin", "gang_manager"]}>
                <GangsAdminShell />
              </RequireStaffAuth>
            }
          >
            <Route index element={<GangsEditorPage />} />
            <Route path="open-requests" element={<TicketsManagerPage embeddedGangSlug="gang-open" />} />
            <Route path="join-requests" element={<Navigate to="/dashboard/gangs/open-requests" replace />} />
          </Route>
          <Route
            path="vip-cars"
            element={
              <RequireStaffAuth allowRoles={["super_admin", "vip_cars_manager"]}>
                <VipCarsEditorPage />
              </RequireStaffAuth>
            }
          />
          <Route
            path="houses"
            element={
              <RequireStaffAuth allowRoles={["super_admin", "houses_manager"]}>
                <HousesEditorPage />
              </RequireStaffAuth>
            }
          />
          <Route
            path="packages"
            element={
              <RequireStaffAuth allowRoles={["super_admin", "packages_manager"]}>
                <PackagesEditorPage />
              </RequireStaffAuth>
            }
          />
          <Route
            path="investments"
            element={
              <RequireStaffAuth allowRoles={["super_admin", "investments_manager"]}>
                <InvestmentsEditorPage />
              </RequireStaffAuth>
            }
          />
          <Route
            path="quiz"
            element={
              <RequireStaffAuth allowRoles={["super_admin", "quiz_manager"]}>
                <QuizManagerPage />
              </RequireStaffAuth>
            }
          />
          <Route
            path="institution-rosters"
            element={<Navigate to="/dashboard/institution" replace />}
          />
          <Route
            path="institution"
            element={
              <RequireStaffAuth allowRoles={["super_admin", ...INSTITUTION_ROSTER_STAFF_ROLES]}>
                <InstitutionRosterHubPage />
              </RequireStaffAuth>
            }
          />
          <Route
            path="institution/:branchId"
            element={
              <RequireStaffAuth allowRoles={["super_admin", ...INSTITUTION_ROSTER_STAFF_ROLES]}>
                <InstitutionRosterEditorPage />
              </RequireStaffAuth>
            }
          />
          <Route
            path="about"
            element={
              <RequireStaffAuth allowRoles={["super_admin", "about_manager"]}>
                <AboutManagerPage />
              </RequireStaffAuth>
            }
          />
          <Route
            path="tickets"
            element={
              <RequireStaffAuth allowRoles={["super_admin", "gang_manager", ...DASHBOARD_TICKET_STAFF_ROLES]}>
                <TicketsManagerPage />
              </RequireStaffAuth>
            }
          />
          <Route
            path="store-orders"
            element={
              <RequireStaffAuth allowRoles={["super_admin", "store_orders_manager", "ticket_store_manager"]}>
                <TicketsManagerPage storeOrdersOnly />
              </RequireStaffAuth>
            }
          />
          <Route
            path="tickets/:ticketType"
            element={
              <RequireStaffAuth allowRoles={["super_admin", "gang_manager", ...DASHBOARD_TICKET_STAFF_ROLES]}>
                <TicketsManagerPage />
              </RequireStaffAuth>
            }
          />
          <Route
            path="applications"
            element={
              <RequireStaffAuth
                allowRoles={["super_admin", "application_reviewer", "streamer_manager", ...INSTITUTION_ROSTER_STAFF_ROLES]}
              >
                <ApplicationsReviewPage />
              </RequireStaffAuth>
            }
          />
        </Route>
        <Route path="/lawyer" element={<Navigate to="/justice#lawyers" replace />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => {
  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <PublicUserProvider>
        <AuthProvider>
          <ApplicationsContentProvider>
          <LawsContentProvider>
            <StreamersContentProvider>
              <GangsContentProvider>
              <VipCarsContentProvider>
                <HousesContentProvider>
                  <PackagesContentProvider>
                    <InvestmentsContentProvider>
                      <InstitutionRostersContentProvider>
                        <RoleGroupsProvider>
                          <AppRoutes />
                        </RoleGroupsProvider>
                      </InstitutionRostersContentProvider>
                    </InvestmentsContentProvider>
                  </PackagesContentProvider>
                </HousesContentProvider>
              </VipCarsContentProvider>
            </GangsContentProvider>
            </StreamersContentProvider>
          </LawsContentProvider>
          </ApplicationsContentProvider>
        </AuthProvider>
        </PublicUserProvider>
      </BrowserRouter>
    </TooltipProvider>
  );
};

export default App;
