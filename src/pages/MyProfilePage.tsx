import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, User } from "lucide-react";
import { toast } from "sonner";
import BottomNavigation from "@/components/BottomNavigation";
import AdminBottomNavigation from "@/components/AdminBottomNavigation";
import StudentBottomNavigation from "@/components/StudentBottomNavigation";

const MyProfilePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Determine which navigation to show based on current path
  const isAdminRoute = location.pathname.startsWith("/admin");
  const isStudentRoute = location.pathname.startsWith("/s/");
  
  const [formData, setFormData] = useState({
    user_name: "",
    phone: "",
    email: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      
      setUser(session.user);
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();
      
      if (profile) {
        setFormData({
          user_name: profile.user_name || "",
          phone: profile.phone || "",
          email: profile.email || session.user.email || "",
        });
      } else {
        setFormData(prev => ({
          ...prev,
          email: session.user.email || "",
        }));
      }
      
      setLoading(false);
    };

    fetchData();
  }, [navigate]);

  const handleSave = async () => {
    if (!user) return;

    // Validate
    if (formData.user_name && formData.user_name.length > 50) {
      toast.error("닉네임은 50자 이내로 입력해주세요");
      return;
    }
    if (formData.phone && !/^[0-9-]{0,20}$/.test(formData.phone)) {
      toast.error("올바른 전화번호 형식을 입력해주세요");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          user_name: formData.user_name || null,
          phone: formData.phone || null,
          email: formData.email || null,
        });

      if (error) throw error;
      toast.success("프로필이 저장되었습니다");
    } catch (error) {
      console.error("Save error:", error);
      toast.error("저장에 실패했습니다");
    } finally {
      setSaving(false);
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
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-card/80 backdrop-blur-lg border-b border-border z-40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">내 정보</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Profile Avatar */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center border-4 border-background shadow-lg">
                <span className="text-3xl font-bold text-primary">
                  {formData.user_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || "U"}
                </span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {formData.user_name || "닉네임을 설정해주세요"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Profile Form */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user_name">닉네임</Label>
              <Input
                id="user_name"
                placeholder="닉네임을 입력해주세요"
                value={formData.user_name}
                onChange={(e) => setFormData(prev => ({ ...prev, user_name: e.target.value }))}
                maxLength={50}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">전화번호</Label>
              <Input
                id="phone"
                placeholder="010-0000-0000"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                maxLength={20}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                placeholder="이메일 주소"
                value={formData.email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">이메일은 수정할 수 없습니다</p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button
          className="w-full"
          size="lg"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "저장 중..." : "저장하기"}
        </Button>
      </main>

      {isAdminRoute ? (
        <AdminBottomNavigation />
      ) : isStudentRoute ? (
        <StudentBottomNavigation />
      ) : (
        <BottomNavigation />
      )}
    </div>
  );
};

export default MyProfilePage;
