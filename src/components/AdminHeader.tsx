import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import Logo from "./Logo";
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
    const checkAdminStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setLoading(false);
          return;
        }

        // Check if user is admin
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (roleData?.role === "admin") {
          setIsAdmin(true);

          // Check if admin has an academy
          const { data: academy } = await supabase
            .from("academies")
            .select("id")
            .eq("owner_id", session.user.id)
            .maybeSingle();

          setHasAcademy(!!academy);
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
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
