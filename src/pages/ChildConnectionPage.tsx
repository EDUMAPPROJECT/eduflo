import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, RefreshCw, UserPlus, Clock, Check, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BottomNavigation from "@/components/BottomNavigation";

interface Child {
  id: string;
  name: string;
  grade: string | null;
  created_at: string;
}

interface ConnectionRequest {
  id: string;
  connection_code: string;
  status: string;
  child_id: string | null;
  student_user_id: string | null;
  created_at: string;
  expires_at: string;
  child?: Child;
}

const ChildConnectionPage = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [connectionRequests, setConnectionRequests] = useState<ConnectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddChildDialog, setShowAddChildDialog] = useState(false);
  const [newChildName, setNewChildName] = useState("");
  const [newChildGrade, setNewChildGrade] = useState("");
  const [generatingCode, setGeneratingCode] = useState(false);
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [currentCode, setCurrentCode] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserAndData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        await fetchData(session.user.id);
      }
      setLoading(false);
    };

    fetchUserAndData();
  }, []);

  const fetchData = async (uid: string) => {
    // Fetch children
    const { data: childrenData, error: childrenError } = await supabase
      .from("children")
      .select("*")
      .eq("parent_id", uid)
      .order("created_at", { ascending: true });

    if (childrenError) {
      console.error("Error fetching children:", childrenError);
    } else {
      setChildren(childrenData || []);
    }

    // Fetch connection requests
    const { data: requestsData, error: requestsError } = await supabase
      .from("child_connections")
      .select(`
        *,
        child:children(*)
      `)
      .eq("parent_id", uid)
      .order("created_at", { ascending: false });

    if (requestsError) {
      console.error("Error fetching connection requests:", requestsError);
    } else {
      setConnectionRequests(requestsData || []);
    }
  };

  const handleAddChild = async () => {
    if (!userId || !newChildName.trim()) {
      toast.error("자녀 이름을 입력해주세요");
      return;
    }

    const { data, error } = await supabase
      .from("children")
      .insert({
        parent_id: userId,
        name: newChildName.trim(),
        grade: newChildGrade.trim() || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error adding child:", error);
      toast.error("자녀 추가에 실패했습니다");
      return;
    }

    setChildren(prev => [...prev, data]);
    setShowAddChildDialog(false);
    setNewChildName("");
    setNewChildGrade("");
    toast.success("자녀가 추가되었습니다");
  };

  const handleDeleteChild = async (childId: string) => {
    if (!confirm("이 자녀를 삭제하시겠습니까? 관련된 수업 등록 정보도 함께 해제됩니다.")) {
      return;
    }

    const { error } = await supabase
      .from("children")
      .delete()
      .eq("id", childId);

    if (error) {
      console.error("Error deleting child:", error);
      toast.error("자녀 삭제에 실패했습니다");
      return;
    }

    setChildren(prev => prev.filter(c => c.id !== childId));
    toast.success("자녀가 삭제되었습니다");
  };

  const handleGenerateCode = async () => {
    if (!userId) return;

    setGeneratingCode(true);

    try {
      // Generate code using database function
      const { data: codeData, error: codeError } = await supabase.rpc("generate_connection_code");

      if (codeError) throw codeError;

      // Create connection request (without child_id, for student user to connect)
      const { data, error } = await supabase
        .from("child_connections")
        .insert({
          parent_id: userId,
          connection_code: codeData,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;

      setConnectionRequests(prev => [data, ...prev]);
      setCurrentCode(codeData);
      setShowCodeDialog(true);
      toast.success("연결 코드가 생성되었습니다");
    } catch (error) {
      console.error("Error generating code:", error);
      toast.error("코드 생성에 실패했습니다");
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("코드가 복사되었습니다");
    } catch {
      toast.error("코드 복사에 실패했습니다");
    }
  };

  const handleDeleteConnection = async (connectionId: string) => {
    const { error } = await supabase
      .from("child_connections")
      .delete()
      .eq("id", connectionId);

    if (error) {
      console.error("Error deleting connection:", error);
      toast.error("삭제에 실패했습니다");
      return;
    }

    setConnectionRequests(prev => prev.filter(r => r.id !== connectionId));
    toast.success("삭제되었습니다");
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const formatExpiryTime = (expiresAt: string) => {
    const expiry = new Date(expiresAt);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return "만료됨";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}시간 ${minutes}분 남음`;
    }
    return `${minutes}분 남음`;
  };

  // Filter to get connected students (approved connections with student_user_id)
  const connectedStudents = connectionRequests.filter(
    r => r.status === "approved" && r.student_user_id
  );

  // Filter to get pending codes
  const pendingCodes = connectionRequests.filter(
    r => r.status === "pending" && !isExpired(r.expires_at)
  );

  if (loading) {
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
          <h1 className="text-lg font-semibold">자녀 연결</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Generate Code Section */}
        <section>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold">연결 코드 생성</h2>
                  <p className="text-sm text-muted-foreground">
                    자녀(학생 계정)에게 코드를 전달하세요
                  </p>
                </div>
                <Button
                  onClick={handleGenerateCode}
                  disabled={generatingCode}
                  className="gap-2"
                >
                  {generatingCode ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  코드 생성
                </Button>
              </div>

              {pendingCodes.length > 0 && (
                <div className="space-y-2 mt-4 pt-4 border-t">
                  <p className="text-xs text-muted-foreground mb-2">대기 중인 코드</p>
                  {pendingCodes.map((request) => (
                    <div 
                      key={request.id}
                      className="flex items-center justify-between bg-muted/50 rounded-lg p-3"
                    >
                      <div>
                        <p className="font-mono text-lg font-bold tracking-wider">
                          {request.connection_code}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatExpiryTime(request.expires_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleCopyCode(request.connection_code)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDeleteConnection(request.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Connected Students Section */}
        <section>
          <h2 className="text-base font-semibold mb-4">연결된 자녀</h2>

          {connectedStudents.length === 0 ? (
            <Card className="bg-muted/30">
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground text-sm">
                  아직 연결된 자녀가 없습니다.
                </p>
                <p className="text-muted-foreground text-xs mt-1">
                  연결 코드를 생성하여 자녀에게 전달하세요.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {connectedStudents.map((connection) => (
                <Card key={connection.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                        <User className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">
                          {connection.child?.name || "학생"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(connection.created_at).toLocaleDateString("ko-KR")} 연결됨
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

        {/* Children Management Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">내 자녀 (프로필)</h2>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAddChildDialog(true)}
              className="gap-1"
            >
              <UserPlus className="w-4 h-4" />
              추가
            </Button>
          </div>

          {children.length === 0 ? (
            <Card className="bg-muted/30">
              <CardContent className="py-6 text-center">
                <p className="text-muted-foreground text-sm">
                  등록된 자녀 프로필이 없습니다.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {children.map((child) => (
                <Card key={child.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{child.name}</p>
                        {child.grade && (
                          <p className="text-xs text-muted-foreground">{child.grade}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => handleDeleteChild(child.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
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
              • 연결 코드는 생성 후 24시간 동안 유효합니다.<br />
              • 자녀(학생 계정)가 이 코드를 입력하면 자동으로 연결됩니다.<br />
              • 연결되면 자녀의 시간표, MY CLASS, 성향 테스트 등을 함께 확인할 수 있습니다.
            </p>
          </CardContent>
        </Card>
      </main>

      {/* Add Child Dialog */}
      <Dialog open={showAddChildDialog} onOpenChange={setShowAddChildDialog}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-sm">
          <DialogHeader>
            <DialogTitle>자녀 프로필 추가</DialogTitle>
            <DialogDescription>
              자녀의 정보를 입력해주세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>이름 *</Label>
              <Input
                value={newChildName}
                onChange={(e) => setNewChildName(e.target.value)}
                placeholder="예: 김민수"
              />
            </div>
            <div className="space-y-2">
              <Label>학년 (선택)</Label>
              <Input
                value={newChildGrade}
                onChange={(e) => setNewChildGrade(e.target.value)}
                placeholder="예: 중1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddChildDialog(false)}>
              취소
            </Button>
            <Button onClick={handleAddChild} disabled={!newChildName.trim()}>
              추가
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Code Generated Dialog */}
      <Dialog open={showCodeDialog} onOpenChange={setShowCodeDialog}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-sm">
          <DialogHeader>
            <DialogTitle>연결 코드 생성 완료</DialogTitle>
            <DialogDescription>
              아래 코드를 자녀(학생 계정)에게 전달하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 text-center">
            <p className="font-mono text-3xl font-bold tracking-widest text-primary">
              {currentCode}
            </p>
            <p className="text-sm text-muted-foreground mt-3">
              코드는 24시간 후 만료됩니다.
            </p>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button 
              className="w-full"
              onClick={() => currentCode && handleCopyCode(currentCode)}
            >
              <Copy className="w-4 h-4 mr-2" />
              코드 복사
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setShowCodeDialog(false)}
            >
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNavigation />
    </div>
  );
};

export default ChildConnectionPage;