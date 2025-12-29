import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminBottomNavigation from "@/components/AdminBottomNavigation";
import Logo from "@/components/Logo";
import ImageUpload from "@/components/ImageUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Calendar,
  Users,
  ChevronRight,
  Clock,
  GraduationCap,
} from "lucide-react";
import { toast } from "sonner";

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
  image_url: string | null;
  application_count?: number;
}

interface Application {
  id: string;
  student_name: string;
  student_grade: string | null;
  attendee_count: number | null;
  message: string | null;
  created_at: string;
  user_id: string;
  profile?: {
    phone: string;
    user_name: string | null;
  };
}

const SeminarManagementPage = () => {
  const [seminars, setSeminars] = useState<Seminar[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [academyId, setAcademyId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedSeminar, setSelectedSeminar] = useState<Seminar | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState(30);
  const [subject, setSubject] = useState("");
  const [targetGrade, setTargetGrade] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchAcademyAndSeminars(session.user.id);
      }
    });
  }, []);

  const fetchAcademyAndSeminars = async (userId: string) => {
    try {
      // Get user's academy
      const { data: academy } = await supabase
        .from("academies")
        .select("id")
        .eq("owner_id", userId)
        .maybeSingle();

      if (academy) {
        setAcademyId(academy.id);
        fetchSeminars(academy.id);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error("Error:", error);
      setLoading(false);
    }
  };

  const fetchSeminars = async (academyId: string) => {
    try {
      const { data, error } = await supabase
        .from("seminars")
        .select("*")
        .eq("academy_id", academyId)
        .order("date", { ascending: true });

      if (error) throw error;

      // Get application counts
      const seminarsWithCounts = await Promise.all(
        (data || []).map(async (seminar) => {
          const { count } = await supabase
            .from("seminar_applications")
            .select("*", { count: "exact", head: true })
            .eq("seminar_id", seminar.id);

          return { ...seminar, application_count: count || 0 };
        })
      );

      setSeminars(seminarsWithCounts as Seminar[]);
    } catch (error) {
      console.error("Error fetching seminars:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async (seminarId: string) => {
    setLoadingApps(true);
    try {
      const { data, error } = await supabase
        .from("seminar_applications")
        .select("*")
        .eq("seminar_id", seminarId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get user profiles
      if (data && data.length > 0) {
        const userIds = data.map((app) => app.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, phone, user_name")
          .in("id", userIds);

        const appsWithProfiles = data.map((app) => ({
          ...app,
          profile: profiles?.find((p) => p.id === app.user_id),
        }));

        setApplications(appsWithProfiles as Application[]);
      } else {
        setApplications([]);
      }
    } catch (error) {
      console.error("Error fetching applications:", error);
    } finally {
      setLoadingApps(false);
    }
  };

  const handleCreateSeminar = async () => {
    if (!academyId) {
      toast.error("학원 정보가 없습니다");
      return;
    }

    if (!title.trim() || !date || !time) {
      toast.error("제목, 날짜, 시간을 입력해주세요");
      return;
    }

    setSubmitting(true);
    try {
      const dateTime = new Date(`${date}T${time}`).toISOString();

      const { error } = await supabase.from("seminars").insert({
        academy_id: academyId,
        title,
        description: description || null,
        date: dateTime,
        location: location || null,
        capacity,
        subject: subject || null,
        target_grade: targetGrade || null,
        image_url: imageUrl || null,
        status: "recruiting",
      });

      if (error) throw error;

      toast.success("설명회가 등록되었습니다");
      setIsCreateOpen(false);
      resetForm();
      fetchSeminars(academyId);
    } catch (error) {
      console.error("Error creating seminar:", error);
      toast.error("등록에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (seminar: Seminar) => {
    try {
      const newStatus = seminar.status === "recruiting" ? "closed" : "recruiting";
      const { error } = await supabase
        .from("seminars")
        .update({ status: newStatus })
        .eq("id", seminar.id);

      if (error) throw error;

      setSeminars((prev) =>
        prev.map((s) => (s.id === seminar.id ? { ...s, status: newStatus } : s))
      );
      toast.success(newStatus === "closed" ? "마감되었습니다" : "모집이 재개되었습니다");
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("상태 변경에 실패했습니다");
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDate("");
    setTime("");
    setLocation("");
    setCapacity(30);
    setSubject("");
    setTargetGrade("");
    setImageUrl("");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-card/80 backdrop-blur-lg border-b border-border z-40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <Logo size="sm" />
          <span className="text-xs font-medium text-muted-foreground">
            설명회 관리
          </span>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Create Button */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="w-full mb-6 h-12">
              <Plus className="w-5 h-5 mr-2" />
              새 설명회 등록
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm mx-auto max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>설명회 등록</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>제목 *</Label>
                <Input
                  placeholder="설명회 제목"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>날짜 *</Label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>시간 *</Label>
                  <Input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>장소</Label>
                <Input
                  placeholder="설명회 장소"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>정원</Label>
                <Input
                  type="number"
                  min={1}
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>과목</Label>
                  <Select value={subject} onValueChange={setSubject}>
                    <SelectTrigger>
                      <SelectValue placeholder="선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="수학">수학</SelectItem>
                      <SelectItem value="영어">영어</SelectItem>
                      <SelectItem value="국어">국어</SelectItem>
                      <SelectItem value="과학">과학</SelectItem>
                      <SelectItem value="코딩">코딩</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>대상 학년</Label>
                  <Select value={targetGrade} onValueChange={setTargetGrade}>
                    <SelectTrigger>
                      <SelectValue placeholder="선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="초등학생">초등학생</SelectItem>
                      <SelectItem value="중학생">중학생</SelectItem>
                      <SelectItem value="고등학생">고등학생</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>포스터 이미지</Label>
                <ImageUpload
                  value={imageUrl}
                  onChange={setImageUrl}
                  folder="seminars"
                />
              </div>
              <div className="space-y-2">
                <Label>설명</Label>
                <Textarea
                  placeholder="설명회 상세 내용"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>
              <Button
                className="w-full"
                onClick={handleCreateSeminar}
                disabled={submitting}
              >
                {submitting ? "등록 중..." : "등록하기"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Seminars List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : !academyId ? (
          <Card className="shadow-card">
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">먼저 학원을 등록해주세요</p>
            </CardContent>
          </Card>
        ) : seminars.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="p-6 text-center">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">등록된 설명회가 없습니다</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {seminars.map((seminar) => (
              <Card key={seminar.id} className="shadow-card">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant={
                            seminar.status === "recruiting"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {seminar.status === "recruiting" ? "모집중" : "마감"}
                        </Badge>
                        {seminar.subject && (
                          <Badge variant="outline">{seminar.subject}</Badge>
                        )}
                      </div>
                      <h4 className="font-semibold text-foreground">
                        {seminar.title}
                      </h4>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleStatus(seminar)}
                    >
                      {seminar.status === "recruiting" ? "마감" : "재개"}
                    </Button>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatDate(seminar.date)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {seminar.application_count}/{seminar.capacity || 30}명
                    </span>
                  </div>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setSelectedSeminar(seminar);
                          fetchApplications(seminar.id);
                        }}
                      >
                        신청자 명단 보기
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-sm mx-auto max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>신청자 명단</DialogTitle>
                      </DialogHeader>
                      <div className="py-4">
                        {loadingApps ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                          </div>
                        ) : applications.length === 0 ? (
                          <p className="text-center text-muted-foreground py-8">
                            신청자가 없습니다
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {applications.map((app) => (
                              <div
                                key={app.id}
                                className="bg-muted/50 rounded-lg p-3"
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    <GraduationCap className="w-4 h-4 text-primary" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-sm">
                                      {app.student_name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {app.student_grade || "학년 미정"} ·{" "}
                                      {app.attendee_count || 1}명
                                    </p>
                                  </div>
                                </div>
                                {app.profile?.phone && (
                                  <p className="text-xs text-muted-foreground mb-1">
                                    📞 {app.profile.phone}
                                  </p>
                                )}
                                {app.message && (
                                  <p className="text-xs text-muted-foreground bg-background rounded p-2">
                                    💬 {app.message}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <AdminBottomNavigation />
    </div>
  );
};

export default SeminarManagementPage;
