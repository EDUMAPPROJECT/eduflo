import { Home, MessageCircle, Building2, Calendar, Megaphone, LogOut } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  showBadge?: boolean;
  isLogout?: boolean;
}

const AdminBottomNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const hasUnread = useUnreadMessages(true);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("로그아웃되었습니다");
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error("로그아웃에 실패했습니다");
    }
  };

  const navItems: NavItem[] = [
    { icon: Home, label: "홈", path: "/admin/home" },
    { icon: Calendar, label: "설명회", path: "/admin/seminars" },
    { icon: Megaphone, label: "소식", path: "/admin/posts" },
    { icon: MessageCircle, label: "채팅", path: "/admin/chats", showBadge: true },
    { icon: Building2, label: "프로필", path: "/admin/profile" },
    { icon: LogOut, label: "로그아웃", path: "", isLogout: true },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg z-50">
      <div className="max-w-lg mx-auto flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = item.path && location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <button
              key={item.label}
              onClick={() => item.isLogout ? handleLogout() : navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-xl transition-all duration-200 relative",
                isActive
                  ? "text-primary bg-secondary"
                  : item.isLogout
                    ? "text-destructive hover:text-destructive/80"
                    : "text-muted-foreground hover:text-primary"
              )}
            >
              <div className="relative">
                <Icon className={cn("w-5 h-5", isActive && "animate-scale-in")} />
                {item.showBadge && hasUnread && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-destructive rounded-full" />
                )}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
      <div className="h-safe-area-inset-bottom bg-card" />
    </nav>
  );
};

export default AdminBottomNavigation;
