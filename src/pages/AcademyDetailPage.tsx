import { useEffect, useState, lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrCreateChatRoom } from "@/hooks/useChatRooms";
import Logo from "@/components/Logo";
import BottomNavigation from "@/components/BottomNavigation";
import AcademyNewsTab from "@/components/AcademyNewsTab";
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
  Newspaper,
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

// Mock data for when DB is empty
const mockInstructors: Teacher[] = [
  {
    id: 'mock-1',
    name: '김에듀 원장',
    subject: '수학',
    bio: '서울대 수학교육과 졸 / 전 대치 명문학원 10년 경력 / 수능 수학의 본질을 꿰뚫는 강의',
    image_url: null,
  },
  {
    id: 'mock-2',
    name: '이영어 선생님',
    subject: '영어',
    bio: '연세대 영문과 졸 / 토익 만점 / 문법부터 독해까지 한 번에 정리',
    image_url: null,
  },
  {
    id: 'mock-3',
    name: '박논술 선생님',
    subject: '국어/논술',
    bio: '고려대 국어국문 졸 / 대입 논술 전문 / 꼼꼼한 첨삭 지도',
    image_url: null,
  },
  {
    id: 'mock-4',
    name: '최과학 선생님',
    subject: '과학(물리/화학)',
    bio: 'KAIST 물리학과 졸 / 과학고 출신 / 원리부터 심화까지 체계적 강의',
    image_url: null,
  },
];

const mockCourses: ClassInfo[] = [
  {
    id: 'mock-c1',
    name: '[고2] 수1/수2 심화 완성반',
    target_grade: '고등학교 2학년',
    schedule: '월/수/금 18:00~22:00',
    fee: 450000,
    description: '겨울방학 특강, 내신/수능 대비',
    is_recruiting: true,
  },
  {
    id: 'mock-c2',
    name: '[중3] 예비고1 영어 문법 마스터',
    target_grade: '중학교 3학년',
    schedule: '화/목 17:00~20:00',
    fee: 350000,
    description: '고등 문법 기초, 서술형 대비',
    is_recruiting: true,
  },
  {
    id: 'mock-c3',
    name: '[고3] 수능 국어 파이널 실전반',
    target_grade: '고등학교 3학년',
    schedule: '토 10:00~13:00',
    fee: 280000,
    description: '실전 모의고사, 1:1 클리닉',
    is_recruiting: true,
  },
  {
    id: 'mock-c4',
    name: '[고1] 내신 대비 과학 집중반',
    target_grade: '고등학교 1학년',
    schedule: '화/목 19:00~22:00',
    fee: 400000,
    description: '물리/화학 내신 1등급 목표',
    is_recruiting: false,
  },
];

const AcademyDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getOrCreateChatRoom, loading: chatLoading } = useOrCreateChatRoom();
  const [academy, setAcademy] = useState<Academy | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null);

  // Consultation form
  const [studentName, setStudentName] = useState("");
  const [studentGrade, setStudentGrade] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleStartChat = async () => {
    if (!user) {
      toast.error("로그인이 필요합니다");
      navigate("/auth");
      return;
    }

    if (!id) return;

    const roomId = await getOrCreateChatRoom(id);
    if (roomId) {
      navigate(`/chats/${roomId}`);
    } else {
      toast.error("채팅방 생성에 실패했습니다");
    }
  };

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
          <Logo size="sm" showText={false} />
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
              <Newspaper className="w-3 h-3" />
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

          {/* News Tab - Academy's feed_posts */}
          <TabsContent value="news" className="space-y-4">
            <AcademyNewsTab 
              academyId={id!} 
              academyName={academy.name}
              academyProfileImage={academy.profile_image}
            />
          </TabsContent>

          {/* Teachers Tab */}
          <TabsContent value="teachers" className="space-y-4">
            {(() => {
              const displayTeachers = teachers.length > 0 ? teachers : mockInstructors;
              return (
                <div className="space-y-3">
                  {displayTeachers.map((teacher) => (
                    <Card key={teacher.id} className="shadow-card overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center overflow-hidden shrink-0">
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
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-foreground">{teacher.name}</h4>
                              <Badge variant="secondary" className="text-xs">
                                {teacher.subject || "과목 미지정"}
                              </Badge>
                            </div>
                            {teacher.bio && (
                              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                                {teacher.bio}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              );
            })()}
          </TabsContent>

          {/* Classes Tab */}
          <TabsContent value="classes" className="space-y-4">
            {(() => {
              const displayClasses = classes.length > 0 ? classes : mockCourses;
              return (
                <div className="space-y-3">
                  {displayClasses.map((cls) => (
                    <Card 
                      key={cls.id} 
                      className="shadow-card overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => setSelectedClass(cls)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-foreground">{cls.name}</h4>
                              {cls.is_recruiting ? (
                                <Badge className="bg-green-500 text-white text-[10px] px-1.5 py-0">모집중</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">마감</Badge>
                              )}
                            </div>
                            
                            <div className="flex flex-wrap gap-2 mb-2">
                              {cls.target_grade && (
                                <Badge variant="outline" className="text-xs gap-1">
                                  <Users className="w-3 h-3" />
                                  {cls.target_grade}
                                </Badge>
                              )}
                              {cls.schedule && (
                                <Badge variant="outline" className="text-xs gap-1">
                                  <Clock className="w-3 h-3" />
                                  {cls.schedule}
                                </Badge>
                              )}
                            </div>
                            
                            {cls.description && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {cls.description.split(',').map((tag, idx) => (
                                  <span key={idx} className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                    {tag.trim()}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          <div className="text-right shrink-0">
                            {cls.fee && (
                              <p className="font-bold text-primary text-lg">
                                {cls.fee.toLocaleString()}원
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">/월</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              );
            })()}
          </TabsContent>
        </Tabs>

        {/* Class Detail Dialog */}
        <Dialog open={!!selectedClass} onOpenChange={() => setSelectedClass(null)}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                {selectedClass?.name}
                {selectedClass?.is_recruiting ? (
                  <Badge className="bg-green-500 text-white text-xs">모집중</Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">마감</Badge>
                )}
              </DialogTitle>
            </DialogHeader>
            
            {selectedClass && (
              <div className="space-y-5 py-2">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-secondary/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">대상 학년</p>
                    <p className="font-medium text-sm">{selectedClass.target_grade || "미지정"}</p>
                  </div>
                  <div className="bg-secondary/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">수강료</p>
                    <p className="font-bold text-primary">
                      {selectedClass.fee ? `${selectedClass.fee.toLocaleString()}원/월` : "문의"}
                    </p>
                  </div>
                </div>

                {/* Schedule */}
                {selectedClass.schedule && (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      수업 일정
                    </h4>
                    <p className="text-sm text-muted-foreground bg-secondary/30 rounded-lg p-3">
                      {selectedClass.schedule}
                    </p>
                  </div>
                )}

                {/* Features */}
                {selectedClass.description && (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2">강좌 특징</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedClass.description.split(',').map((tag, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {tag.trim()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Curriculum */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1">
                    <BookOpen className="w-4 h-4" />
                    커리큘럼
                  </h4>
                  <div className="space-y-2 bg-secondary/30 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-primary">1</span>
                      </div>
                      <p className="text-sm text-muted-foreground">기초 개념 정립 및 원리 이해</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-primary">2</span>
                      </div>
                      <p className="text-sm text-muted-foreground">유형별 문제 풀이 및 심화 학습</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-primary">3</span>
                      </div>
                      <p className="text-sm text-muted-foreground">실전 모의고사 및 취약점 보완</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-primary">4</span>
                      </div>
                      <p className="text-sm text-muted-foreground">1:1 클리닉 및 개인별 피드백</p>
                    </div>
                  </div>
                </div>

                {/* Teacher Info */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1">
                    <GraduationCap className="w-4 h-4" />
                    담당 선생님
                  </h4>
                  <Card className="shadow-none border">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                          <GraduationCap className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {selectedClass.teacher?.name || "김에듀 원장"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            전문 강사 / 10년 이상 경력
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* CTA Button */}
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={() => {
                    setSelectedClass(null);
                    setIsDialogOpen(true);
                  }}
                >
                  상담 신청하기
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>

      {/* Fixed Bottom Buttons */}
      <div className="fixed bottom-16 left-0 right-0 bg-card border-t border-border p-4 z-50">
        <div className="max-w-lg mx-auto flex gap-3">
          <Button
            variant="outline"
            className="flex-1 h-14 text-base gap-2"
            size="xl"
            onClick={handleStartChat}
            disabled={chatLoading}
          >
            <MessageCircle className="w-5 h-5" />
            {chatLoading ? "연결 중..." : "채팅 상담"}
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
