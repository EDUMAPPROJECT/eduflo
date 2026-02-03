import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RegionProvider } from "@/contexts/RegionContext";
import SplashScreen from "./components/SplashScreen";
import RoleSelection from "./pages/RoleSelection";
import AuthPage from "./pages/AuthPage";
import HomePage from "./pages/HomePage";
import ExplorePage from "./pages/ExplorePage";
import CommunityPage from "./pages/CommunityPage";
import MyPage from "./pages/MyPage";
import MyClassesPage from "./pages/MyClassesPage";
import MyBookmarksPage from "./pages/MyBookmarksPage";
import MyReservationsPage from "./pages/MyReservationsPage";
import ChildConnectionPage from "./pages/ChildConnectionPage";
import ParentConnectionPage from "./pages/ParentConnectionPage";
import SettingsPage from "./pages/SettingsPage";
import CustomerServicePage from "./pages/CustomerServicePage";
import SeminarDetailPage from "./pages/SeminarDetailPage";
import AcademyDetailPage from "./pages/AcademyDetailPage";
import ChatListPage from "./pages/ChatListPage";
import ChatRoomPage from "./pages/ChatRoomPage";
import LearningStyleTest from "./pages/LearningStyleTest";
import LearningStyleResult from "./pages/LearningStyleResult";
import PreferenceTest from "./pages/PreferenceTest";
import PreferenceResult from "./pages/PreferenceResult";
import TimetablePage from "./pages/TimetablePage";
import EventsPage from "./pages/EventsPage";
import AdminHomePage from "./pages/admin/AdminHomePage";
import ConsultationManagementPage from "./pages/admin/ConsultationManagementPage";
import ReservationManagementPage from "./pages/admin/ReservationManagementPage";
import ProfileManagementPage from "./pages/admin/ProfileManagementPage";
import ProfileReadOnlyPage from "./pages/admin/ProfileReadOnlyPage";
import SeminarManagementPage from "./pages/admin/SeminarManagementPage";
import PostManagementPage from "./pages/admin/PostManagementPage";
import FeedPostManagementPage from "./pages/admin/FeedPostManagementPage";
import AdminChatListPage from "./pages/admin/AdminChatListPage";
import AdminChatRoomPage from "./pages/admin/AdminChatRoomPage";
import AdminCommunityPage from "./pages/admin/AdminCommunityPage";
import BusinessVerificationPage from "./pages/admin/BusinessVerificationPage";
import VerificationReviewPage from "./pages/admin/VerificationReviewPage";
import SuperAdminPage from "./pages/admin/SuperAdminPage";
import SuperAdminSettingsPage from "./pages/admin/SuperAdminSettingsPage";
import SuperAdminUsersPage from "./pages/admin/SuperAdminUsersPage";
import SuperAdminPostsPage from "./pages/admin/SuperAdminPostsPage";
import SuperAdminAcademiesPage from "./pages/admin/SuperAdminAcademiesPage";
import SuperAdminAcademyCreatePage from "./pages/admin/SuperAdminAcademyCreatePage";
import SuperAdminAcademyEditPage from "./pages/admin/SuperAdminAcademyEditPage";
import AdminMyPage from "./pages/admin/AdminMyPage";
import MemberManagementPage from "./pages/admin/MemberManagementPage";
import ChatManagementPage from "./pages/admin/ChatManagementPage";
import AcademySetupPage from "./pages/academy/AcademySetupPage";
import AcademyOnboardingPage from "./pages/academy/AcademyOnboardingPage";
import AcademyDashboardPage from "./pages/academy/AcademyDashboardPage";
import ProtectedAdminRoute from "./components/ProtectedAdminRoute";
import NotFound from "./pages/NotFound";

// Student Pages
import StudentHomePage from "./pages/student/StudentHomePage";
import StudentMyPage from "./pages/student/StudentMyPage";

// Shared Pages
import AnnouncementsPage from "./pages/AnnouncementsPage";
import MyProfilePage from "./pages/MyProfilePage";

const queryClient = new QueryClient();

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RegionProvider>
          <Toaster />
          <Sonner />
          {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<RoleSelection />} />
              <Route path="/auth" element={<AuthPage />} />
              
              {/* Parent Routes (/p prefix) */}
              <Route path="/p/home" element={<HomePage />} />
              <Route path="/p/explore" element={<ExplorePage />} />
              <Route path="/p/community" element={<CommunityPage />} />
              <Route path="/p/my" element={<MyPage />} />
              <Route path="/p/my/profile" element={<MyProfilePage />} />
              <Route path="/p/my/classes" element={<MyClassesPage />} />
              <Route path="/p/my/bookmarks" element={<MyBookmarksPage />} />
              <Route path="/p/my/reservations" element={<MyReservationsPage />} />
              <Route path="/p/child-connection" element={<ChildConnectionPage />} />
              <Route path="/p/settings" element={<SettingsPage />} />
              <Route path="/p/customer-service" element={<CustomerServicePage />} />
              <Route path="/p/chats" element={<ChatListPage />} />
              <Route path="/p/chats/:id" element={<ChatRoomPage />} />
              <Route path="/p/seminar/:id" element={<SeminarDetailPage />} />
              <Route path="/p/academy/:id" element={<AcademyDetailPage />} />
              <Route path="/p/learning-style-test" element={<LearningStyleTest />} />
              <Route path="/p/learning-style-result" element={<LearningStyleResult />} />
              <Route path="/p/preference-test" element={<PreferenceTest />} />
              <Route path="/p/preference-result" element={<PreferenceResult />} />
              <Route path="/p/timetable" element={<TimetablePage />} />
              <Route path="/p/events" element={<EventsPage />} />
              <Route path="/p/announcements" element={<AnnouncementsPage />} />
              
              {/* Student Routes (/s prefix) */}
              <Route path="/s/home" element={<StudentHomePage />} />
              <Route path="/s/explore" element={<ExplorePage />} />
              <Route path="/s/community" element={<CommunityPage />} />
              <Route path="/s/my" element={<StudentMyPage />} />
              <Route path="/s/my/profile" element={<MyProfilePage />} />
              <Route path="/s/my/classes" element={<MyClassesPage />} />
              <Route path="/s/my/bookmarks" element={<MyBookmarksPage />} />
              <Route path="/s/my/reservations" element={<MyReservationsPage />} />
              <Route path="/s/parent-connection" element={<ParentConnectionPage />} />
              <Route path="/s/settings" element={<SettingsPage />} />
              <Route path="/s/customer-service" element={<CustomerServicePage />} />
              <Route path="/s/chats" element={<ChatListPage />} />
              <Route path="/s/chats/:id" element={<ChatRoomPage />} />
              <Route path="/s/seminar/:id" element={<SeminarDetailPage />} />
              <Route path="/s/academy/:id" element={<AcademyDetailPage />} />
              <Route path="/s/learning-style-test" element={<LearningStyleTest />} />
              <Route path="/s/learning-style-result" element={<LearningStyleResult />} />
              <Route path="/s/preference-test" element={<PreferenceTest />} />
              <Route path="/s/preference-result" element={<PreferenceResult />} />
              <Route path="/s/timetable" element={<TimetablePage />} />
              <Route path="/s/events" element={<EventsPage />} />
              <Route path="/s/announcements" element={<AnnouncementsPage />} />
              
              {/* Legacy routes - keep for backwards compatibility */}
              <Route path="/home" element={<HomePage />} />

              {/* Protected Admin Routes */}
              <Route path="/academy/onboarding" element={<ProtectedAdminRoute><AcademyOnboardingPage /></ProtectedAdminRoute>} />
              <Route path="/academy/setup" element={<ProtectedAdminRoute><AcademySetupPage /></ProtectedAdminRoute>} />
              <Route path="/academy/dashboard" element={<ProtectedAdminRoute><AcademyDashboardPage /></ProtectedAdminRoute>} />
              <Route path="/admin/home" element={<ProtectedAdminRoute><AdminHomePage /></ProtectedAdminRoute>} />
              <Route path="/admin/consultations" element={<ProtectedAdminRoute><ConsultationManagementPage /></ProtectedAdminRoute>} />
              <Route path="/admin/reservations" element={<ProtectedAdminRoute><ReservationManagementPage /></ProtectedAdminRoute>} />
              <Route path="/admin/profile" element={<ProtectedAdminRoute><ProfileManagementPage /></ProtectedAdminRoute>} />
              <Route path="/admin/profileread" element={<ProtectedAdminRoute><ProfileReadOnlyPage /></ProtectedAdminRoute>} />
              <Route path="/admin/seminars" element={<ProtectedAdminRoute><SeminarManagementPage /></ProtectedAdminRoute>} />
              <Route path="/admin/posts" element={<ProtectedAdminRoute><PostManagementPage /></ProtectedAdminRoute>} />
              <Route path="/admin/feed-posts" element={<ProtectedAdminRoute><FeedPostManagementPage /></ProtectedAdminRoute>} />
              <Route path="/admin/chats" element={<ProtectedAdminRoute><AdminChatListPage /></ProtectedAdminRoute>} />
              <Route path="/admin/chats/:id" element={<ProtectedAdminRoute><AdminChatRoomPage /></ProtectedAdminRoute>} />
              <Route path="/admin/community" element={<ProtectedAdminRoute><AdminCommunityPage /></ProtectedAdminRoute>} />
              <Route path="/admin/verification" element={<ProtectedAdminRoute><BusinessVerificationPage /></ProtectedAdminRoute>} />
              <Route path="/admin/verification-review" element={<ProtectedAdminRoute><VerificationReviewPage /></ProtectedAdminRoute>} />
              <Route path="/admin/super" element={<ProtectedAdminRoute><SuperAdminPage /></ProtectedAdminRoute>} />
              <Route path="/admin/super/settings" element={<ProtectedAdminRoute><SuperAdminSettingsPage /></ProtectedAdminRoute>} />
              <Route path="/admin/super/users" element={<ProtectedAdminRoute><SuperAdminUsersPage /></ProtectedAdminRoute>} />
              <Route path="/admin/super/posts" element={<ProtectedAdminRoute><SuperAdminPostsPage /></ProtectedAdminRoute>} />
              <Route path="/admin/super/academies" element={<ProtectedAdminRoute><SuperAdminAcademiesPage /></ProtectedAdminRoute>} />
              <Route path="/admin/super/academies/create" element={<ProtectedAdminRoute><SuperAdminAcademyCreatePage /></ProtectedAdminRoute>} />
              <Route path="/admin/super/academies/:id/edit" element={<ProtectedAdminRoute><SuperAdminAcademyEditPage /></ProtectedAdminRoute>} />
              <Route path="/admin/my" element={<ProtectedAdminRoute><AdminMyPage /></ProtectedAdminRoute>} />
              <Route path="/admin/members" element={<ProtectedAdminRoute><MemberManagementPage /></ProtectedAdminRoute>} />
              <Route path="/admin/chat-management" element={<ProtectedAdminRoute><ChatManagementPage /></ProtectedAdminRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </RegionProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
