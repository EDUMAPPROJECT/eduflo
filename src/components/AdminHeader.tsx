import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";

interface AdminHeaderProps {
  showAdminButton?: boolean;
}

const AdminHeader = ({ showAdminButton = true }: AdminHeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasAcademy, setHasAcademy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const resetAdminState = () => {
      if (!isMounted) return;
      setIsAdmin(false);
      setHasAcademy(false);
    };

    const checkAdminStatus = async () => {
      try {
        if (!isMounted) return;
        setLoading(true);
        // 이전 상태가 남아 깜빡 노출되지 않도록 검사 시작 시 즉시 초기화
        resetAdminState();

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          if (isMounted) setLoading(false);
          return;
        }

        // Check if user is admin
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (!isMounted) return;

        if (roleData?.role !== "admin") {
          resetAdminState();
          setLoading(false);
          return;
        }

        setIsAdmin(true);

        // Check if admin has an academy
        const { data: academy } = await supabase
          .from("academies")
          .select("id")
          .eq("owner_id", session.user.id)
          .maybeSingle();

        if (!isMounted) return;
        setHasAcademy(!!academy);
      } catch (error) {
        console.error("Error checking admin status:", error);
        resetAdminState();
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      // 로그인/로그아웃/토큰 갱신 시 상태를 다시 확정
      checkAdminStatus();
    });

    checkAdminStatus();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleAdminClick = () => {
    if (hasAcademy) {
      navigate("/academy/dashboard");
    } else {
      navigate("/academy/setup");
    }
  };

  // Don't show on admin pages
  const isAdminPage = location.pathname.startsWith("/admin") || 
                      location.pathname.startsWith("/academy/dashboard") ||
                      location.pathname.startsWith("/academy/setup");

  if (loading || !showAdminButton || !isAdmin || isAdminPage) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="bg-primary/10 border-primary/20 text-primary hover:bg-primary/20"
      onClick={handleAdminClick}
    >
      <Building2 className="w-4 h-4 mr-1" />
      내 학원 관리
    </Button>
  );
};

export default AdminHeader;
