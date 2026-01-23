import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminBottomNavigation from "@/components/AdminBottomNavigation";
import ConsultationSettingsSection from "@/components/ConsultationSettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, Clock, CheckCircle, Calendar, X, ArrowLeft, Settings, ChevronDown, ChevronUp } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type ConsultationReservation = Database["public"]["Tables"]["consultation_reservations"]["Row"];

const ConsultationManagementPage = () => {
  const navigate = useNavigate();
  const [reservations, setReservations] = useState<ConsultationReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [academyId, setAcademyId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
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
        // Check if user has approved academy membership
        const { data: memberData } = await supabase
          .from("academy_members")
          .select("academy_id")
          .eq("user_id", user.id)
          .eq("status", "approved")
          .maybeSingle();

        let fetchedAcademyId = memberData?.academy_id;

        if (!fetchedAcademyId) {
          // Fallback: check if user is owner
          const { data: academy } = await supabase
            .from("academies")
            .select("id")
            .eq("owner_id", user.id)
            .maybeSingle();
          fetchedAcademyId = academy?.id;
        }

        if (fetchedAcademyId) {
          setAcademyId(fetchedAcademyId);
          
          // Fetch visit reservations
          const { data: reservationData } = await supabase
            .from("consultation_reservations")
            .select("*")
            .eq("academy_id", fetchedAcademyId)
            .order("reservation_date", { ascending: false });

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

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 bg-card/80 backdrop-blur-lg border-b border-border z-40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/home")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-semibold text-foreground">방문 상담 관리</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Settings Section */}
        {academyId && (
          <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between gap-2">
                <span className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  상담 예약 설정
                </span>
                {settingsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <ConsultationSettingsSection academyId={academyId} />
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Reservations List */}
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
      </main>

      <AdminBottomNavigation />
    </div>
  );
};

export default ConsultationManagementPage;
