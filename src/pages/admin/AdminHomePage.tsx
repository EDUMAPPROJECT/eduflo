import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import AdminBottomNavigation from "@/components/AdminBottomNavigation";
import Logo from "@/components/Logo";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, Calendar, Users, User, CalendarCheck, FileText, CalendarDays, Shield } from "lucide-react";

const AdminHomePage = () => {
  const navigate = useNavigate();
  const { isSuperAdmin } = useSuperAdmin();
  const [unreadChats, setUnreadChats] = useState(0);
  const [todayVisitConsultations, setTodayVisitConsultations] = useState(0);
  const [upcomingSeminar, setUpcomingSeminar] = useState<{
    daysLeft: number;
    currentAttendees: number;
    capacity: number;
  } | null>(null);
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
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        // Get user's academy
        const { data: academy } = await supabase
          .from("academies")
          .select("id")
          .eq("owner_id", user.id)
          .maybeSingle();

        if (academy) {
          // Count unread chat messages (messages not read by admin)
          const { data: chatRooms } = await supabase
            .from("chat_rooms")
            .select("id")
            .eq("academy_id", academy.id);

          if (chatRooms && chatRooms.length > 0) {
            const roomIds = chatRooms.map(r => r.id);
            const { count: unreadCount } = await supabase
              .from("messages")
              .select("*", { count: "exact", head: true })
              .in("chat_room_id", roomIds)
              .neq("sender_id", user.id)
              .eq("is_read", false);
            
            setUnreadChats(unreadCount || 0);
          }

          // Count today's visit consultations
          const { count: visitCount } = await supabase
            .from("consultation_reservations")
            .select("*", { count: "exact", head: true })
            .eq("academy_id", academy.id)
            .eq("reservation_date", todayStr);

          setTodayVisitConsultations(visitCount || 0);

          // Get upcoming seminar (closest future seminar)
          const { data: seminars } = await supabase
            .from("seminars")
            .select("id, date, capacity")
            .eq("academy_id", academy.id)
            .gte("date", todayStr)
            .order("date", { ascending: true })
            .limit(1);

          if (seminars && seminars.length > 0) {
            const seminar = seminars[0];
            const seminarDate = new Date(seminar.date);
            const diffTime = seminarDate.getTime() - today.getTime();
            const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Count applications for this seminar
            const { count: applicationCount } = await supabase
              .from("seminar_applications")
              .select("*", { count: "exact", head: true })
              .eq("seminar_id", seminar.id);

            setUpcomingSeminar({
              daysLeft,
              currentAttendees: applicationCount || 0,
              capacity: seminar.capacity || 0
            });
          }
        }
      } catch (error) {
        // Error fetching stats - silently fail
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  const quickActions = [
    {
      icon: User,
      label: "프로필 관리",
      path: "/admin/profile"
    },
    {
      icon: CalendarCheck,
      label: "상담 예약 관리",
      path: "/admin/consultations"
    },
    {
      icon: FileText,
      label: "게시물 관리",
      path: "/admin/feed-posts"
    },
    {
      icon: CalendarDays,
      label: "설명회 관리",
      path: "/admin/seminars"
    }
  ];

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

        {/* Stats Cards - 3 columns */}
        <div className={`grid gap-3 mb-6 ${upcomingSeminar ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {/* Unanswered Chats */}
          <Card 
            className="shadow-card border-border cursor-pointer hover:shadow-soft transition-all"
            onClick={() => navigate("/admin/chats")}
          >
            <CardContent className="p-4 text-center">
              <MessageSquare className="w-5 h-5 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold text-foreground">
                {loading ? "-" : unreadChats}
              </div>
              <p className="text-xs text-muted-foreground mt-1">미응답 채팅</p>
            </CardContent>
          </Card>

          {/* Today's Visit Consultations */}
          <Card 
            className="shadow-card border-border cursor-pointer hover:shadow-soft transition-all"
            onClick={() => navigate("/admin/consultations")}
          >
            <CardContent className="p-4 text-center">
              <Calendar className="w-5 h-5 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold text-foreground">
                {loading ? "-" : todayVisitConsultations}
              </div>
              <p className="text-xs text-muted-foreground mt-1">오늘 방문상담</p>
            </CardContent>
          </Card>

          {/* Upcoming Seminar - only show if exists */}
          {upcomingSeminar && (
            <Card 
              className="shadow-card border-border cursor-pointer hover:shadow-soft transition-all"
              onClick={() => navigate("/admin/seminars")}
            >
              <CardContent className="p-4 text-center">
                <Users className="w-5 h-5 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold text-foreground">
                  D-{upcomingSeminar.daysLeft}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {upcomingSeminar.currentAttendees}/{upcomingSeminar.capacity}명
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Quick Actions - 2x2 Grid */}
        <div className="grid grid-cols-2 gap-4">
          {quickActions.map((action) => (
            <Card
              key={action.path}
              className="shadow-card border-border cursor-pointer hover:shadow-soft transition-all"
              onClick={() => navigate(action.path)}
            >
              <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center mb-3">
                  <action.icon className="w-7 h-7 text-primary" />
                </div>
                <span className="font-medium text-foreground text-sm">{action.label}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Super Admin Button - Only visible to super admins */}
        {isSuperAdmin && (
          <Card 
            className="mt-6 shadow-card border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 cursor-pointer hover:shadow-soft transition-all duration-200"
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
      </main>

      <AdminBottomNavigation />
    </div>
  );
};

export default AdminHomePage;
