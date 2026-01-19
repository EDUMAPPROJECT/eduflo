import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import BottomNavigation from "@/components/BottomNavigation";
import ReservationDetailSheet from "@/components/ReservationDetailSheet";
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
  X
} from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

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
    time?: string | null;
    location: string | null;
    status: "recruiting" | "closed";
    academy?: {
      name: string;
    };
  };
}

interface ReservationWithAcademy extends ConsultationReservation {
  academy?: Academy;
}

const MyReservationsPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [reservations, setReservations] = useState<ReservationWithAcademy[]>([]);
  const [seminarApplications, setSeminarApplications] = useState<SeminarApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelDialog, setCancelDialog] = useState<{
    isOpen: boolean;
    type: "seminar" | "reservation" | null;
    id: string | null;
    title: string;
  }>({ isOpen: false, type: null, id: null, title: "" });
  
  // Detail sheet state
  const [detailSheet, setDetailSheet] = useState<{
    open: boolean;
    type: "reservation" | "seminar";
    data: any;
  }>({ open: false, type: "reservation", data: null });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => {
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
        fetchReservations(session.user.id);
        fetchSeminarApplications(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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
      setDetailSheet({ open: false, type: "reservation", data: null });
    } catch (error) {
      console.error("Error canceling reservation:", error);
      toast.error("예약 취소에 실패했습니다");
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
      setDetailSheet({ open: false, type: "seminar", data: null });
    } catch (error) {
      console.error("Error canceling seminar application:", error);
      toast.error("설명회 신청 취소에 실패했습니다");
    }
  };

  const handleCancelConfirm = () => {
    if (cancelDialog.type === "seminar" && cancelDialog.id) {
      cancelSeminarApplication(cancelDialog.id);
    } else if (cancelDialog.type === "reservation" && cancelDialog.id) {
      cancelReservation(cancelDialog.id);
    }
    setCancelDialog({ isOpen: false, type: null, id: null, title: "" });
  };

  const openCancelDialog = (type: "seminar" | "reservation", id: string, title: string) => {
    setCancelDialog({ isOpen: true, type, id, title });
  };

  const openReservationDetail = (reservation: ReservationWithAcademy) => {
    setDetailSheet({
      open: true,
      type: "reservation",
      data: {
        id: reservation.id,
        studentName: reservation.student_name,
        studentGrade: reservation.student_grade,
        message: reservation.message,
        academyName: reservation.academy?.name,
        reservationDate: reservation.reservation_date,
        reservationTime: reservation.reservation_time,
        status: reservation.status,
      }
    });
  };

  const openSeminarDetail = (app: SeminarApplication) => {
    setDetailSheet({
      open: true,
      type: "seminar",
      data: {
        id: app.id,
        studentName: app.student_name,
        studentGrade: app.student_grade,
        message: app.message,
        seminarTitle: app.seminar?.title,
        seminarDate: app.seminar?.date,
        seminarTime: app.seminar?.time || null,
        seminarLocation: app.seminar?.location,
        seminarAcademyName: app.seminar?.academy?.name,
        attendeeCount: app.attendee_count,
        seminarStatus: "applied", // Always show as "신청 완료" for applied seminars
      }
    });
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

  // Check if seminar date has passed (auto-close)
  const isSeminarExpired = (dateString: string) => {
    const seminarDate = new Date(dateString);
    seminarDate.setHours(23, 59, 59, 999); // End of the seminar day
    return seminarDate < new Date();
  };

  // Check if reservation date has passed
  const isReservationExpired = (dateString: string) => {
    const reservationDate = new Date(dateString);
    reservationDate.setHours(23, 59, 59, 999);
    return reservationDate < new Date();
  };

  // Get effective status considering expiration
  const getEffectiveSeminarStatus = (seminar?: SeminarApplication["seminar"]) => {
    if (!seminar) return "closed";
    if (isSeminarExpired(seminar.date)) return "closed";
    return seminar.status;
  };

  // Filter out past reservations and sort by date (earliest first)
  const filteredReservations = reservations
    .filter(r => !isReservationExpired(r.reservation_date))
    .sort((a, b) => new Date(a.reservation_date).getTime() - new Date(b.reservation_date).getTime());

  // Filter out past seminars and sort by date (earliest first)
  const filteredSeminarApplications = seminarApplications
    .filter(app => app.seminar && !isSeminarExpired(app.seminar.date))
    .sort((a, b) => {
      const dateA = a.seminar?.date ? new Date(a.seminar.date).getTime() : 0;
      const dateB = b.seminar?.date ? new Date(b.seminar.date).getTime() : 0;
      return dateA - dateB;
    });

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
          <div className="grid grid-cols-2 divide-x divide-border">
            <div className="text-center py-2">
              <p className="text-2xl font-bold text-primary">{filteredReservations.filter(r => r.status !== "cancelled").length}</p>
              <p className="text-xs text-muted-foreground">방문 상담</p>
            </div>
            <div className="text-center py-2">
              <p className="text-2xl font-bold text-accent">{filteredSeminarApplications.length}</p>
              <p className="text-xs text-muted-foreground">설명회</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="all" className="mb-6">
          <TabsList className="w-full grid grid-cols-3">
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
          </TabsList>

          {/* All Tab */}
          <TabsContent value="all" className="mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : filteredReservations.length === 0 && filteredSeminarApplications.length === 0 ? (
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
                {filteredReservations.map((reservation) => (
                  <Card 
                    key={`res-${reservation.id}`} 
                    className="shadow-card border-border cursor-pointer hover:shadow-soft transition-all"
                    onClick={() => openReservationDetail(reservation)}
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
                {filteredSeminarApplications.map((app) => (
                  <Card 
                    key={`sem-${app.id}`} 
                    className="shadow-card border-border cursor-pointer hover:shadow-soft transition-all"
                    onClick={() => openSeminarDetail(app)}
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
                            variant="secondary"
                            className="text-xs bg-green-100 text-green-700"
                          >
                            신청 완료
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

              </div>
            )}
          </TabsContent>

          <TabsContent value="reservations" className="mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : filteredReservations.length === 0 ? (
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
                {filteredReservations.map((reservation) => (
                  <Card 
                    key={reservation.id} 
                    className="shadow-card border-border cursor-pointer hover:shadow-soft transition-all"
                    onClick={() => openReservationDetail(reservation)}
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
            ) : filteredSeminarApplications.length === 0 ? (
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
                {filteredSeminarApplications.map((app) => (
                  <Card 
                    key={app.id} 
                    className="shadow-card border-border cursor-pointer hover:shadow-soft transition-all"
                    onClick={() => openSeminarDetail(app)}
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
                            variant="secondary"
                            className="text-xs bg-green-100 text-green-700"
                          >
                            신청 완료
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

        </Tabs>
      </main>

      {/* Reservation Detail Sheet */}
      <ReservationDetailSheet
        open={detailSheet.open}
        onOpenChange={(open) => setDetailSheet(prev => ({ ...prev, open }))}
        type={detailSheet.type}
        data={detailSheet.data}
        canCancel={
          detailSheet.type === "reservation" 
            ? detailSheet.data?.status === "pending"
            : true
        }
        onCancel={() => {
          if (detailSheet.data?.id) {
            openCancelDialog(
              detailSheet.type, 
              detailSheet.data.id, 
              detailSheet.type === "reservation" 
                ? detailSheet.data.academyName 
                : detailSheet.data.seminarTitle
            );
          }
        }}
      />

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialog.isOpen} onOpenChange={(open) => !open && setCancelDialog({ isOpen: false, type: null, id: null, title: "" })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {cancelDialog.type === "seminar" 
                ? "설명회 신청 취소" 
                : "방문 상담 예약 취소"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {cancelDialog.type === "seminar" 
                ? `"${cancelDialog.title}" 설명회 신청을 취소하시겠습니까?`
                : `"${cancelDialog.title}" 방문 상담 예약을 취소하시겠습니까?`
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
