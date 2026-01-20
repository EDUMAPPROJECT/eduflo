import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useChatMessages } from "@/hooks/useChatMessages";
import { useRoutePrefix } from "@/hooks/useRoutePrefix";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const formatTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const ChatRoomPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const prefix = useRoutePrefix();
  const { messages, roomInfo, loading, userId, isAdmin, sendMessage } = useChatMessages(id);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const result = await sendMessage(newMessage);
    if (result.success) {
      setNewMessage("");
    } else if (result.error) {
      toast.error(result.error);
    }
    setSending(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleBack = () => {
    if (isAdmin) {
      navigate("/admin/chats");
    } else {
      navigate(`${prefix}/chats`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!roomInfo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">채팅방을 찾을 수 없습니다</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 bg-card/80 backdrop-blur-lg border-b border-border z-40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <button 
            className="flex items-center gap-2 flex-1 min-w-0"
            onClick={() => navigate(`${prefix}/academy/${roomInfo.academy.id}`)}
          >
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden shrink-0">
              {roomInfo.academy.profile_image ? (
                <img
                  src={roomInfo.academy.profile_image}
                  alt={roomInfo.academy.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <GraduationCap className="w-4 h-4 text-primary" />
              )}
            </div>
            <h1 className="font-semibold text-foreground truncate">{roomInfo.academy.name}</h1>
          </button>
        </div>
      </header>

      {/* Messages Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">메시지를 보내 상담을 시작하세요</p>
            </div>
          ) : (
            messages.map((message) => {
              const isMe = message.sender_id === userId;
              return (
                <div
                  key={message.id}
                  className={cn("flex", isMe ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[75%] rounded-2xl px-4 py-2.5",
                      isMe
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-secondary text-foreground rounded-tl-sm"
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p
                      className={cn(
                        "text-xs mt-1",
                        isMe ? "text-primary-foreground/70" : "text-muted-foreground"
                      )}
                    >
                      {formatTime(message.created_at)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
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
            disabled={sending}
          />
          <Button
            size="icon"
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sending}
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
