import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRegion } from "@/contexts/RegionContext";
import BottomNavigation from "@/components/BottomNavigation";
import Logo from "@/components/Logo";
import AdminHeader from "@/components/AdminHeader";
import GlobalRegionSelector from "@/components/GlobalRegionSelector";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, MapPin, Filter, Heart, Calendar, Clock, Users, Building2 } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Academy = Database["public"]["Tables"]["academies"]["Row"] & {
  target_regions?: string[];
};

interface Seminar {
  id: string;
  title: string;
  description: string | null;
  date: string;
  location: string | null;
  capacity: number | null;
  status: "recruiting" | "closed";
  subject: string | null;
  target_grade: string | null;
  academy?: {
    name: string;
    target_regions?: string[];
  };
}

const ExplorePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { selectedRegion, selectedRegionName } = useRegion();
  const initialTab = searchParams.get("tab") === "seminars" ? "seminars" : "academies";
  
  const [academies, setAcademies] = useState<Academy[]>([]);
  const [seminars, setSeminars] = useState<Seminar[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string>(
    searchParams.get("subject") || "전체"
  );
  const [selectedGrade, setSelectedGrade] = useState<string>("전체");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchBookmarks(session.user.id);
      }
    });
  }, []);

  useEffect(() => {
    fetchAcademies();
    fetchSeminars();
  }, [selectedRegion]);

  const fetchAcademies = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("academies")
        .select("*")
        .contains("target_regions", [selectedRegion])
        .order("is_mou", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAcademies((data as Academy[]) || []);
    } catch (error) {
      console.error("Error fetching academies:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSeminars = async () => {
    try {
      const { data, error } = await supabase
        .from("seminars")
        .select(`
          *,
          academy:academies!inner (
            name,
            target_regions
          )
        `)
        .order("status", { ascending: true })
        .order("date", { ascending: true });

      if (error) throw error;
      
      // Filter by target_regions
      const filtered = ((data as any) || []).filter((seminar: any) => {
        const regions = seminar.academy?.target_regions || [];
        return regions.includes(selectedRegion);
      });
      
      setSeminars(filtered);
    } catch (error) {
      console.error("Error fetching seminars:", error);
    }
  };

  const fetchBookmarks = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("bookmarks")
        .select("academy_id")
        .eq("user_id", userId);

      if (error) throw error;
      setBookmarkedIds(new Set(data?.map(b => b.academy_id) || []));
    } catch (error) {
      console.error("Error fetching bookmarks:", error);
    }
  };

  const toggleBookmark = async (academyId: string) => {
    if (!user) {
      toast.error("로그인이 필요합니다");
      return;
    }

    const isBookmarked = bookmarkedIds.has(academyId);

    try {
      if (isBookmarked) {
        const { error } = await supabase
          .from("bookmarks")
          .delete()
          .eq("user_id", user.id)
          .eq("academy_id", academyId);

        if (error) throw error;

        setBookmarkedIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(academyId);
          return newSet;
        });
        toast.success("찜 목록에서 삭제되었습니다");
      } else {
        const { error } = await supabase
          .from("bookmarks")
          .insert({
            user_id: user.id,
            academy_id: academyId
          });

        if (error) throw error;

        setBookmarkedIds(prev => new Set(prev).add(academyId));
        toast.success("찜 목록에 추가되었습니다");
      }
    } catch (error) {
      console.error("Error toggling bookmark:", error);
      toast.error("오류가 발생했습니다");
    }
  };

  const subjects = ["전체", "수학", "영어", "국어", "과학", "코딩", "음악", "미술"];
  const grades = ["전체", "초등학생", "중학생", "고등학생"];

  const filteredAcademies = academies.filter(academy => {
    const matchesSubject = selectedSubject === "전체" || academy.subject === selectedSubject;
    const matchesSearch = searchQuery === "" || 
      academy.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      academy.subject.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSubject && matchesSearch;
  });

  const filteredSeminars = seminars.filter(seminar => {
    const matchesSubject = selectedSubject === "전체" || seminar.subject === selectedSubject;
    const matchesGrade = selectedGrade === "전체" || seminar.target_grade === selectedGrade;
    const matchesSearch = searchQuery === "" || 
      seminar.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSubject && matchesGrade && matchesSearch;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-card/80 backdrop-blur-lg border-b border-border z-40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size="sm" showText={false} />
            <GlobalRegionSelector />
          </div>
          <AdminHeader />
        </div>
      </header>

      {/* Toggle Tabs */}
      <div className="bg-card border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="academies" className="gap-1">
                <Building2 className="w-4 h-4" />
                학원 찾기
              </TabsTrigger>
              <TabsTrigger value="seminars" className="gap-1">
                <Calendar className="w-4 h-4" />
                설명회 찾기
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Search */}
      <div className="bg-card border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={activeTab === "academies" ? "학원명, 과목으로 검색" : "설명회 제목으로 검색"}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-muted border-none text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <Button variant="outline" size="icon" className="shrink-0">
              <Filter className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Map Area (Academies only) */}
      {activeTab === "academies" && (
        <div className="h-36 bg-secondary/50 flex items-center justify-center border-b border-border">
          <div className="text-center">
            <MapPin className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">지도에서 학원 찾기</p>
          </div>
        </div>
      )}

      {/* Filter Tags */}
      <div className="max-w-lg mx-auto px-4 py-3 border-b border-border bg-card">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-2">
          {subjects.map((subject) => (
            <Button
              key={subject}
              variant={selectedSubject === subject ? "default" : "outline"}
              size="sm"
              className="shrink-0"
              onClick={() => setSelectedSubject(subject)}
            >
              {subject}
            </Button>
          ))}
        </div>
        {activeTab === "seminars" && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {grades.map((grade) => (
              <Button
                key={grade}
                variant={selectedGrade === grade ? "secondary" : "ghost"}
                size="sm"
                className="shrink-0"
                onClick={() => setSelectedGrade(grade)}
              >
                {grade}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Results */}
      <main className="max-w-lg mx-auto px-4 py-4">
        {activeTab === "academies" ? (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              총 <span className="text-primary font-semibold">{filteredAcademies.length}개</span> 학원
            </p>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : filteredAcademies.length === 0 ? (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">검색 결과가 없습니다</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAcademies.map((academy) => (
                  <div
                    key={academy.id}
                    onClick={() => navigate(`/academy/${academy.id}`)}
                    className="bg-card border border-border rounded-xl p-4 shadow-card hover:shadow-soft transition-all duration-200 cursor-pointer"
                  >
                    <div className="flex gap-4">
                      <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
                        {academy.profile_image ? (
                          <img 
                            src={academy.profile_image} 
                            alt={academy.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xl font-bold text-primary">
                            {academy.name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-foreground truncate">{academy.name}</h4>
                            <p className="text-sm text-muted-foreground">{academy.subject} 전문</p>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleBookmark(academy.id); }}
                            className="p-1.5 hover:bg-muted rounded-full transition-colors shrink-0 ml-2"
                          >
                            <Heart 
                              className={`w-5 h-5 transition-colors ${
                                bookmarkedIds.has(academy.id) 
                                  ? "fill-red-500 text-red-500" 
                                  : "text-muted-foreground hover:text-red-500"
                              }`} 
                            />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {academy.is_mou && (
                            <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                              MOU
                            </Badge>
                          )}
                          {academy.tags && academy.tags.slice(0, 2).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        {academy.address && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {academy.address}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              총 <span className="text-primary font-semibold">{filteredSeminars.length}개</span> 설명회
            </p>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : filteredSeminars.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">검색 결과가 없습니다</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSeminars.map((seminar) => (
                  <div
                    key={seminar.id}
                    onClick={() => navigate(`/seminar/${seminar.id}`)}
                    className="bg-card border border-border rounded-xl p-4 shadow-card hover:shadow-soft transition-all duration-200 cursor-pointer"
                  >
                    <div className="flex gap-4">
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0">
                        <Calendar className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant={seminar.status === "recruiting" ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {seminar.status === "recruiting" ? "모집중" : "마감"}
                          </Badge>
                          {seminar.subject && (
                            <Badge variant="outline" className="text-xs">
                              {seminar.subject}
                            </Badge>
                          )}
                        </div>
                        <h4 className="font-semibold text-foreground line-clamp-1">
                          {seminar.title}
                        </h4>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(seminar.date)} {formatTime(seminar.date)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {seminar.capacity || 30}명
                          </span>
                        </div>
                        {seminar.academy && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {seminar.academy.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
};

export default ExplorePage;
