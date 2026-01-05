import { useNavigate } from "react-router-dom";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import Logo from "@/components/Logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  Shield, 
  FileCheck, 
  Users, 
  Settings,
  Loader2
} from "lucide-react";

const SuperAdminPage = () => {
  const navigate = useNavigate();
  const { isSuperAdmin, loading } = useSuperAdmin();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Shield className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="text-xl font-semibold text-foreground mb-2">접근 권한이 없습니다</h1>
        <p className="text-muted-foreground text-center mb-6">
          이 페이지는 슈퍼관리자만 접근할 수 있습니다.
        </p>
        <Button onClick={() => navigate('/admin/home')}>
          관리자 홈으로 돌아가기
        </Button>
      </div>
    );
  }

  const menuItems = [
    {
      title: "사업자 인증 심사",
      description: "학원 사업자 인증 요청을 심사합니다",
      icon: FileCheck,
      path: "/admin/verification-review",
      color: "text-primary"
    },
    {
      title: "사용자 관리",
      description: "등록된 사용자 및 역할을 관리합니다",
      icon: Users,
      path: "/admin/super/users",
      color: "text-chart-2"
    },
    {
      title: "시스템 설정",
      description: "플랫폼 공지사항 및 설정을 관리합니다",
      icon: Settings,
      path: "/admin/super/settings",
      color: "text-chart-3"
    }
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-card/80 backdrop-blur-lg border-b border-border z-40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/home')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Logo size="sm" showText={false} />
          <span className="font-semibold text-foreground">슈퍼관리자</span>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Super Admin Badge */}
        <Card className="shadow-card bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
                <Shield className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">슈퍼관리자 센터</h2>
                <p className="text-sm text-muted-foreground">
                  플랫폼 전체를 관리할 수 있는 권한이 있습니다
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Menu Items */}
        <div className="space-y-3">
          {menuItems.map((item) => (
            <Card 
              key={item.path}
              className="shadow-card transition-all duration-200 hover:shadow-lg cursor-pointer hover:-translate-y-0.5"
              onClick={() => navigate(item.path)}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl bg-secondary flex items-center justify-center`}>
                  <item.icon className={`w-6 h-6 ${item.color}`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default SuperAdminPage;
