import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminBottomNavigation from "@/components/AdminBottomNavigation";
import Logo from "@/components/Logo";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, User, GraduationCap, Clock, CheckCircle, Calendar, X } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Consultation = Database["public"]["Tables"]["consultations"]["Row"];
type ConsultationReservation = Database["public"]["Tables"]["consultation_reservations"]["Row"];

const ConsultationManagementPage = () => {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [reservations, setReservations] = useState<ConsultationReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    getUser();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        const { data: academy } = await supabase
          .from("academies")
          .select("id")
          .eq("owner_id", user.id)
          .maybeSingle();

        if (academy) {
          // Fetch chat consultations
          const { data: chatData } = await supabase
            .from("consultations")
            .select("*")
            .eq("academy_id", academy.id)
            .order("created_at", { ascending: false });

          setConsultations(chatData || []);

          // Fetch visit reservations
          const { data: reservationData } = await supabase
            .from("consultation_reservations")
            .select("*")
            .eq("academy_id", academy.id)
            .order("created_at", { ascending: false });

          setReservations(reservationData || []);
        }
      } catch (error) {
        toast({
          title: "오류",
          description: "상담 목록을 불러오는데 실패했습니다.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, toast]);

  const handleCompleteConsultation = async (id: string) => {
    try {
      const { error } = await supabase
        .from("consultations")
        .update({ status: "completed" })
        .eq("id", id);

      if (error) throw error;

      setConsultations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: "completed" as const } : c))
      );

      toast({ title: "완료", description: "상담이 완료 처리되었습니다." });
    } catch {
      toast({ title: "오류", description: "상태 변경에 실패했습니다.", variant: "destructive" });
    }
  };

  const handleUpdateReservation = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from("consultation_reservations")
        .update({ status })
        .eq("id", id);

      if (error) throw error;

      setReservations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r))
      );

      const statusText = status === "confirmed" ? "확정" : status === "completed" ? "완료" : "취소";
      toast({ title: "완료", description: `예약이 ${statusText} 처리되었습니다.` });
    } catch {
      toast({ title: "오류", description: "상태 변경에 실패했습니다.", variant: "destructive" });
    }
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatReservationDate = (dateStr: string, timeStr: string) => {
    const date = new Date(dateStr);
    return `${date.toLocaleDateString("ko-KR", { month: "long", day: "numeric" })} ${timeStr}`;
  };

  const pendingChatCount = consultations.filter(c => c.status === "pending").length;
  const pendingReservationCount = reservations.filter(r => r.status === "pending").length;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 bg-card/80 backdrop-blur-lg border-b border-border z-40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <Logo size="sm" showText={false} />
          <span className="text-xs font-medium text-primary bg-secondary px-2 py-1 rounded-full">
            상담 관리
          </span>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        <Tabs defaultValue="reservations" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="reservations" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              방문 예약
              {pendingReservationCount > 0 && (
                <Badge variant="destructive" className="text-xs px-1.5 py-0.5">{pendingReservationCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              채팅 상담
              {pendingChatCount > 0 && (
                <Badge variant="destructive" className="text-xs px-1.5 py-0.5">{pendingChatCount}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reservations">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : reservations.length === 0 ? (
              <Card className="shadow-card border-border">
                <CardContent className="p-8 text-center">
                  <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">아직 방문 예약 신청이 없습니다.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {reservations.map((reservation) => (
                  <Card key={reservation.id} className="shadow-card border-border">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-medium text-foreground">{reservation.student_name}</h4>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <GraduationCap className="w-3 h-3" />
                              <span>{reservation.student_grade || "학년 미정"}</span>
                            </div>
                          </div>
                        </div>
                        {getStatusBadge(reservation.status)}
                      </div>

                      <div className="bg-primary/10 rounded-lg p-3 mb-3">
                        <p className="text-sm font-medium text-primary">
                          📅 {formatReservationDate(reservation.reservation_date, reservation.reservation_time)}
                        </p>
                      </div>

                      {reservation.message && (
                        <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3 mb-3">
                          "{reservation.message}"
                        </p>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>신청: {formatDate(reservation.created_at)}</span>
                        </div>

                        <div className="flex gap-2">
                          {reservation.status === "pending" && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => handleUpdateReservation(reservation.id, "cancelled")}>
                                <X className="w-4 h-4" />
                              </Button>
                              <Button size="sm" onClick={() => handleUpdateReservation(reservation.id, "confirmed")}>
                                <CheckCircle className="w-4 h-4 mr-1" />
                                확정
                              </Button>
                            </>
                          )}
                          {reservation.status === "confirmed" && (
                            <Button size="sm" onClick={() => handleUpdateReservation(reservation.id, "completed")}>
                              <CheckCircle className="w-4 h-4 mr-1" />
                              완료
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="chat">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : consultations.length === 0 ? (
              <Card className="shadow-card border-border">
                <CardContent className="p-8 text-center">
                  <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">아직 채팅 상담 신청이 없습니다.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {consultations.map((consultation) => (
                  <Card key={consultation.id} className="shadow-card border-border">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                            <User className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-medium text-foreground">{consultation.student_name}</h4>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <GraduationCap className="w-3 h-3" />
                              <span>{consultation.student_grade || "학년 미정"}</span>
                            </div>
                          </div>
                        </div>
                        {getStatusBadge(consultation.status)}
                      </div>

                      {consultation.message && (
                        <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3 mb-3">
                          "{consultation.message}"
                        </p>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>{formatDate(consultation.created_at)}</span>
                        </div>

                        {consultation.status === "pending" && (
                          <Button size="sm" onClick={() => handleCompleteConsultation(consultation.id)} className="gap-1">
                            <CheckCircle className="w-4 h-4" />
                            상담 완료
                          </Button>
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

      <AdminBottomNavigation />
    </div>
  );
};

export default ConsultationManagementPage;
