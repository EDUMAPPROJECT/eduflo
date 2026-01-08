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
  ChevronLeft,
  Clock,
  GraduationCap,
  Calendar,
  MapPin,
  X,
  MessageSquare
} from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Consultation = Database["public"]["Tables"]["consultations"]["Row"];
type ConsultationReservation = Database["public"]["Tables"]["consultation_reservations"]["Row"];
type Academy = Database["public"]["Tables"]["academies"]["Row"];

interface SeminarApplication {
  id: string;
  seminar_id: string;
  student_name: string;
  student_grade: string | null;
  attendee_count: number | null;
  message: string | null;
  created_at: string;
  seminar?: {
    id: string;
    title: string;
    date: string;
    location: string | null;
    status: "recruiting" | "closed";
    academy?: {
      name: string;
    };
  };
}

interface ConsultationWithAcademy extends Consultation {
  academy?: Academy;
}

interface ReservationWithAcademy extends ConsultationReservation {
  academy?: Academy;
}

const MyReservationsPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [consultations, setConsultations] = useState<ConsultationWithAcademy[]>([]);
  const [reservations, setReservations] = useState<ReservationWithAcademy[]>([]);
  const [seminarApplications, setSeminarApplications] = useState<SeminarApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelDialog, setCancelDialog] = useState<{
    isOpen: boolean;
    type: "consultation" | "seminar" | "reservation" | null;
    id: string | null;
    title: string;
  }>({ isOpen: false, type: null, id: null, title: "" });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => {
            fetchConsultations(session.user.id);
            fetchReservations(session.user.id);
            fetchSeminarApplications(session.user.id);
          }, 0);
        } else {
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchConsultations(session.user.id);
        fetchReservations(session.user.id);
        fetchSeminarApplications(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchConsultations = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("consultations")
        .select("*")
        .eq("parent_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const academyIds = [...new Set(data.map(c => c.academy_id))];
        const { data: academyData } = await supabase
          .from("academies")
          .select("*")
          .in("id", academyIds);

        const consultationsWithAcademies = data.map(consultation => ({
          ...consultation,
          academy: academyData?.find(a => a.id === consultation.academy_id)
        }));

        setConsultations(consultationsWithAcademies);
      } else {
        setConsultations([]);
      }
    } catch (error) {
      console.error("Error fetching consultations:", error);
    }
  };

  const fetchReservations = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("consultation_reservations")
        .select("*")
        .eq("parent_id", userId)
        .order("reservation_date", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const academyIds = [...new Set(data.map(r => r.academy_id))];
        const { data: academyData } = await supabase
          .from("academies")
          .select("*")
          .in("id", academyIds);

        const reservationsWithAcademies = data.map(reservation => ({
          ...reservation,
          academy: academyData?.find(a => a.id === reservation.academy_id)
        }));

        setReservations(reservationsWithAcademies);
      } else {
        setReservations([]);
      }
    } catch (error) {
      console.error("Error fetching reservations:", error);
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
            id,
            title,
            date,
            location,
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

  const cancelReservation = async (reservationId: string) => {
    try {
      const { error } = await supabase
        .from("consultation_reservations")
        .update({ status: "cancelled" })
        .eq("id", reservationId);

      if (error) throw error;

      setReservations(prev => prev.map(r => 
        r.id === reservationId ? { ...r, status: "cancelled" } : r
      ));
      toast.success("방문 상담 예약이 취소되었습니다");
    } catch (error) {
      console.error("Error canceling reservation:", error);
      toast.error("예약 취소에 실패했습니다");
    }
  };

  const cancelConsultation = async (consultationId: string) => {
    try {
      const { error } = await supabase
        .from("consultations")
        .delete()
        .eq("id", consultationId);

      if (error) throw error;

      setConsultations(prev => prev.filter(c => c.id !== consultationId));
      toast.success("상담 신청이 취소되었습니다");
    } catch (error) {
      console.error("Error canceling consultation:", error);
      toast.error("상담 취소에 실패했습니다");
    }
  };

  const cancelSeminarApplication = async (applicationId: string) => {
    try {
      const { error } = await supabase
        .from("seminar_applications")
        .delete()
        .eq("id", applicationId);

      if (error) throw error;

      setSeminarApplications(prev => prev.filter(a => a.id !== applicationId));
      toast.success("설명회 신청이 취소되었습니다");
    } catch (error) {
      console.error("Error canceling seminar application:", error);
      toast.error("설명회 신청 취소에 실패했습니다");
    }
  };

  const handleCancelConfirm = () => {
    if (cancelDialog.type === "consultation" && cancelDialog.id) {
      cancelConsultation(cancelDialog.id);
    } else if (cancelDialog.type === "seminar" && cancelDialog.id) {
      cancelSeminarApplication(cancelDialog.id);
    } else if (cancelDialog.type === "reservation" && cancelDialog.id) {
      cancelReservation(cancelDialog.id);
    }
    setCancelDialog({ isOpen: false, type: null, id: null, title: "" });
  };

  const openCancelDialog = (type: "consultation" | "seminar" | "reservation", id: string, title: string) => {
    setCancelDialog({ isOpen: true, type, id, title });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="bg-amber-100 text-amber-700">대기중</Badge>;
      case "confirmed":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-700">확정</Badge>;
      case "completed":
        return <Badge variant="secondary" className="bg-green-100 text-green-700">완료</Badge>;
      case "cancelled":
        return <Badge variant="destructive">취소됨</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatReservationDate = (dateString: string, timeString: string) => {
    const date = new Date(dateString);
    const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
    const dayName = dayNames[date.getDay()];
    return `${date.getMonth() + 1}월 ${date.getDate()}일(${dayName}) ${timeString}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 bg-card/80 backdrop-blur-lg border-b border-border z-40">
          <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-1">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold">내 예약</h1>
          </div>
        </header>
        <main className="max-w-lg mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground mb-4">로그인이 필요합니다</p>
          <Button onClick={() => navigate("/auth")}>로그인하기</Button>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-card/80 backdrop-blur-lg border-b border-border z-40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold">내 예약</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-4">
        {/* Quick Stats */}
        <div className="bg-card rounded-2xl p-4 shadow-card mb-6">
          <div className="grid grid-cols-3 divide-x divide-border">
            <div className="text-center py-2">
              <p className="text-2xl font-bold text-primary">{reservations.filter(r => r.status !== "cancelled").length}</p>
              <p className="text-xs text-muted-foreground">방문 상담</p>
            </div>
            <div className="text-center py-2">
              <p className="text-2xl font-bold text-accent">{seminarApplications.length}</p>
              <p className="text-xs text-muted-foreground">설명회</p>
            </div>
            <div className="text-center py-2">
              <p className="text-2xl font-bold text-amber-600">{consultations.length}</p>
              <p className="text-xs text-muted-foreground">채팅 상담</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="all" className="mb-6">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="all" className="gap-1 text-xs">
              전체
            </TabsTrigger>
            <TabsTrigger value="reservations" className="gap-1 text-xs">
              <Calendar className="w-3 h-3" />
              방문
            </TabsTrigger>
            <TabsTrigger value="seminars" className="gap-1 text-xs">
              <GraduationCap className="w-3 h-3" />
              설명회
            </TabsTrigger>
            <TabsTrigger value="consultations" className="gap-1 text-xs">
              <MessageSquare className="w-3 h-3" />
              상담
            </TabsTrigger>
          </TabsList>

          {/* All Tab */}
          <TabsContent value="all" className="mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : reservations.length === 0 && seminarApplications.length === 0 && consultations.length === 0 ? (
              <Card className="shadow-card border-border">
                <CardContent className="p-6 text-center">
                  <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">예약 내역이 없습니다</p>
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
                {/* 방문 상담 */}
                {reservations.map((reservation) => (
                  <Card 
                    key={`res-${reservation.id}`} 
                    className="shadow-card border-border cursor-pointer hover:shadow-soft transition-all"
                    onClick={() => navigate(`/academy/${reservation.academy_id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Calendar className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">방문</Badge>
                              <h4 className="font-medium text-foreground text-sm line-clamp-1">
                                {reservation.academy?.name || "학원"}
                              </h4>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {reservation.student_name} · {reservation.student_grade || "학년 미정"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(reservation.status)}
                          {reservation.status === "pending" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openCancelDialog("reservation", reservation.id, reservation.academy?.name || "방문 상담");
                              }}
                              className="p-1.5 hover:bg-destructive/10 rounded-full transition-colors"
                              title="예약 취소"
                            >
                              <X className="w-4 h-4 text-destructive" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-primary font-medium">
                        <Clock className="w-4 h-4" />
                        <span>{formatReservationDate(reservation.reservation_date, reservation.reservation_time)}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* 설명회 */}
                {seminarApplications.map((app) => (
                  <Card 
                    key={`sem-${app.id}`} 
                    className="shadow-card border-border cursor-pointer hover:shadow-soft transition-all"
                    onClick={() => app.seminar?.id && navigate(`/seminar/${app.seminar.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                            <GraduationCap className="w-4 h-4 text-accent" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">설명회</Badge>
                              <h4 className="font-medium text-foreground text-sm line-clamp-1">
                                {app.seminar?.title || "설명회"}
                              </h4>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {app.seminar?.academy?.name} · {app.student_name}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={app.seminar?.status === "recruiting" ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {app.seminar?.status === "recruiting" ? "모집중" : "마감"}
                          </Badge>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openCancelDialog("seminar", app.id, app.seminar?.title || "설명회");
                            }}
                            className="p-1.5 hover:bg-destructive/10 rounded-full transition-colors"
                            title="신청 취소"
                          >
                            <X className="w-4 h-4 text-destructive" />
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {app.seminar?.date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(app.seminar.date)}</span>
                          </div>
                        )}
                        {app.seminar?.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span className="line-clamp-1">{app.seminar.location}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* 상담 */}
                {consultations.map((consultation) => (
                  <Card 
                    key={`con-${consultation.id}`} 
                    className="shadow-card border-border cursor-pointer hover:shadow-soft transition-all"
                    onClick={() => navigate(`/academy/${consultation.academy_id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                            <MessageSquare className="w-4 h-4 text-amber-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">상담</Badge>
                              <h4 className="font-medium text-foreground text-sm">
                                {consultation.academy?.name || "학원"}
                              </h4>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {consultation.student_name} · {consultation.student_grade || "학년 미정"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(consultation.status)}
                          {consultation.status === "pending" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openCancelDialog("consultation", consultation.id, consultation.academy?.name || "학원");
                              }}
                              className="p-1.5 hover:bg-destructive/10 rounded-full transition-colors"
                              title="상담 취소"
                            >
                              <X className="w-4 h-4 text-destructive" />
                            </button>
                          )}
                        </div>
                      </div>
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

          <TabsContent value="reservations" className="mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : reservations.length === 0 ? (
              <Card className="shadow-card border-border">
                <CardContent className="p-6 text-center">
                  <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">신청한 방문 상담이 없습니다</p>
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
                {reservations.map((reservation) => (
                  <Card 
                    key={reservation.id} 
                    className="shadow-card border-border cursor-pointer hover:shadow-soft transition-all"
                    onClick={() => navigate(`/academy/${reservation.academy_id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Calendar className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-medium text-foreground text-sm line-clamp-1">
                              {reservation.academy?.name || "학원"}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              {reservation.student_name} · {reservation.student_grade || "학년 미정"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(reservation.status)}
                          {reservation.status === "pending" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openCancelDialog("reservation", reservation.id, reservation.academy?.name || "방문 상담");
                              }}
                              className="p-1.5 hover:bg-destructive/10 rounded-full transition-colors"
                              title="예약 취소"
                            >
                              <X className="w-4 h-4 text-destructive" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-primary font-medium mb-2">
                        <Clock className="w-4 h-4" />
                        <span>{formatReservationDate(reservation.reservation_date, reservation.reservation_time)}</span>
                      </div>
                      {reservation.message && (
                        <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2 line-clamp-2">
                          {reservation.message}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

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
                    onClick={() => app.seminar?.id && navigate(`/seminar/${app.seminar.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <GraduationCap className="w-4 h-4 text-primary" />
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
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={app.seminar?.status === "recruiting" ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {app.seminar?.status === "recruiting" ? "모집중" : "마감"}
                          </Badge>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openCancelDialog("seminar", app.id, app.seminar?.title || "설명회");
                            }}
                            className="p-1.5 hover:bg-destructive/10 rounded-full transition-colors"
                            title="신청 취소"
                          >
                            <X className="w-4 h-4 text-destructive" />
                          </button>
                        </div>
                      </div>
                      {app.seminar?.academy && (
                        <p className="text-xs text-muted-foreground mb-1">
                          {app.seminar.academy.name}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {app.seminar?.date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(app.seminar.date)}</span>
                          </div>
                        )}
                        {app.seminar?.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span className="line-clamp-1">{app.seminar.location}</span>
                          </div>
                        )}
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
                  <Card 
                    key={consultation.id} 
                    className="shadow-card border-border cursor-pointer hover:shadow-soft transition-all"
                    onClick={() => navigate(`/academy/${consultation.academy_id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                            <GraduationCap className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-medium text-foreground text-sm">
                              {consultation.academy?.name || "학원"}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              {consultation.student_name} · {consultation.student_grade || "학년 미정"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(consultation.status)}
                          {consultation.status === "pending" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openCancelDialog("consultation", consultation.id, consultation.academy?.name || "학원");
                              }}
                              className="p-1.5 hover:bg-destructive/10 rounded-full transition-colors"
                              title="상담 취소"
                            >
                              <X className="w-4 h-4 text-destructive" />
                            </button>
                          )}
                        </div>
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
        </Tabs>
      </main>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialog.isOpen} onOpenChange={(open) => !open && setCancelDialog({ isOpen: false, type: null, id: null, title: "" })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {cancelDialog.type === "seminar" 
                ? "설명회 신청 취소" 
                : cancelDialog.type === "reservation" 
                  ? "방문 상담 예약 취소"
                  : "상담 신청 취소"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {cancelDialog.type === "seminar" 
                ? `"${cancelDialog.title}" 설명회 신청을 취소하시겠습니까?`
                : cancelDialog.type === "reservation"
                  ? `"${cancelDialog.title}" 방문 상담 예약을 취소하시겠습니까?`
                  : `"${cancelDialog.title}" 상담 신청을 취소하시겠습니까?`
              }
              <br />
              취소한 신청은 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>돌아가기</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancelConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              취소하기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNavigation />
    </div>
  );
};

export default MyReservationsPage;
