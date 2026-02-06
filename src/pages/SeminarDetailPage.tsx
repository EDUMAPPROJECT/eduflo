import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { SurveyField, SurveyAnswer } from "@/types/surveyField";
import { supabase } from "@/integrations/supabase/client";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import ImageCarouselWithIndicators from "@/components/ImageCarouselWithIndicators";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  Building2,
  GraduationCap,
  CheckCircle2,
  Share2,
  Heart,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { logError } from "@/lib/errorLogger";
import { seminarApplicationSchema, validateInput } from "@/lib/validation";
import LoginRequiredDialog from "@/components/LoginRequiredDialog";
import SurveyFormRenderer from "@/components/SurveyFormRenderer";

interface Seminar {
  id: string;
  academy_id: string | null;
  author_id: string | null;
  title: string;
  description: string | null;
  date: string;
  location: string | null;
  image_url: string | null;
  capacity: number | null;
  status: "recruiting" | "closed";
  subject: string | null;
  target_grade: string | null;
  custom_questions: string[] | null;
  academy?: {
    name: string;
    address: string | null;
    profile_image: string | null;
  } | null;
  author?: {
    user_name: string | null;
  } | null;
}

const SeminarDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [seminar, setSeminar] = useState<Seminar | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [applicationCount, setApplicationCount] = useState(0);
  const [hasApplied, setHasApplied] = useState(false);
  const [myApplication, setMyApplication] = useState<any>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);

  // Form state
  const [studentName, setStudentName] = useState("");
  const [studentGrade, setStudentGrade] = useState("");
  const [attendeeCount, setAttendeeCount] = useState(1);
  const [message, setMessage] = useState("");
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});
  const surveyFormRef = useRef<{ triggerSubmit: () => void; isValid: () => boolean; getAnswers: () => Record<string, SurveyAnswer> } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user && id) {
        checkExistingApplication(session.user.id);
      }
    });

    if (id) {
      fetchSeminar();
      fetchApplicationCount();
    }
  }, [id]);

  const fetchSeminar = async () => {
    try {
      const { data, error } = await supabase
        .from("seminars")
        .select(`
          *,
          academy:academies (
            name,
            address,
            profile_image
          )
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      
      // If no academy, fetch author name
      let seminarData = data as any;
      if (seminarData && !seminarData.academy_id && seminarData.author_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_name")
          .eq("id", seminarData.author_id)
          .maybeSingle();
        
        if (profile) {
          seminarData = { ...seminarData, author: profile };
        }
      }
      
      setSeminar(seminarData);
    } catch (error) {
      logError("fetch-seminar", error);
      toast.error("설명회 정보를 불러올 수 없습니다");
    } finally {
      setLoading(false);
    }
  };

  const fetchApplicationCount = async () => {
    try {
      const { count } = await supabase
        .from("seminar_applications")
        .select("*", { count: "exact", head: true })
        .eq("seminar_id", id);

      setApplicationCount(count || 0);
    } catch (error) {
      logError("fetch-application-count", error);
    }
  };

  const checkExistingApplication = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("seminar_applications")
        .select("*")
        .eq("seminar_id", id)
        .eq("user_id", userId)
        .maybeSingle();

      if (data) {
        setHasApplied(true);
        setMyApplication(data);
      }
    } catch (error) {
      logError("check-application", error);
    }
  };

  const handleApply = async () => {
    if (!user) {
      setShowLoginDialog(true);
      return;
    }

    // Validate input
    const validation = validateInput(seminarApplicationSchema, {
      student_name: studentName,
      student_grade: studentGrade || null,
      message: message || null,
      attendee_count: attendeeCount,
    });

    if (!validation.success) {
      toast.error((validation as { success: false; error: string }).error);
      return;
    }

    const validatedData = (validation as { success: true; data: { student_name: string; student_grade?: string | null; message?: string | null; attendee_count: number } }).data;
    // Collect survey answers
    const surveyFields: SurveyField[] = (seminar as any).survey_fields || [];
    let surveyAnswers: Record<string, SurveyAnswer> = {};
    if (surveyFields.length > 0 && surveyFormRef.current) {
      // Trigger survey form validation
      const isValid = surveyFormRef.current.isValid();
      if (!isValid) {
        toast.error('설문 항목을 모두 확인해주세요');
        return;
      }
      surveyAnswers = surveyFormRef.current.getAnswers();
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("seminar_applications").insert({
        seminar_id: id,
        user_id: user.id,
        student_name: validatedData.student_name,
        student_grade: validatedData.student_grade,
        attendee_count: validatedData.attendee_count,
        message: validatedData.message,
        custom_answers: (Object.keys(surveyAnswers).length > 0 ? surveyAnswers : (Object.keys(customAnswers).length > 0 ? customAnswers : null)) as any,
      });

      if (error) throw error;

      toast.success("설명회 신청이 완료되었습니다");
      setIsDialogOpen(false);
      setHasApplied(true);
      setMyApplication({
        student_name: studentName,
        student_grade: studentGrade,
        attendee_count: attendeeCount,
      });
      resetForm();
      fetchApplicationCount();
    } catch (error) {
      logError("apply-seminar", error);
      toast.error("신청에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setStudentName("");
    setStudentGrade("");
    setAttendeeCount(1);
    setMessage("");
    setCustomAnswers({});
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
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

  const getDDay = (dateString: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const seminarDate = new Date(dateString);
    seminarDate.setHours(0, 0, 0, 0);
    const diffTime = seminarDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "D-Day";
    if (diffDays > 0) return `D-${diffDays}`;
    return null;
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: seminar?.title || "설명회",
          text: `${seminar?.academy?.name || "학원"} - ${seminar?.title}`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("링크가 복사되었습니다");
      }
    } catch (error) {
      logError("share", error);
    }
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    toast.success(isLiked ? "찜 목록에서 삭제되었습니다" : "찜 목록에 추가되었습니다");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!seminar) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-4">
        <AlertCircle className="w-16 h-16 text-muted-foreground" />
        <p className="text-muted-foreground text-center">설명회를 찾을 수 없습니다</p>
        <Button onClick={() => navigate(-1)}>뒤로 가기</Button>
      </div>
    );
  }

  const capacity = seminar.capacity || 30;
  const remainingSpots = capacity - applicationCount;
  const fillRate = (applicationCount / capacity) * 100;
  const dDay = getDDay(seminar.date);
  const isUrgent = dDay && dDay !== "D-Day" && parseInt(dDay.replace("D-", "")) <= 3;

  // Generate tags
  const tags: string[] = [];
  if (seminar.target_grade) tags.push(`#${seminar.target_grade}`);
  if (seminar.subject) tags.push(`#${seminar.subject}`);

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <header className="sticky top-0 bg-card/80 backdrop-blur-lg border-b border-border z-40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Logo size="sm" showText={false} />
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={handleLike}>
              <Heart className={`w-5 h-5 ${isLiked ? "fill-destructive text-destructive" : ""}`} />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleShare}>
              <Share2 className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Image(s) */}
      {(() => {
        // Parse image URLs with improved logic
        let imageUrls: string[] = [];
        if (seminar.image_url) {
          // Check if it's already a valid URL
          if (seminar.image_url.startsWith('http://') || seminar.image_url.startsWith('https://')) {
            imageUrls = [seminar.image_url];
          } else {
            try {
              const parsed = JSON.parse(seminar.image_url);
              imageUrls = Array.isArray(parsed) ? parsed : [seminar.image_url];
            } catch {
              imageUrls = [seminar.image_url];
            }
          }
        }

        if (imageUrls.length > 1) {
          return (
            <ImageCarouselWithIndicators 
              imageUrls={imageUrls} 
              title={seminar.title} 
            />
          );
        } else {
          // Single or no image
          return (
            <div className="max-w-lg mx-auto bg-gradient-to-br from-primary/20 via-accent/10 to-secondary/30 flex items-center justify-center">
              {imageUrls.length === 1 ? (
                <img
                  src={imageUrls[0]}
                  alt={seminar.title}
                  className="w-full h-auto max-h-[70vh] object-contain"
                />
              ) : (
                <div className="text-center p-6">
                  <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3">
                    <GraduationCap className="w-12 h-12 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">설명회 포스터</p>
                </div>
              )}
            </div>
          );
        }
      })()}

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Academy/Author Info */}
        {(seminar.academy || seminar.author) && (
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden ${seminar.academy ? 'bg-secondary' : 'bg-primary/20'}`}>
              {seminar.academy?.profile_image ? (
                <img
                  src={seminar.academy.profile_image}
                  alt={seminar.academy.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building2 className="w-5 h-5 text-primary" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                {seminar.academy ? seminar.academy.name : (seminar.author?.user_name || '운영자')}
              </span>
              {!seminar.academy && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600">운영자</span>
              )}
            </div>
          </div>
        )}

        {/* Title */}
        <h1 className="text-2xl font-bold text-foreground mb-3 leading-tight">
          {seminar.title}
        </h1>

        {/* Status & D-Day Badges - moved from image */}
        <div className="flex items-center gap-2 mb-4">
          <Badge
            className={`${
              seminar.status === "recruiting"
                ? isUrgent
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            } px-3 py-1 text-xs font-semibold`}
          >
            {seminar.status === "recruiting" ? (isUrgent ? "마감임박" : "모집중") : "마감"}
          </Badge>
          {dDay && (
            <Badge
              className={`${
                dDay === "D-Day" || isUrgent
                  ? "bg-destructive/20 text-destructive border border-destructive/30"
                  : "bg-secondary text-secondary-foreground"
              } px-3 py-1 text-xs font-bold`}
            >
              {dDay}
            </Badge>
          )}
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {tags.map((tag, idx) => (
              <span
                key={idx}
                className="px-3 py-1.5 bg-secondary/60 text-secondary-foreground text-sm font-medium rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Info Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-card border border-border rounded-xl p-4 shadow-card">
            <div className="flex items-center gap-2 text-primary mb-2">
              <Calendar className="w-5 h-5" />
              <span className="text-xs font-semibold">날짜</span>
            </div>
            <p className="text-sm font-bold text-foreground">
              {formatDate(seminar.date)}
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 shadow-card">
            <div className="flex items-center gap-2 text-primary mb-2">
              <Clock className="w-5 h-5" />
              <span className="text-xs font-semibold">시간</span>
            </div>
            <p className="text-sm font-bold text-foreground">
              {formatTime(seminar.date)}
            </p>
          </div>
          {(() => {
            let locName = "";
            let locDetail = "";
            let locAddress = "";
            if (seminar.location) {
              try {
                const parsed = JSON.parse(seminar.location);
                locName = parsed.name || "";
                locDetail = parsed.detail || "";
                locAddress = parsed.address || "";
              } catch {
                locName = seminar.location;
              }
            }
            return (
              <div className="bg-card border border-border rounded-xl p-4 col-span-2 shadow-card">
                <div className="flex items-center gap-2 text-primary mb-2">
                  <MapPin className="w-5 h-5" />
                  <span className="text-xs font-semibold">장소</span>
                </div>
                {locName || locDetail || locAddress ? (
                  <div className="space-y-1">
                    {locName && <p className="text-sm font-bold text-foreground">{locName}</p>}
                    {locDetail && <p className="text-sm text-muted-foreground">{locDetail}</p>}
                    {locAddress && <p className="text-xs text-muted-foreground">{locAddress}</p>}
                  </div>
                ) : (
                  <p className="text-sm font-medium text-foreground">장소 미정</p>
                )}
              </div>
            );
          })()}
        </div>

        {/* Capacity with Progress */}
        <div className="bg-card border border-border rounded-xl p-4 mb-6 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-primary">
              <Users className="w-5 h-5" />
              <span className="text-xs font-semibold">모집 현황</span>
            </div>
            <span className="text-sm font-bold text-foreground">
              {applicationCount} / {capacity}명
            </span>
          </div>
          <Progress value={fillRate} className="h-2.5 mb-2" />
          <p className={`text-xs font-medium ${remainingSpots <= 5 ? "text-destructive" : "text-muted-foreground"}`}>
            {remainingSpots > 0 
              ? `${remainingSpots}자리 남음${remainingSpots <= 5 ? " - 서두르세요!" : ""}` 
              : "마감되었습니다"}
          </p>
        </div>

        {/* Description */}
        <div className="mb-6">
          <h2 className="font-bold text-foreground text-lg mb-3">설명회 안내</h2>
          <div className="bg-card border border-border rounded-xl p-5 shadow-card">
            <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {seminar.description
                ? seminar.description.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
                    part.startsWith('**') && part.endsWith('**')
                      ? <strong key={i}>{part.slice(2, -2)}</strong>
                      : part
                  )
                : "상세 내용이 없습니다."}
            </div>
          </div>
        </div>

        {/* My Application Status */}
        {hasApplied && myApplication && (
          <div className="mb-6">
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-5">
              <div className="flex items-center gap-2 text-primary mb-3">
                <CheckCircle2 className="w-6 h-6" />
                <span className="font-bold text-lg">신청 완료</span>
              </div>
              <p className="text-sm text-foreground">
                <span className="font-semibold">{myApplication.student_name}</span> ({myApplication.student_grade})
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {myApplication.attendee_count}명 참석 예정
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border p-4 z-50">
        <div className="max-w-lg mx-auto">
          {hasApplied ? (
            <Button
              className="w-full h-14 text-base font-semibold"
              variant="secondary"
              disabled
            >
              <CheckCircle2 className="w-5 h-5 mr-2" />
              신청 완료됨
            </Button>
          ) : (
            <Button
              className="w-full h-14 text-base font-semibold"
              size="xl"
              disabled={seminar.status === "closed" || remainingSpots <= 0}
              onClick={() => {
                if (!user) {
                  setShowLoginDialog(true);
                  return;
                }
                setIsDialogOpen(true);
              }}
            >
              {seminar.status === "closed" || remainingSpots <= 0
                ? "모집 마감"
                : "설명회 참가 신청하기"}
            </Button>
          )}
        </div>
      </div>

      {/* Application Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-sm mx-auto max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-lg">설명회 참가 신청</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 overflow-y-auto flex-1 min-h-0 pr-1">
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
              <Label htmlFor="studentGrade">학년 *</Label>
              <Select value={studentGrade} onValueChange={setStudentGrade}>
                <SelectTrigger>
                  <SelectValue placeholder="학년을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="초등 1학년">초등 1학년</SelectItem>
                  <SelectItem value="초등 2학년">초등 2학년</SelectItem>
                  <SelectItem value="초등 3학년">초등 3학년</SelectItem>
                  <SelectItem value="초등 4학년">초등 4학년</SelectItem>
                  <SelectItem value="초등 5학년">초등 5학년</SelectItem>
                  <SelectItem value="초등 6학년">초등 6학년</SelectItem>
                  <SelectItem value="중학교 1학년">중학교 1학년</SelectItem>
                  <SelectItem value="중학교 2학년">중학교 2학년</SelectItem>
                  <SelectItem value="중학교 3학년">중학교 3학년</SelectItem>
                  <SelectItem value="고등학교 1학년">고등학교 1학년</SelectItem>
                  <SelectItem value="고등학교 2학년">고등학교 2학년</SelectItem>
                  <SelectItem value="고등학교 3학년">고등학교 3학년</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="attendeeCount">참석 인원</Label>
              <Input
                id="attendeeCount"
                type="number"
                min={1}
                max={5}
                value={attendeeCount}
                onChange={(e) => setAttendeeCount(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">질문 사항 (선택)</Label>
              <Textarea
                id="message"
                placeholder="설명회에서 듣고 싶은 내용이 있으시면 적어주세요"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>

            {/* Survey Fields from Seminar */}
            {(() => {
              const surveyFields: SurveyField[] = (seminar as any).survey_fields || [];
              if (surveyFields.length === 0) return null;
              return (
                <div className="pt-3 border-t border-border space-y-2">
                  <p className="text-sm font-medium text-foreground">추가 설문</p>
                  <SurveyFormRenderer
                    fields={surveyFields}
                    onSubmit={() => {}}
                    renderOnly
                    formRef={surveyFormRef}
                  />
                </div>
              );
            })()}

            {/* Legacy custom questions fallback */}
            {seminar.custom_questions && seminar.custom_questions.length > 0 && !((seminar as any).survey_fields?.length > 0) && (
              <div className="space-y-3 pt-3 border-t border-border">
                <p className="text-sm font-medium text-foreground">추가 질문</p>
                {seminar.custom_questions.map((question, index) => (
                  <div key={index} className="space-y-1">
                    <Label className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {question}
                    </Label>
                    <Input
                      placeholder="답변을 입력하세요"
                      value={customAnswers[question] || ""}
                      onChange={(e) => setCustomAnswers({
                        ...customAnswers,
                        [question]: e.target.value
                      })}
                    />
                  </div>
                ))}
              </div>
            )}

            <Button
              className="w-full h-12 font-semibold"
              onClick={handleApply}
              disabled={submitting}
            >
              {submitting ? "신청 중..." : "신청 완료"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <LoginRequiredDialog open={showLoginDialog} onOpenChange={setShowLoginDialog} />
    </div>
  );
};

export default SeminarDetailPage;
