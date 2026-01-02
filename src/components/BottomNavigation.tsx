import { Home, Search, MessageCircle, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { icon: Home, label: "홈", path: "/home" },
  { icon: Search, label: "탐색", path: "/explore" },
  { icon: MessageCircle, label: "채팅", path: "/chats" },
  { icon: User, label: "마이", path: "/my" },
];

const BottomNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg z-50">
      <div className="max-w-lg mx-auto flex items-center justify-around h-16 px-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-6 py-2 rounded-xl transition-all duration-200",
                isActive
                  ? "text-primary bg-secondary"
                  : "text-muted-foreground hover:text-primary"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive && "animate-scale-in")} />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
      {/* Safe area for iOS */}
      <div className="h-safe-area-inset-bottom bg-card" />
    </nav>
  );
};

export default BottomNavigation;
