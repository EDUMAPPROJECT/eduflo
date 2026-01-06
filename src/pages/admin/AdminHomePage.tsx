import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import AdminBottomNavigation from "@/components/AdminBottomNavigation";
import Logo from "@/components/Logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Eye, TrendingUp, Calendar, Shield, Megaphone, CalendarDays } from "lucide-react";

const AdminHomePage = () => {
  const navigate = useNavigate();
  const { isSuperAdmin } = useSuperAdmin();
  const [todayConsultations, setTodayConsultations] = useState(0);
  const [profileViews, setProfileViews] = useState(0);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    getUser();
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;

      try {
        // Get today's date range
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Get user's academy
        const { data: academy } = await supabase
          .from("academies")
          .select("id")
          .eq("owner_id", user.id)
          .maybeSingle();

        if (academy) {
          // Count today's chat consultations
          const { count: chatCount } = await supabase
            .from("consultations")
            .select("*", { count: "exact", head: true })
            .eq("academy_id", academy.id)
            .gte("created_at", today.toISOString())
            .lt("created_at", tomorrow.toISOString());

          // Count today's visit reservation requests
          const { count: reservationCount } = await supabase
            .from("consultation_reservations")
            .select("*", { count: "exact", head: true })
            .eq("academy_id", academy.id)
            .gte("created_at", today.toISOString())
            .lt("created_at", tomorrow.toISOString());

          setTodayConsultations((chatCount || 0) + (reservationCount || 0));
          
          // Fetch real profile view count for today
          const { count: viewCount } = await supabase
            .from("profile_views")
            .select("*", { count: "exact", head: true })
            .eq("academy_id", academy.id)
            .gte("viewed_at", today.toISOString())
            .lt("viewed_at", tomorrow.toISOString());

          setProfileViews(viewCount || 0);
        }
      } catch (error) {
        // Error fetching stats - silently fail
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-card/80 backdrop-blur-lg border-b border-border z-40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <Logo size="sm" showText={false} />
          <span className="text-xs font-medium text-primary bg-secondary px-2 py-1 rounded-full">
            관리자 모드
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Welcome Banner */}
        <div className="gradient-primary rounded-2xl p-5 mb-6 shadow-soft">
          <h2 className="text-primary-foreground font-semibold text-lg mb-1">
            안녕하세요, 원장님 👋
          </h2>
          <p className="text-primary-foreground/80 text-sm">
            오늘도 에듀맵과 함께 학원을 운영해보세요
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="shadow-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                오늘의 상담 신청
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-foreground">
                  {loading ? "-" : todayConsultations}
                </span>
                <span className="text-sm text-muted-foreground mb-1">건</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                에듀맵을 통한 신청
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Eye className="w-4 h-4 text-accent" />
                프로필 조회수
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-foreground">
                  {loading ? "-" : profileViews}
                </span>
                <span className="text-sm text-muted-foreground mb-1">회</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                오늘 기준
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <section>
          <h3 className="font-semibold text-foreground mb-4">빠른 실행</h3>
          <div className="space-y-3">
            <Card 
              className="shadow-card border-border cursor-pointer hover:shadow-soft transition-all duration-200"
              onClick={() => navigate("/admin/seminars")}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                  <CalendarDays className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-foreground">설명회 관리</h4>
                  <p className="text-sm text-muted-foreground">
                    설명회 일정을 등록하고 관리하세요
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="shadow-card border-border cursor-pointer hover:shadow-soft transition-all duration-200"
              onClick={() => navigate("/admin/feed-posts")}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                  <Megaphone className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-foreground">내 소식 관리</h4>
                  <p className="text-sm text-muted-foreground">
                    학원 소식을 작성하고 관리하세요
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="shadow-card border-border cursor-pointer hover:shadow-soft transition-all duration-200"
              onClick={() => navigate("/admin/consultations")}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-foreground">상담 신청 확인하기</h4>
                  <p className="text-sm text-muted-foreground">
                    학부모님들의 상담 요청을 확인하세요
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="shadow-card border-border cursor-pointer hover:shadow-soft transition-all duration-200"
              onClick={() => navigate("/admin/profile")}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-foreground">프로필 수정하기</h4>
                  <p className="text-sm text-muted-foreground">
                    학원 정보를 최신 상태로 유지하세요
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Super Admin Button - Only visible to super admins */}
            {isSuperAdmin && (
              <Card 
                className="shadow-card border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 cursor-pointer hover:shadow-soft transition-all duration-200"
                onClick={() => navigate("/admin/super")}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">슈퍼관리자 센터</h4>
                    <p className="text-sm text-muted-foreground">
                      플랫폼 전체를 관리합니다
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      </main>

      <AdminBottomNavigation />
    </div>
  );
};

export default AdminHomePage;
