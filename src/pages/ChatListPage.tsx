import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Logo from "@/components/Logo";
import BottomNavigation from "@/components/BottomNavigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, GraduationCap } from "lucide-react";

// Mock data for chat rooms (will be replaced with real data later)
const mockChatRooms = [
  {
    id: "1",
    academy: {
      id: "academy-1",
      name: "스마트 수학 학원",
      profile_image: null,
    },
    lastMessage: "네, 상담 가능합니다. 언제 방문하실 수 있으신가요?",
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
    unreadCount: 2,
  },
  {
    id: "2",
    academy: {
      id: "academy-2",
      name: "영재 영어 아카데미",
      profile_image: null,
    },
    lastMessage: "감사합니다. 다음 주에 체험 수업 진행하겠습니다.",
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    unreadCount: 0,
  },
  {
    id: "3",
    academy: {
      id: "academy-3",
      name: "창의력 과학교실",
      profile_image: null,
    },
    lastMessage: "안녕하세요! 무엇을 도와드릴까요?",
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    unreadCount: 1,
  },
];

const formatTime = (date: Date) => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 7) return `${days}일 전`;
  return date.toLocaleDateString("ko-KR");
};

const ChatListPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 bg-card/80 backdrop-blur-lg border-b border-border z-40">
          <div className="max-w-lg mx-auto px-4 h-14 flex items-center">
            <Logo size="sm" />
          </div>
        </header>
        <main className="max-w-lg mx-auto px-4 py-6">
          <Card className="shadow-card">
            <CardContent className="p-8 text-center">
              <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-semibold text-foreground mb-2">로그인이 필요합니다</h3>
              <p className="text-sm text-muted-foreground mb-4">
                채팅 상담을 이용하려면 로그인해주세요
              </p>
              <button
                onClick={() => navigate("/auth")}
                className="text-primary font-medium hover:underline"
              >
                로그인하러 가기
              </button>
            </CardContent>
          </Card>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-card/80 backdrop-blur-lg border-b border-border z-40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center">
          <Logo size="sm" />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-foreground mb-4">상담 중인 채팅</h1>

        {mockChatRooms.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="p-8 text-center">
              <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-semibold text-foreground mb-2">진행 중인 채팅이 없습니다</h3>
              <p className="text-sm text-muted-foreground">
                학원 상세 페이지에서 채팅 상담을 시작해보세요
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {mockChatRooms.map((room) => (
              <Card
                key={room.id}
                className="shadow-card cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/chats/${room.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    {/* Academy Logo */}
                    <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center overflow-hidden shrink-0">
                      {room.academy.profile_image ? (
                        <img
                          src={room.academy.profile_image}
                          alt={room.academy.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <GraduationCap className="w-6 h-6 text-primary" />
                      )}
                    </div>

                    {/* Chat Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-foreground truncate">
                          {room.academy.name}
                        </h3>
                        <span className="text-xs text-muted-foreground shrink-0 ml-2">
                          {formatTime(room.lastMessageAt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground truncate">
                          {room.lastMessage}
                        </p>
                        {room.unreadCount > 0 && (
                          <Badge className="bg-primary text-primary-foreground shrink-0 ml-2 rounded-full min-w-[20px] h-5 flex items-center justify-center">
                            {room.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
};

export default ChatListPage;
