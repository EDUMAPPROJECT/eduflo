import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminBottomNavigation from "@/components/AdminBottomNavigation";
import SurveyFormBuilder from "@/components/SurveyFormBuilder";
import MultiImageUpload from "@/components/MultiImageUpload";
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
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  ArrowLeft,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import type { SurveyField } from "@/types/surveyField";
import AddressSearch from "@/components/AddressSearch";
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
  custom_questions: string[] | null;
  application_count?: number;
}

interface Application {
  id: string;
  student_name: string;
  student_grade: string | null;
  attendee_count: number | null;
  message: string | null;
  custom_answers: Record<string, string> | null;
  created_at: string;
  user_id: string;
  profile?: {
    phone: string;
    user_name: string | null;
  };
}

const hourOptions = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const minuteOptions = ['00', '15', '30', '45'];

const SeminarManagementPage = () => {
  const navigate = useNavigate();
  const [seminars, setSeminars] = useState<Seminar[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [academyId, setAcademyId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSeminar, setEditingSeminar] = useState<Seminar | null>(null);
  const [selectedSeminar, setSelectedSeminar] = useState<Seminar | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [hour, setHour] = useState("10");
  const [minute, setMinute] = useState("00");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState(30);
  const [subject, setSubject] = useState("");
  const [targetGrade, setTargetGrade] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [surveyFields, setSurveyFields] = useState<SurveyField[]>([]);
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
      // Check if user has approved academy membership
      const { data: memberData } = await supabase
        .from("academy_members")
        .select("academy_id")
        .eq("user_id", userId)
        .eq("status", "approved")
        .maybeSingle();

      let academyData = memberData?.academy_id ? { id: memberData.academy_id } : null;

      if (!academyData) {
        // Fallback: check if user is owner
        const { data: ownerData } = await supabase
          .from("academies")
          .select("id")
          .eq("owner_id", userId)
          .maybeSingle();
        academyData = ownerData;
      }

      if (academyData) {
        setAcademyId(academyData.id);
        fetchSeminars(academyData.id);
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

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDate("");
    setHour("10");
    setMinute("00");
    setLocation("");
    setCapacity(30);
    setSubject("");
    setTargetGrade("");
    setImageUrls([]);
    setSurveyFields([]);
    setEditingSeminar(null);
  };

  const openEditDialog = (seminar: Seminar) => {
    setEditingSeminar(seminar);
    setTitle(seminar.title);
    setDescription(seminar.description || "");
    const seminarDate = new Date(seminar.date);
    setDate(seminarDate.toISOString().split("T")[0]);
    setHour(seminarDate.getHours().toString().padStart(2, '0'));
    // Round minute to nearest 15
    const mins = seminarDate.getMinutes();
    const roundedMins = ['00', '15', '30', '45'].reduce((prev, curr) => 
      Math.abs(parseInt(curr) - mins) < Math.abs(parseInt(prev) - mins) ? curr : prev
    );
    setMinute(roundedMins);
    setLocation(seminar.location || "");
    setCapacity(seminar.capacity || 30);
    setSubject(seminar.subject || "");
    setTargetGrade(seminar.target_grade || "");
    // Parse image_url - could be JSON array or single URL
    try {
      const parsed = seminar.image_url ? JSON.parse(seminar.image_url) : [];
      setImageUrls(Array.isArray(parsed) ? parsed : seminar.image_url ? [seminar.image_url] : []);
    } catch {
      setImageUrls(seminar.image_url ? [seminar.image_url] : []);
    }
    // Load survey_fields from seminar (cast from Json)
    const rawFields = (seminar as any).survey_fields;
    setSurveyFields(Array.isArray(rawFields) ? rawFields : []);
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleSaveSeminar = async () => {
    if (!academyId) {
      toast.error("학원 정보가 없습니다");
      return;
    }

    if (!title.trim() || !date) {
      toast.error("제목과 날짜를 입력해주세요");
      return;
    }

    setSubmitting(true);
    try {
      const dateTime = new Date(`${date}T${hour}:${minute}`).toISOString();

      // Filter survey fields with labels
      const validFields = surveyFields.filter(f => f.label?.trim() || f.consentText?.trim());

      const seminarData = {
        title,
        description: description || null,
        date: dateTime,
        location: location.trim() || null,
        capacity,
        subject: subject || null,
        target_grade: targetGrade || null,
        image_url: imageUrls.length > 0 ? JSON.stringify(imageUrls) : null,
        survey_fields: (validFields.length > 0 ? validFields : null) as any,
      };

      if (editingSeminar) {
        const { error } = await supabase
          .from("seminars")
          .update(seminarData)
          .eq("id", editingSeminar.id);

        if (error) throw error;
        toast.success("설명회가 수정되었습니다");
      } else {
        const { error } = await supabase.from("seminars").insert({
          academy_id: academyId,
          ...seminarData,
          status: "recruiting",
        });

        if (error) throw error;
        toast.success("설명회가 등록되었습니다");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchSeminars(academyId);
    } catch (error) {
      console.error("Error saving seminar:", error);
      toast.error("저장에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSeminar = async () => {
    if (!deleteId || !academyId) return;

    try {
      const { error } = await supabase
        .from("seminars")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      setSeminars((prev) => prev.filter((s) => s.id !== deleteId));
      toast.success("설명회가 삭제되었습니다");
    } catch (error) {
      console.error("Error deleting seminar:", error);
      toast.error("삭제에 실패했습니다");
    } finally {
      setDeleteId(null);
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Check if seminar date has passed (auto-close)
  const isExpired = (dateString: string) => {
    return new Date(dateString) < new Date();
  };

  // Get effective status considering expiration
  const getEffectiveStatus = (seminar: Seminar) => {
    if (isExpired(seminar.date)) return "closed";
    return seminar.status;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-card/80 backdrop-blur-lg border-b border-border z-40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/home")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-semibold text-foreground">설명회 관리</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Create Button */}
        <Button className="w-full mb-6 h-12" onClick={openCreateDialog}>
          <Plus className="w-5 h-5 mr-2" />
          새 설명회 등록
        </Button>

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
            {seminars.map((seminar) => {
              const effectiveStatus = getEffectiveStatus(seminar);
              const expired = isExpired(seminar.date);
              return (
                <Card key={seminar.id} className="shadow-card">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {/* Show badge based on effective status */}
                          {effectiveStatus === "recruiting" && (
                            <Badge variant="default">모집중</Badge>
                          )}
                          {effectiveStatus === "closed" && (
                            <Badge variant="secondary">{expired ? "기간 마감" : "마감"}</Badge>
                          )}
                          {seminar.subject && (
                            <Badge variant="outline">{seminar.subject}</Badge>
                          )}
                        </div>
                        <h4 className="font-semibold text-foreground">
                          {seminar.title}
                        </h4>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(seminar)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(seminar.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
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

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleStatus(seminar)}
                        className="flex-1"
                        disabled={expired}
                      >
                        {expired ? "기간 종료" : (effectiveStatus === "recruiting" ? "마감하기" : "모집 재개")}
                      </Button>
                      <Dialog>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            setSelectedSeminar(seminar);
                            fetchApplications(seminar.id);
                          }}
                        >
                          신청자 명단
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-sm mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSeminar ? "설명회 수정" : "설명회 등록"}</DialogTitle>
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
              <div className="flex items-center gap-2">
                <Select value={hour} onValueChange={setHour}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {hourOptions.map(h => (
                      <SelectItem key={h} value={h}>{h}시</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-muted-foreground">:</span>
                <Select value={minute} onValueChange={setMinute}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {minuteOptions.map(m => (
                      <SelectItem key={m} value={m}>{m}분</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>장소</Label>
              <AddressSearch
                value={location}
                onChange={setLocation}
                placeholder="주소를 입력하세요"
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
                    <SelectItem value="기타">기타</SelectItem>
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
                    <SelectItem value="기타">기타</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>포스터 이미지</Label>
              <MultiImageUpload
                values={imageUrls}
                onChange={setImageUrls}
                folder="seminars"
                maxImages={5}
              />
            </div>
            <div className="space-y-2">
              <Label>설명회 안내</Label>
              <p className="text-xs text-muted-foreground">
                **텍스트**로 볼드체를 적용할 수 있습니다.
              </p>
              <Textarea
                placeholder="설명회 상세 내용을 입력하세요. **볼드체** 사용 가능"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
              />
            </div>

            {/* Survey Fields Section */}
            <div className="pt-2 border-t border-border">
              <SurveyFormBuilder
                fields={surveyFields}
                onChange={setSurveyFields}
                maxFields={20}
              />
            </div>

            <Button
              className="w-full"
              onClick={handleSaveSeminar}
              disabled={submitting}
            >
              {submitting ? "저장 중..." : (editingSeminar ? "수정하기" : "등록하기")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Applications Dialog */}
      <Dialog open={!!selectedSeminar} onOpenChange={(open) => !open && setSelectedSeminar(null)}>
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
                      <p className="text-xs text-muted-foreground bg-background rounded p-2 mb-1">
                        💬 {app.message}
                      </p>
                    )}
                    {app.custom_answers && Object.keys(app.custom_answers).length > 0 && (
                      <div className="mt-2 space-y-1">
                        {Object.entries(app.custom_answers).map(([q, a], idx) => (
                          <div key={idx} className="text-xs bg-background rounded p-2">
                            <p className="text-muted-foreground font-medium">❓ {q}</p>
                            <p className="text-foreground mt-0.5">{a}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>설명회 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 설명회를 삭제하시겠습니까? 관련 신청 데이터도 함께 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSeminar} className="bg-destructive text-destructive-foreground">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AdminBottomNavigation />
    </div>
  );
};

export default SeminarManagementPage;
