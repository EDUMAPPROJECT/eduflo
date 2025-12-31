import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminBottomNavigation from "@/components/AdminBottomNavigation";
import Logo from "@/components/Logo";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, User, GraduationCap, Clock, CheckCircle } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Consultation = Database["public"]["Tables"]["consultations"]["Row"];

const ConsultationManagementPage = () => {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
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
    const fetchConsultations = async () => {
      if (!user) return;

      try {
        // Get user's academy first
        const { data: academy } = await supabase
          .from("academies")
          .select("id")
          .eq("owner_id", user.id)
          .maybeSingle();

        if (academy) {
          const { data, error } = await supabase
            .from("consultations")
            .select("*")
            .eq("academy_id", academy.id)
            .order("created_at", { ascending: false });

          if (error) throw error;
          setConsultations(data || []);
        }
      } catch (error) {
        console.error("Error fetching consultations:", error);
        toast({
          title: "오류",
          description: "상담 목록을 불러오는데 실패했습니다.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchConsultations();
  }, [user, toast]);

  const handleComplete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("consultations")
        .update({ status: "completed" })
        .eq("id", id);

      if (error) throw error;

      setConsultations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: "completed" as const } : c))
      );

      toast({
        title: "완료",
        description: "상담이 완료 처리되었습니다.",
      });
    } catch (error) {
      console.error("Error updating consultation:", error);
      toast({
        title: "오류",
        description: "상태 변경에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="bg-amber-100 text-amber-700">대기중</Badge>;
      case "confirmed":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-700">확인됨</Badge>;
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

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-card/80 backdrop-blur-lg border-b border-border z-40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <Logo size="sm" showText={false} />
          <span className="text-xs font-medium text-primary bg-secondary px-2 py-1 rounded-full">
            상담 관리
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-6">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-lg text-foreground">상담 신청 목록</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : consultations.length === 0 ? (
          <Card className="shadow-card border-border">
            <CardContent className="p-8 text-center">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">아직 상담 신청이 없습니다.</p>
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
                        <h4 className="font-medium text-foreground">
                          {consultation.student_name}
                        </h4>
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
                      <Button
                        size="sm"
                        onClick={() => handleComplete(consultation.id)}
                        className="gap-1"
                      >
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
      </main>

      <AdminBottomNavigation />
    </div>
  );
};

export default ConsultationManagementPage;
