import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import BottomNavigation from "@/components/BottomNavigation";
import Logo from "@/components/Logo";
import NicknameSettingsDialog from "@/components/NicknameSettingsDialog";
import MyClassList from "@/components/MyClassList";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ChevronRight, 
  Heart, 
  Settings, 
  HelpCircle, 
  LogOut,
  Building2,
  Calendar,
  Pencil,
  BookOpen
} from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Bookmark = Database["public"]["Tables"]["bookmarks"]["Row"];
type Academy = Database["public"]["Tables"]["academies"]["Row"];

interface BookmarkWithAcademy extends Bookmark {
  academy?: Academy;
}

const MyPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("parent");
  const [bookmarks, setBookmarks] = useState<BookmarkWithAcademy[]>([]);
  const [reservationCount, setReservationCount] = useState(0);
  const [seminarCount, setSeminarCount] = useState(0);
  const [consultationCount, setConsultationCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isNicknameDialogOpen, setIsNicknameDialogOpen] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
            fetchRole(session.user.id);
            fetchBookmarks(session.user.id);
            fetchCounts(session.user.id);
          }, 0);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchRole(session.user.id);
        fetchBookmarks(session.user.id);
        fetchCounts(session.user.id);
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

  const fetchCounts = async (userId: string) => {
    try {
      // Fetch reservation count
      const { count: resCount } = await supabase
        .from("consultation_reservations")
        .select("*", { count: "exact", head: true })
        .eq("parent_id", userId)
        .neq("status", "cancelled");
      setReservationCount(resCount || 0);

      // Fetch seminar count
      const { count: semCount } = await supabase
        .from("seminar_applications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);
      setSeminarCount(semCount || 0);

      // Fetch consultation count
      const { count: conCount } = await supabase
        .from("consultations")
        .select("*", { count: "exact", head: true })
        .eq("parent_id", userId);
      setConsultationCount(conCount || 0);
    } catch (error) {
      console.error("Error fetching counts:", error);
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

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-card/80 backdrop-blur-lg border-b border-border z-40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-center">
          <Logo size="sm" showText={false} />
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
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-primary-foreground">
                  {profile?.user_name || user?.email?.split("@")[0] || "사용자"}
                </h2>
                {user && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-6 h-6 text-primary-foreground/80 hover:text-primary-foreground hover:bg-card/20"
                    onClick={() => setIsNicknameDialogOpen(true)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
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
        <div 
          className="bg-card rounded-2xl p-4 shadow-card mb-6 cursor-pointer hover:shadow-soft transition-all"
          onClick={() => navigate("/my/reservations")}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-foreground">내 예약</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="grid grid-cols-3 divide-x divide-border">
            <div className="text-center py-2">
              <p className="text-2xl font-bold text-primary">{reservationCount}</p>
              <p className="text-xs text-muted-foreground">방문 상담</p>
            </div>
            <div className="text-center py-2">
              <p className="text-2xl font-bold text-accent">{seminarCount}</p>
              <p className="text-xs text-muted-foreground">설명회</p>
            </div>
            <div className="text-center py-2">
              <p className="text-2xl font-bold text-amber-600">{consultationCount}</p>
              <p className="text-xs text-muted-foreground">상담</p>
            </div>
          </div>
        </div>

        {user && (
          <Tabs defaultValue="myclass" className="mb-6">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="myclass" className="gap-1">
                <BookOpen className="w-4 h-4" />
                MY CLASS
              </TabsTrigger>
              <TabsTrigger value="bookmarks" className="gap-1">
                <Heart className="w-4 h-4" />
                찜
              </TabsTrigger>
            </TabsList>

            <TabsContent value="myclass" className="mt-4">
              <MyClassList />
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
                    <Card 
                      key={bookmark.id} 
                      className="shadow-card border-border cursor-pointer hover:shadow-soft transition-all"
                      onClick={() => navigate(`/academy/${bookmark.academy_id}`)}
                    >
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
                            onClick={(e) => {
                              e.stopPropagation();
                              removeBookmark(bookmark.id);
                            }}
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
          <MenuItemButton icon={Settings} label="설정" onClick={() => navigate("/settings")} />
          <MenuItemButton icon={HelpCircle} label="고객센터" onClick={() => navigate("/customer-service")} />
          {user && (
            <MenuItemButton 
              icon={LogOut} 
              label="로그아웃" 
              variant="destructive" 
              onClick={handleLogout}
            />
          )}
        </div>

        {user && (
          <NicknameSettingsDialog
            open={isNicknameDialogOpen}
            onOpenChange={setIsNicknameDialogOpen}
            currentNickname={profile?.user_name || ""}
            userId={user.id}
            onSuccess={(newNickname) => setProfile((prev: any) => ({ ...prev, user_name: newNickname }))}
          />
        )}
      </main>

      <BottomNavigation />
    </div>
  );
};

interface MenuItemButtonProps {
  icon: React.ElementType;
  label: string;
  variant?: "default" | "destructive";
  onClick: () => void;
}

const MenuItemButton = ({ icon: Icon, label, variant = "default", onClick }: MenuItemButtonProps) => (
  <button
    onClick={onClick}
    className="w-full flex items-center justify-between px-4 py-4 hover:bg-muted/50 transition-colors border-b border-border last:border-b-0"
  >
    <div className="flex items-center gap-3">
      <Icon className={`w-5 h-5 ${variant === "destructive" ? "text-destructive" : "text-muted-foreground"}`} />
      <span className={`text-sm font-medium ${variant === "destructive" ? "text-destructive" : "text-foreground"}`}>
        {label}
      </span>
    </div>
    <ChevronRight className="w-4 h-4 text-muted-foreground" />
  </button>
);

export default MyPage;
