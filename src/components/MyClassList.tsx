import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRoutePrefix } from "@/hooks/useRoutePrefix";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { BookOpen, Clock, Trash2, Users, Building2 } from "lucide-react";
import { toast } from "sonner";

interface EnrolledClass {
  id: string;
  class_id: string;
  created_at: string;
  class?: {
    id: string;
    name: string;
    schedule: string | null;
    target_grade: string | null;
    fee: number | null;
    is_recruiting: boolean | null;
    academy?: {
      id: string;
      name: string;
    };
  };
}

// Color palette for different classes
const CLASS_COLORS = [
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-cyan-500",
  "bg-yellow-500",
  "bg-red-500",
];

const MyClassList = () => {
  const navigate = useNavigate();
  const prefix = useRoutePrefix();
  const [enrollments, setEnrollments] = useState<EnrolledClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    id: string | null;
    name: string;
  }>({ isOpen: false, id: null, name: "" });

  useEffect(() => {
    fetchEnrollments();
  }, []);

  const fetchEnrollments = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("class_enrollments")
        .select(`
          *,
          class:classes (
            id,
            name,
            schedule,
            target_grade,
            fee,
            is_recruiting,
            academy:academies (
              id,
              name
            )
          )
        `)
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEnrollments((data as any) || []);
    } catch (error) {
      console.error("Error fetching enrollments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (enrollmentId: string) => {
    try {
      const { error } = await supabase
        .from("class_enrollments")
        .delete()
        .eq("id", enrollmentId);

      if (error) throw error;

      setEnrollments((prev) => prev.filter((e) => e.id !== enrollmentId));
      toast.success("MY CLASS에서 삭제되었습니다");
    } catch (error) {
      console.error("Error removing enrollment:", error);
      toast.error("삭제에 실패했습니다");
    }
    setDeleteDialog({ isOpen: false, id: null, name: "" });
  };

  const getClassColor = (index: number) => {
    return CLASS_COLORS[index % CLASS_COLORS.length];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  if (enrollments.length === 0) {
    return (
      <Card className="shadow-card border-border">
        <CardContent className="p-6 text-center">
          <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">등록된 강좌가 없습니다</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => navigate(`${prefix}/explore`)}
          >
            학원 둘러보기
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {enrollments.map((enrollment, index) => (
          <Card
            key={enrollment.id}
            className="shadow-card border-border overflow-hidden"
          >
            <CardContent className="p-0">
              <div className="flex">
                {/* Color indicator */}
                <div className={`w-1.5 ${getClassColor(index)}`} />
                
                <div className="flex-1 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => enrollment.class?.academy?.id && navigate(`${prefix}/academy/${enrollment.class.academy.id}`)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-foreground text-sm line-clamp-1">
                          {enrollment.class?.name || "강좌"}
                        </h4>
                        {enrollment.class?.is_recruiting ? (
                          <Badge className="bg-green-500 text-white text-[10px] px-1.5 py-0">
                            모집중
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            마감
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                        <Building2 className="w-3 h-3" />
                        <span>{enrollment.class?.academy?.name || "학원"}</span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {enrollment.class?.target_grade && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Users className="w-3 h-3" />
                            {enrollment.class.target_grade}
                          </Badge>
                        )}
                        {enrollment.class?.schedule && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Clock className="w-3 h-3" />
                            {enrollment.class.schedule}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        setDeleteDialog({
                          isOpen: true,
                          id: enrollment.id,
                          name: enrollment.class?.name || "강좌",
                        })
                      }
                      className="p-1.5 hover:bg-destructive/10 rounded-full transition-colors"
                      title="삭제"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog
        open={deleteDialog.isOpen}
        onOpenChange={(open) =>
          !open && setDeleteDialog({ isOpen: false, id: null, name: "" })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>강좌 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteDialog.name}"을(를) MY CLASS에서 삭제하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDialog.id && handleRemove(deleteDialog.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default MyClassList;
