import { useEffect, useState, lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Logo from "@/components/Logo";
import BottomNavigation from "@/components/BottomNavigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  MapPin,
  Users,
  BookOpen,
  Home,
  GraduationCap,
  Calendar,
  Clock,
  Heart,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { logError } from "@/lib/errorLogger";
import { consultationSchema, validateInput } from "@/lib/validation";

const LocationMap = lazy(() => import("@/components/LocationMap"));

interface Academy {
  id: string;
  name: string;
  subject: string;
  description: string | null;
  address: string | null;
  profile_image: string | null;
  tags: string[] | null;
  is_mou: boolean | null;
}

interface Teacher {
  id: string;
  name: string;
  subject: string | null;
  bio: string | null;
  image_url: string | null;
}

interface ClassInfo {
  id: string;
  name: string;
  target_grade: string | null;
  schedule: string | null;
  fee: number | null;
  description: string | null;
  is_recruiting: boolean | null;
  teacher?: {
    name: string;
  };
}

const AcademyDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [academy, setAcademy] = useState<Academy | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Consultation form
  const [studentName, setStudentName] = useState("");
  const [studentGrade, setStudentGrade] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user && id) {
        checkBookmark(session.user.id, id);
      }
    });

    if (id) {
      fetchAcademy();
      fetchTeachers();
      fetchClasses();
    }
  }, [id]);

  const fetchAcademy = async () => {
    try {
      const { data, error } = await supabase
        .from("academies")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      setAcademy(data);
    } catch (error) {
      logError("fetch-academy", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    const { data } = await supabase
      .from("teachers")
      .select("*")
      .eq("academy_id", id)
      .order("created_at");
    setTeachers((data as Teacher[]) || []);
  };

  const fetchClasses = async () => {
    const { data } = await supabase
      .from("classes")
      .select(`
        *,
        teacher:teachers (name)
      `)
      .eq("academy_id", id)
      .order("created_at");
    setClasses((data as any) || []);
  };

  const checkBookmark = async (userId: string, academyId: string) => {
    const { data } = await supabase
      .from("bookmarks")
      .select("id")
      .eq("user_id", userId)
      .eq("academy_id", academyId)
      .maybeSingle();
    setIsBookmarked(!!data);
  };

  const toggleBookmark = async () => {
    if (!user || !id) {
      toast.error("로그인이 필요합니다");
      return;
    }

    try {
      if (isBookmarked) {
        await supabase
          .from("bookmarks")
          .delete()
          .eq("user_id", user.id)
          .eq("academy_id", id);
        setIsBookmarked(false);
        toast.success("찜 목록에서 삭제되었습니다");
      } else {
        await supabase.from("bookmarks").insert({
          user_id: user.id,
          academy_id: id,
        });
        setIsBookmarked(true);
        toast.success("찜 목록에 추가되었습니다");
      }
    } catch (error) {
      logError("toggle-bookmark", error);
    }
  };

  const handleConsultationSubmit = async () => {
    if (!user) {
      toast.error("로그인이 필요합니다");
      navigate("/auth");
      return;
    }

    // Validate input
    const validation = validateInput(consultationSchema, {
      student_name: studentName,
      student_grade: studentGrade || null,
      message: message || null,
    });

    if (!validation.success) {
      toast.error((validation as { success: false; error: string }).error);
      return;
    }

    const validatedData = (validation as { success: true; data: { student_name: string; student_grade?: string | null; message?: string | null } }).data;

    setSubmitting(true);
    try {
      const { error } = await supabase.from("consultations").insert({
        academy_id: id,
        parent_id: user.id,
        student_name: validatedData.student_name,
        student_grade: validatedData.student_grade,
        message: validatedData.message,
      });

      if (error) throw error;

      toast.success("상담 신청이 완료되었습니다");
      setIsDialogOpen(false);
      setStudentName("");
      setStudentGrade("");
      setMessage("");
    } catch (error) {
      logError("submit-consultation", error);
      toast.error("신청에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!academy) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">학원을 찾을 수 없습니다</p>
        <Button onClick={() => navigate(-1)}>뒤로 가기</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <header className="sticky top-0 bg-card/80 backdrop-blur-lg border-b border-border z-40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Logo size="sm" />
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleBookmark}
          >
            <Heart
              className={`w-5 h-5 ${
                isBookmarked ? "fill-red-500 text-red-500" : ""
              }`}
            />
          </Button>
        </div>
      </header>

      {/* Hero Image */}
      <div className="h-48 bg-gradient-to-br from-primary/20 to-accent/20">
        {academy.profile_image ? (
          <img
            src={academy.profile_image}
            alt={academy.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <GraduationCap className="w-16 h-16 text-primary" />
          </div>
        )}
      </div>

      {/* Academy Info */}
      <div className="max-w-lg mx-auto px-4 -mt-6 relative z-10">
        <Card className="shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              {academy.is_mou && (
                <Badge className="bg-primary/10 text-primary">MOU</Badge>
              )}
              <Badge variant="outline">{academy.subject}</Badge>
            </div>
            <h1 className="text-xl font-bold text-foreground mb-1">
              {academy.name}
            </h1>
            {academy.address && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {academy.address}
              </p>
            )}
            {academy.tags && academy.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {academy.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <main className="max-w-lg mx-auto px-4 py-6">
        <Tabs defaultValue="home" className="w-full">
          <TabsList className="w-full grid grid-cols-4 mb-6">
            <TabsTrigger value="home" className="gap-1 text-xs">
              <Home className="w-3 h-3" />
              홈
            </TabsTrigger>
            <TabsTrigger value="news" className="gap-1 text-xs">
              <BookOpen className="w-3 h-3" />
              소식
            </TabsTrigger>
            <TabsTrigger value="teachers" className="gap-1 text-xs">
              <Users className="w-3 h-3" />
              강사진
            </TabsTrigger>
            <TabsTrigger value="classes" className="gap-1 text-xs">
              <Calendar className="w-3 h-3" />
              개설 강좌
            </TabsTrigger>
          </TabsList>

          {/* Home Tab */}
          <TabsContent value="home" className="space-y-4">
            <Card className="shadow-card">
              <CardContent className="p-4">
                <h3 className="font-semibold text-foreground mb-3">학원 소개</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {academy.description || "등록된 소개글이 없습니다."}
                </p>
              </CardContent>
            </Card>

            {academy.address && (
              <Card className="shadow-card">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-foreground mb-3">위치</h3>
                  <Suspense fallback={
                    <div className="w-full h-48 rounded-lg bg-secondary/50 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                  }>
                    <LocationMap address={academy.address} name={academy.name} />
                  </Suspense>
                  <p className="text-sm text-muted-foreground mt-3">{academy.address}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Teachers Tab */}
          <TabsContent value="teachers" className="space-y-4">
            {teachers.length === 0 ? (
              <Card className="shadow-card">
                <CardContent className="p-6 text-center">
                  <Users className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">등록된 강사 정보가 없습니다</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {teachers.map((teacher) => (
                  <Card key={teacher.id} className="shadow-card">
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center overflow-hidden shrink-0">
                          {teacher.image_url ? (
                            <img
                              src={teacher.image_url}
                              alt={teacher.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <GraduationCap className="w-8 h-8 text-primary" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground">{teacher.name}</h4>
                          <p className="text-sm text-primary">{teacher.subject || "과목 미지정"}</p>
                          {teacher.bio && (
                            <p className="text-xs text-muted-foreground mt-2 line-clamp-3">
                              {teacher.bio}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Classes Tab */}
          <TabsContent value="classes" className="space-y-4">
            {classes.length === 0 ? (
              <Card className="shadow-card">
                <CardContent className="p-6 text-center">
                  <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">등록된 강좌 정보가 없습니다</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>강좌명</TableHead>
                      <TableHead>대상</TableHead>
                      <TableHead className="text-right">수강료</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classes.map((cls) => (
                      <TableRow key={cls.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{cls.name}</p>
                            {cls.schedule && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <Calendar className="w-3 h-3" />
                                {cls.schedule}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {cls.target_grade || "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {cls.fee ? `${cls.fee.toLocaleString()}원` : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Fixed Bottom Buttons */}
      <div className="fixed bottom-16 left-0 right-0 bg-card border-t border-border p-4 z-50">
        <div className="max-w-lg mx-auto flex gap-3">
          <Button
            variant="outline"
            className="flex-1 h-14 text-base gap-2"
            size="xl"
            onClick={() => navigate(`/chats/${id}`)}
          >
            <MessageCircle className="w-5 h-5" />
            채팅 상담
          </Button>
          <Button
            className="flex-1 h-14 text-base"
            size="xl"
            onClick={() => setIsDialogOpen(true)}
          >
            방문 상담 신청
          </Button>
        </div>
      </div>

      {/* Consultation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>방문 상담 신청</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="studentName">학생 이름 *</Label>
              <Input
                id="studentName"
                placeholder="학생 이름을 입력하세요"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="studentGrade">학년</Label>
              <Input
                id="studentGrade"
                placeholder="예: 중학교 2학년"
                value={studentGrade}
                onChange={(e) => setStudentGrade(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">문의 사항</Label>
              <Textarea
                id="message"
                placeholder="궁금한 점이 있으시면 적어주세요"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleConsultationSubmit}
              disabled={submitting}
            >
              {submitting ? "신청 중..." : "신청 완료"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNavigation />
    </div>
  );
};

export default AcademyDetailPage;
