import { Home, HeadphonesIcon, Search, Newspaper, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

const SuperAdminBottomNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems: NavItem[] = [
    { icon: Home, label: "홈", path: "/super/home" },
    { icon: HeadphonesIcon, label: "고객센터", path: "/super/customer-service" },
    { icon: Search, label: "탐색", path: "/super/explore" },
    { icon: Newspaper, label: "커뮤니티", path: "/super/community" },
    { icon: User, label: "마이", path: "/super/my" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg z-50">
      <div className="max-w-lg mx-auto flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 relative",
                isActive
                  ? "text-primary bg-secondary"
                  : "text-muted-foreground hover:text-primary"
              )}
            >
              <div className="relative">
                <Icon className={cn("w-5 h-5", isActive && "animate-scale-in")} />
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

export default SuperAdminBottomNavigation;
