import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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

interface Seminar {
  id: string;
  academy_id: string;
  title: string;
  description: string | null;
  date: string;
  location: string | null;
  image_url: string | null;
  capacity: number | null;
  status: "recruiting" | "closed";
  subject: string | null;
  target_grade: string | null;
  academy?: {
    name: string;
    address: string | null;
    profile_image: string | null;
  };
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

  // Form state
  const [studentName, setStudentName] = useState("");
  const [studentGrade, setStudentGrade] = useState("");
  const [attendeeCount, setAttendeeCount] = useState(1);
  const [message, setMessage] = useState("");

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
      setSeminar(data as any);
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
      toast.error("로그인이 필요합니다");
      navigate("/auth");
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

    setSubmitting(true);
    try {
      const { error } = await supabase.from("seminar_applications").insert({
        seminar_id: id,
        user_id: user.id,
        student_name: validatedData.student_name,
        student_grade: validatedData.student_grade,
        attendee_count: validatedData.attendee_count,
        message: validatedData.message,
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
            <Logo size="sm" />
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

      {/* Hero Image */}
      <div className="relative aspect-[16/9] bg-gradient-to-br from-primary/20 via-accent/10 to-secondary/30 flex items-center justify-center overflow-hidden">
        {seminar.image_url ? (
          <img
            src={seminar.image_url}
            alt={seminar.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-center p-6">
            <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3">
              <GraduationCap className="w-12 h-12 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">설명회 포스터</p>
          </div>
        )}

        {/* D-Day Badge */}
        {dDay && (
          <div className="absolute top-4 right-4">
            <Badge
              className={`${
                dDay === "D-Day" || isUrgent
                  ? "bg-destructive text-destructive-foreground animate-pulse"
                  : "bg-card/90 text-foreground"
              } px-4 py-1.5 text-sm font-bold shadow-lg backdrop-blur-sm`}
            >
              {dDay}
            </Badge>
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute top-4 left-4">
          <Badge
            className={`${
              seminar.status === "recruiting"
                ? isUrgent
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            } px-4 py-1.5 text-sm font-semibold shadow-lg`}
          >
            {seminar.status === "recruiting" ? (isUrgent ? "마감임박" : "모집중") : "마감"}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Academy Info */}
        {seminar.academy && (
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
              {seminar.academy.profile_image ? (
                <img
                  src={seminar.academy.profile_image}
                  alt={seminar.academy.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building2 className="w-5 h-5 text-primary" />
              )}
            </div>
            <span className="text-sm font-medium text-muted-foreground">
              {seminar.academy.name}
            </span>
          </div>
        )}

        {/* Title */}
        <h1 className="text-2xl font-bold text-foreground mb-4 leading-tight">
          {seminar.title}
        </h1>

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
          <div className="bg-card border border-border rounded-xl p-4 col-span-2 shadow-card">
            <div className="flex items-center gap-2 text-primary mb-2">
              <MapPin className="w-5 h-5" />
              <span className="text-xs font-semibold">장소</span>
            </div>
            <p className="text-sm font-medium text-foreground">
              {seminar.location || "장소 미정"}
            </p>
          </div>
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
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {seminar.description || "상세 내용이 없습니다."}
            </p>
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
              onClick={() => setIsDialogOpen(true)}
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
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">설명회 참가 신청</DialogTitle>
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
    </div>
  );
};

export default SeminarDetailPage;
