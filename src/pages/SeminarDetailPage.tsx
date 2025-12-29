import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { toast } from "sonner";

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
            address
          )
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      setSeminar(data as any);
    } catch (error) {
      console.error("Error fetching seminar:", error);
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
      console.error("Error fetching application count:", error);
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
      console.error("Error checking application:", error);
    }
  };

  const handleApply = async () => {
    if (!user) {
      toast.error("로그인이 필요합니다");
      navigate("/auth");
      return;
    }

    if (!studentName.trim()) {
      toast.error("학생 이름을 입력해주세요");
      return;
    }

    if (!studentGrade) {
      toast.error("학년을 선택해주세요");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("seminar_applications").insert({
        seminar_id: id,
        user_id: user.id,
        student_name: studentName,
        student_grade: studentGrade,
        attendee_count: attendeeCount,
        message: message || null,
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
      console.error("Error applying:", error);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!seminar) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">설명회를 찾을 수 없습니다</p>
        <Button onClick={() => navigate(-1)}>뒤로 가기</Button>
      </div>
    );
  }

  const remainingSpots = (seminar.capacity || 30) - applicationCount;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 bg-card/80 backdrop-blur-lg border-b border-border z-40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Logo size="sm" />
        </div>
      </header>

      {/* Hero Image */}
      <div className="h-48 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
        {seminar.image_url ? (
          <img
            src={seminar.image_url}
            alt={seminar.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-center">
            <GraduationCap className="w-16 h-16 text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">설명회 포스터</p>
          </div>
        )}
      </div>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Title Section */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Badge
              variant={seminar.status === "recruiting" ? "default" : "secondary"}
            >
              {seminar.status === "recruiting" ? "모집중" : "마감"}
            </Badge>
            {seminar.subject && (
              <Badge variant="outline">{seminar.subject}</Badge>
            )}
            {seminar.target_grade && (
              <Badge variant="outline">{seminar.target_grade}</Badge>
            )}
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">
            {seminar.title}
          </h1>
          {seminar.academy && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="w-4 h-4" />
              <span className="text-sm">{seminar.academy.name}</span>
            </div>
          )}
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 text-primary mb-1">
              <Calendar className="w-4 h-4" />
              <span className="text-xs font-medium">날짜</span>
            </div>
            <p className="text-sm font-semibold text-foreground">
              {formatDate(seminar.date)}
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 text-primary mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-medium">시간</span>
            </div>
            <p className="text-sm font-semibold text-foreground">
              {formatTime(seminar.date)}
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 col-span-2">
            <div className="flex items-center gap-2 text-primary mb-1">
              <MapPin className="w-4 h-4" />
              <span className="text-xs font-medium">장소</span>
            </div>
            <p className="text-sm text-foreground">
              {seminar.location || "장소 미정"}
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 col-span-2">
            <div className="flex items-center gap-2 text-primary mb-1">
              <Users className="w-4 h-4" />
              <span className="text-xs font-medium">모집 현황</span>
            </div>
            <p className="text-sm text-foreground">
              {applicationCount}명 신청 / {seminar.capacity || 30}명 정원
              <span className="text-muted-foreground ml-2">
                ({remainingSpots > 0 ? `${remainingSpots}자리 남음` : "마감"})
              </span>
            </p>
          </div>
        </div>

        {/* Description */}
        <div className="mb-6">
          <h2 className="font-semibold text-foreground mb-3">설명회 안내</h2>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {seminar.description || "상세 내용이 없습니다."}
            </p>
          </div>
        </div>

        {/* My Application Status */}
        {hasApplied && myApplication && (
          <div className="mb-6">
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
              <div className="flex items-center gap-2 text-primary mb-2">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-semibold">신청 완료</span>
              </div>
              <p className="text-sm text-foreground">
                {myApplication.student_name} ({myApplication.student_grade}) · {myApplication.attendee_count}명 참석 예정
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 z-50">
        <div className="max-w-lg mx-auto">
          {hasApplied ? (
            <Button
              className="w-full h-14 text-base"
              variant="secondary"
              disabled
            >
              <CheckCircle2 className="w-5 h-5 mr-2" />
              신청 완료됨
            </Button>
          ) : (
            <Button
              className="w-full h-14 text-base"
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
            <DialogTitle>설명회 참가 신청</DialogTitle>
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
              <Label htmlFor="message">질문 사항</Label>
              <Textarea
                id="message"
                placeholder="설명회에서 듣고 싶은 내용이 있으시면 적어주세요"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>
            <Button
              className="w-full"
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
