import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Link2, Check, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BottomNavigation from "@/components/BottomNavigation";

interface ConnectedParent {
  id: string;
  parent_id: string;
  status: string;
  created_at: string;
  parent_name?: string;
}

const ParentConnectionPage = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [connectionCode, setConnectionCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [connectedParents, setConnectedParents] = useState<ConnectedParent[]>([]);

  useEffect(() => {
    const fetchUserAndData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        await fetchConnectedParents(session.user.id);
      }
      setPageLoading(false);
    };

    fetchUserAndData();
  }, []);

  const fetchConnectedParents = async (uid: string) => {
    // Fetch connections where this student is connected
    const { data, error } = await supabase
      .from("child_connections")
      .select("*")
      .eq("student_user_id", uid)
      .eq("status", "approved");

    if (error) {
      console.error("Error fetching connections:", error);
      return;
    }

    setConnectedParents(data || []);
  };

  const handleConnect = async () => {
    if (!userId || !connectionCode.trim()) {
      toast.error("연결 코드를 입력해주세요");
      return;
    }

    setLoading(true);
    try {
      // Find the connection request with this code
      const { data: connectionData, error: findError } = await supabase
        .from("child_connections")
        .select("*")
        .eq("connection_code", connectionCode.toUpperCase().trim())
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (findError) throw findError;

      if (!connectionData) {
        toast.error("유효하지 않거나 만료된 코드입니다");
        return;
      }

      // Update the connection with student_user_id
      const { error: updateError } = await supabase
        .from("child_connections")
        .update({
          student_user_id: userId,
          status: "approved",
        })
        .eq("id", connectionData.id);

      if (updateError) throw updateError;

      toast.success("부모님과 연결되었습니다!");
      setConnectionCode("");
      await fetchConnectedParents(userId);
    } catch (error) {
      console.error("Error connecting:", error);
      toast.error("연결에 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-card/80 backdrop-blur-lg border-b border-border z-40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold">부모님 연결</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Connect Section */}
        <section>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Link2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold">부모님 코드 입력</h2>
                  <p className="text-sm text-muted-foreground">
                    부모님께 받은 연결 코드를 입력하세요
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>연결 코드</Label>
                  <Input
                    value={connectionCode}
                    onChange={(e) => setConnectionCode(e.target.value.toUpperCase())}
                    placeholder="예: ABC12345"
                    className="font-mono text-center text-lg tracking-widest uppercase"
                    maxLength={8}
                  />
                </div>

                <Button
                  onClick={handleConnect}
                  disabled={loading || !connectionCode.trim()}
                  className="w-full"
                >
                  {loading ? "연결 중..." : "연결하기"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Connected Parents Section */}
        <section>
          <h2 className="text-base font-semibold mb-4">연결된 부모님</h2>

          {connectedParents.length === 0 ? (
            <Card className="bg-muted/30">
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground text-sm">
                  아직 연결된 부모님이 없습니다.
                </p>
                <p className="text-muted-foreground text-xs mt-1">
                  부모님께 연결 코드를 받아 입력하세요.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {connectedParents.map((parent) => (
                <Card key={parent.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                        <User className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">부모님</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(parent.created_at).toLocaleDateString("ko-KR")} 연결됨
                        </p>
                      </div>
                      <Badge variant="default" className="gap-1">
                        <Check className="w-3 h-3" />
                        연결됨
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Info */}
        <Card className="bg-muted/30">
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">
              • 부모님께서 생성한 연결 코드를 입력하면 연결됩니다.<br />
              • 연결되면 부모님이 학생의 시간표와 수업을 함께 확인할 수 있습니다.<br />
              • 연결 코드는 24시간 동안만 유효합니다.
            </p>
          </CardContent>
        </Card>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default ParentConnectionPage;
