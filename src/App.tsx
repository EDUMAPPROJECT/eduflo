import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import SplashScreen from "./components/SplashScreen";
import RoleSelection from "./pages/RoleSelection";
import AuthPage from "./pages/AuthPage";
import HomePage from "./pages/HomePage";
import ExplorePage from "./pages/ExplorePage";
import MyPage from "./pages/MyPage";
import SeminarDetailPage from "./pages/SeminarDetailPage";
import AcademyDetailPage from "./pages/AcademyDetailPage";
import LearningStyleTest from "./pages/LearningStyleTest";
import LearningStyleResult from "./pages/LearningStyleResult";
import AdminHomePage from "./pages/admin/AdminHomePage";
import ConsultationManagementPage from "./pages/admin/ConsultationManagementPage";
import ProfileManagementPage from "./pages/admin/ProfileManagementPage";
import SeminarManagementPage from "./pages/admin/SeminarManagementPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RoleSelection />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/my" element={<MyPage />} />
            <Route path="/seminar/:id" element={<SeminarDetailPage />} />
            <Route path="/academy/:id" element={<AcademyDetailPage />} />
            <Route path="/learning-style-test" element={<LearningStyleTest />} />
            <Route path="/learning-style-result" element={<LearningStyleResult />} />
            {/* Admin Routes */}
            <Route path="/admin/home" element={<AdminHomePage />} />
            <Route path="/admin/consultations" element={<ConsultationManagementPage />} />
            <Route path="/admin/profile" element={<ProfileManagementPage />} />
            <Route path="/admin/seminars" element={<SeminarManagementPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
