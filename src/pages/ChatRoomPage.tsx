import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  content: string;
  senderId: string;
  senderType: "parent" | "academy";
  createdAt: Date;
}

// Mock data
const mockAcademy = {
  id: "academy-1",
  name: "스마트 수학 학원",
  profile_image: null,
};

const initialMockMessages: Message[] = [
  {
    id: "1",
    content: "안녕하세요! 스마트 수학 학원입니다. 무엇을 도와드릴까요?",
    senderId: "academy-1",
    senderType: "academy",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
  },
  {
    id: "2",
    content: "안녕하세요. 중학교 2학년 자녀 수학 상담을 받고 싶습니다.",
    senderId: "parent-1",
    senderType: "parent",
    createdAt: new Date(Date.now() - 1000 * 60 * 60),
  },
  {
    id: "3",
    content: "네, 상담 가능합니다. 현재 중등부 수학 심화반과 내신대비반이 개설되어 있습니다.",
    senderId: "academy-1",
    senderType: "academy",
    createdAt: new Date(Date.now() - 1000 * 60 * 30),
  },
  {
    id: "4",
    content: "언제 방문하실 수 있으신가요? 직접 오시면 레벨 테스트와 함께 자세한 상담을 도와드리겠습니다.",
    senderId: "academy-1",
    senderType: "academy",
    createdAt: new Date(Date.now() - 1000 * 60 * 5),
  },
];

const formatTime = (date: Date) => {
  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const ChatRoomPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>(initialMockMessages);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      content: newMessage.trim(),
      senderId: user?.id || "parent-1",
      senderType: "parent",
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, newMsg]);
    setNewMessage("");

    // Mock academy response after 1 second
    setTimeout(() => {
      const autoReply: Message = {
        id: `msg-${Date.now() + 1}`,
        content: "메시지 확인했습니다. 빠른 시일 내에 답변드리겠습니다. 😊",
        senderId: "academy-1",
        senderType: "academy",
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, autoReply]);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 bg-card/80 backdrop-blur-lg border-b border-border z-40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/chats")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
            {mockAcademy.profile_image ? (
              <img
                src={mockAcademy.profile_image}
                alt={mockAcademy.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <GraduationCap className="w-4 h-4 text-primary" />
            )}
          </div>
          <h1 className="font-semibold text-foreground truncate">{mockAcademy.name}</h1>
        </div>
      </header>

      {/* Messages Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex",
                message.senderType === "parent" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-4 py-2.5",
                  message.senderType === "parent"
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-secondary text-foreground rounded-tl-sm"
                )}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <p
                  className={cn(
                    "text-xs mt-1",
                    message.senderType === "parent"
                      ? "text-primary-foreground/70"
                      : "text-muted-foreground"
                  )}
                >
                  {formatTime(message.createdAt)}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Message Input */}
      <div className="sticky bottom-0 bg-card border-t border-border p-4">
        <div className="max-w-lg mx-auto flex gap-2">
          <Input
            placeholder="메시지를 입력하세요..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 rounded-full"
          />
          <Button
            size="icon"
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="rounded-full shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatRoomPage;
