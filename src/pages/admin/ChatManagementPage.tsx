import { useNavigate } from "react-router-dom";
import AdminBottomNavigation from "@/components/AdminBottomNavigation";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, MessageSquare, Construction } from "lucide-react";

const ChatManagementPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-card/80 backdrop-blur-lg border-b border-border z-40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/home')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Logo size="sm" showText={false} />
          <span className="font-semibold text-foreground">학원 채팅 관리</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        <Card className="shadow-card border-border">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Construction className="w-8 h-8 text-amber-600" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">준비 중입니다</h3>
            <p className="text-sm text-muted-foreground mb-4">
              학원 채팅 관리 기능은 현재 개발 중입니다.
              <br />
              조금만 기다려주세요!
            </p>
            <Button variant="outline" onClick={() => navigate('/admin/chats')}>
              <MessageSquare className="w-4 h-4 mr-2" />
              채팅 목록 보기
            </Button>
          </CardContent>
        </Card>
      </main>

      <AdminBottomNavigation />
    </div>
  );
};

export default ChatManagementPage;
