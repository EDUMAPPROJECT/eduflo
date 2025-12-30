import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import BottomNavigation from "@/components/BottomNavigation";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ChevronRight, 
  Heart, 
  MessageSquare, 
  Settings, 
  HelpCircle, 
  LogOut,
  Clock,
  GraduationCap,
  Building2,
  Calendar
} from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Consultation = Database["public"]["Tables"]["consultations"]["Row"];
type Bookmark = Database["public"]["Tables"]["bookmarks"]["Row"];
type Academy = Database["public"]["Tables"]["academies"]["Row"];

interface BookmarkWithAcademy extends Bookmark {
  academy?: Academy;
}

interface SeminarApplication {
  id: string;
  student_name: string;
  student_grade: string | null;
  attendee_count: number | null;
  message: string | null;
  created_at: string;
  seminar?: {
    title: string;
    date: string;
    status: "recruiting" | "closed";
    academy?: {
      name: string;
    };
  };
}

const MyPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("parent");
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkWithAcademy[]>([]);
  const [seminarApplications, setSeminarApplications] = useState<SeminarApplication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
            fetchRole(session.user.id);
            fetchConsultations(session.user.id);
            fetchBookmarks(session.user.id);
            fetchSeminarApplications(session.user.id);
          }, 0);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchRole(session.user.id);
        fetchConsultations(session.user.id);
        fetchBookmarks(session.user.id);
        fetchSeminarApplications(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    setProfile(data);
  };

  const fetchRole = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();
    if (data) setUserRole(data.role);
  };

  const fetchConsultations = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("consultations")
        .select("*")
        .eq("parent_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setConsultations(data || []);
    } catch (error) {
      console.error("Error fetching consultations:", error);
    }
  };

  const fetchBookmarks = async (userId: string) => {
    try {
      const { data: bookmarkData, error: bookmarkError } = await supabase
        .from("bookmarks")
        .select("*")
        .eq("user_id", userId);

      if (bookmarkError) throw bookmarkError;

      if (bookmarkData && bookmarkData.length > 0) {
        const academyIds = bookmarkData.map(b => b.academy_id);
        const { data: academyData } = await supabase
          .from("academies")
          .select("*")
          .in("id", academyIds);

        const bookmarksWithAcademies = bookmarkData.map(bookmark => ({
          ...bookmark,
          academy: academyData?.find(a => a.id === bookmark.academy_id)
        }));

        setBookmarks(bookmarksWithAcademies);
      } else {
        setBookmarks([]);
      }
    } catch (error) {
      console.error("Error fetching bookmarks:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSeminarApplications = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("seminar_applications")
        .select(`
          *,
          seminar:seminars (
            title,
            date,
            status,
            academy:academies (
              name
            )
          )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSeminarApplications((data as any) || []);
    } catch (error) {
      console.error("Error fetching seminar applications:", error);
    }
  };

  const removeBookmark = async (bookmarkId: string) => {
    try {
      const { error } = await supabase
        .from("bookmarks")
        .delete()
        .eq("id", bookmarkId);

      if (error) throw error;

      setBookmarks(prev => prev.filter(b => b.id !== bookmarkId));
      toast.success("찜 목록에서 삭제되었습니다");
    } catch (error) {
      console.error("Error removing bookmark:", error);
      toast.error("삭제에 실패했습니다");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("로그아웃되었습니다");
    navigate("/");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="bg-amber-100 text-amber-700">대기중</Badge>;
      case "completed":
        return <Badge variant="secondary" className="bg-green-100 text-green-700">완료</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-card/80 backdrop-blur-lg border-b border-border z-40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-center">
          <Logo size="sm" />
        </div>
      </header>

      {/* Profile Section */}
      <div className="gradient-primary pt-6 pb-8 px-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-card flex items-center justify-center shadow-soft">
              <span className="text-2xl font-bold text-primary">
                {profile?.user_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || "U"}
              </span>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-primary-foreground">
                {profile?.user_name || user?.email?.split("@")[0] || "사용자"}
              </h2>
              <p className="text-sm text-primary-foreground/80">
                {userRole === "parent" ? "학부모 회원" : "학원 원장님"}
              </p>
            </div>
            {!user ? (
              <Button 
                variant="secondary" 
                size="sm" 
                className="bg-card/20 text-primary-foreground border-none hover:bg-card/30"
                onClick={() => navigate("/auth")}
              >
                로그인
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 -mt-4">
        {/* Quick Stats Card */}
        <div className="bg-card rounded-2xl p-4 shadow-card mb-6">
          <div className="grid grid-cols-3 divide-x divide-border">
            <div className="text-center py-2">
              <p className="text-2xl font-bold text-primary">{bookmarks.length}</p>
              <p className="text-xs text-muted-foreground">찜한 학원</p>
            </div>
            <div className="text-center py-2">
              <p className="text-2xl font-bold text-accent">{consultations.length}</p>
              <p className="text-xs text-muted-foreground">상담 신청</p>
            </div>
            <div className="text-center py-2">
              <p className="text-2xl font-bold text-green-600">{seminarApplications.length}</p>
              <p className="text-xs text-muted-foreground">설명회 신청</p>
            </div>
          </div>
        </div>

        {user && (
          <Tabs defaultValue="seminars" className="mb-6">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="seminars" className="gap-1 text-xs">
                <Calendar className="w-3 h-3" />
                설명회
              </TabsTrigger>
              <TabsTrigger value="consultations" className="gap-1 text-xs">
                <MessageSquare className="w-3 h-3" />
                상담
              </TabsTrigger>
              <TabsTrigger value="bookmarks" className="gap-1 text-xs">
                <Heart className="w-3 h-3" />
                찜
              </TabsTrigger>
            </TabsList>

            <TabsContent value="seminars" className="mt-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              ) : seminarApplications.length === 0 ? (
                <Card className="shadow-card border-border">
                  <CardContent className="p-6 text-center">
                    <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">신청한 설명회가 없습니다</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-3"
                      onClick={() => navigate("/explore?tab=seminars")}
                    >
                      설명회 찾아보기
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {seminarApplications.map((app) => (
                    <Card 
                      key={app.id} 
                      className="shadow-card border-border cursor-pointer hover:shadow-soft transition-all"
                      onClick={() => app.seminar && navigate(`/seminar/${app.id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Calendar className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <h4 className="font-medium text-foreground text-sm line-clamp-1">
                                {app.seminar?.title || "설명회"}
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                {app.student_name} · {app.attendee_count || 1}명
                              </p>
                            </div>
                          </div>
                          <Badge 
                            variant={app.seminar?.status === "recruiting" ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {app.seminar?.status === "recruiting" ? "모집중" : "마감"}
                          </Badge>
                        </div>
                        {app.seminar?.academy && (
                          <p className="text-xs text-muted-foreground mb-1">
                            {app.seminar.academy.name}
                          </p>
                        )}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>신청일: {formatDate(app.created_at)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="consultations" className="mt-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              ) : consultations.length === 0 ? (
                <Card className="shadow-card border-border">
                  <CardContent className="p-6 text-center">
                    <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">신청한 상담이 없습니다</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {consultations.map((consultation) => (
                    <Card key={consultation.id} className="shadow-card border-border">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                              <GraduationCap className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <h4 className="font-medium text-foreground text-sm">
                                {consultation.student_name}
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                {consultation.student_grade || "학년 미정"}
                              </p>
                            </div>
                          </div>
                          {getStatusBadge(consultation.status)}
                        </div>
                        {consultation.message && (
                          <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2 mb-2 line-clamp-2">
                            {consultation.message}
                          </p>
                        )}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>{formatDate(consultation.created_at)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="bookmarks" className="mt-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              ) : bookmarks.length === 0 ? (
                <Card className="shadow-card border-border">
                  <CardContent className="p-6 text-center">
                    <Heart className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">찜한 학원이 없습니다</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-3"
                      onClick={() => navigate("/explore")}
                    >
                      학원 둘러보기
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {bookmarks.map((bookmark) => (
                    <Card key={bookmark.id} className="shadow-card border-border">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                            {bookmark.academy?.profile_image ? (
                              <img 
                                src={bookmark.academy.profile_image} 
                                alt={bookmark.academy.name}
                                className="w-full h-full object-cover rounded-xl"
                              />
                            ) : (
                              <Building2 className="w-6 h-6 text-primary" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-foreground text-sm truncate">
                              {bookmark.academy?.name || "학원"}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              {bookmark.academy?.subject}
                            </p>
                            {bookmark.academy?.tags && bookmark.academy.tags.length > 0 && (
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {bookmark.academy.tags.slice(0, 2).map((tag) => (
                                  <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => removeBookmark(bookmark.id)}
                            className="p-2 hover:bg-muted rounded-full transition-colors"
                          >
                            <Heart className="w-5 h-5 fill-red-500 text-red-500" />
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Menu List */}
        <div className="bg-card rounded-2xl shadow-card overflow-hidden">
          <MenuItemButton icon={Settings} label="설정" />
          <MenuItemButton icon={HelpCircle} label="고객센터" />
          {user && (
            <MenuItemButton 
              icon={LogOut} 
              label="로그아웃" 
              variant="destructive" 
              onClick={handleLogout}
            />
          )}
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
};

interface MenuItemButtonProps {
  icon: React.ElementType;
  label: string;
  variant?: "default" | "destructive";
  onClick?: () => void;
}

const MenuItemButton = ({ icon: Icon, label, variant = "default", onClick }: MenuItemButtonProps) => (
  <button 
    onClick={onClick}
    className="w-full flex items-center gap-4 px-4 py-4 hover:bg-muted/50 transition-colors border-b border-border last:border-b-0"
  >
    <Icon className={`w-5 h-5 ${variant === "destructive" ? "text-destructive" : "text-muted-foreground"}`} />
    <span className={`flex-1 text-left text-sm font-medium ${variant === "destructive" ? "text-destructive" : "text-foreground"}`}>
      {label}
    </span>
    <ChevronRight className="w-4 h-4 text-muted-foreground" />
  </button>
);

export default MyPage;
