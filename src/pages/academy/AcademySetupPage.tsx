import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import Logo from "@/components/Logo";
import ImageUpload from "@/components/ImageUpload";
import { ArrowLeft, Building2, MapPin, BookOpen, GraduationCap } from "lucide-react";

const REGIONS = {
  "동탄1신도시": ["동탄1동", "동탄2동", "동탄3동"],
  "동탄2신도시": ["동탄4동", "동탄5동", "동탄6동", "동탄7동", "동탄8동", "동탄9동"],
};

const SUBJECTS = ["수학", "영어", "국어", "과학", "사회", "음악", "미술", "체육", "코딩", "기타"];

const TARGET_GRADES = [
  { id: "kindergarten", label: "유아" },
  { id: "elementary", label: "초등" },
  { id: "middle", label: "중등" },
  { id: "high", label: "고등" },
];

const AcademySetupPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checkingAcademy, setCheckingAcademy] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [city, setCity] = useState("화성시");
  const [district, setDistrict] = useState("동탄2신도시");
  const [dong, setDong] = useState("");
  const [detailAddress, setDetailAddress] = useState("");
  const [subject, setSubject] = useState("");
  const [targetGrades, setTargetGrades] = useState<string[]>([]);
  const [profileImage, setProfileImage] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      
      setUser(session.user);

      // Check if user already has an academy
      const { data: existingAcademy } = await supabase
        .from("academies")
        .select("id")
        .eq("owner_id", session.user.id)
        .maybeSingle();

      if (existingAcademy) {
        // Redirect to dashboard if academy already exists
        navigate("/academy/dashboard");
        return;
      }

      setCheckingAcademy(false);
    };

    checkAuth();
  }, [navigate]);

  const handleTargetGradeChange = (gradeId: string, checked: boolean) => {
    if (checked) {
      setTargetGrades([...targetGrades, gradeId]);
    } else {
      setTargetGrades(targetGrades.filter(g => g !== gradeId));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({ title: "학원명을 입력해주세요", variant: "destructive" });
      return;
    }
    if (!dong) {
      toast({ title: "상세 지역을 선택해주세요", variant: "destructive" });
      return;
    }
    if (!subject) {
      toast({ title: "대표 과목을 선택해주세요", variant: "destructive" });
      return;
    }
    if (targetGrades.length === 0) {
      toast({ title: "대상 학년을 선택해주세요", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const fullAddress = `${city} ${district} ${dong}${detailAddress ? ` ${detailAddress}` : ""}`;
      const targetGradeStr = targetGrades
        .map(id => TARGET_GRADES.find(g => g.id === id)?.label)
        .join("/");

      const { error } = await supabase
        .from("academies")
        .insert({
          name: name.trim(),
          address: fullAddress,
          subject,
          target_grade: targetGradeStr,
          profile_image: profileImage || null,
          description: description.trim() || null,
          owner_id: user.id,
          tags: [],
        });

      if (error) throw error;

      toast({ title: "학원이 성공적으로 등록되었습니다!" });
      navigate("/academy/dashboard");
    } catch (error: any) {
      console.error("Error creating academy:", error);
      toast({ 
        title: "학원 등록 중 오류가 발생했습니다", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingAcademy) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">확인 중...</div>
      </div>
    );
  }

  const dongOptions = REGIONS[district as keyof typeof REGIONS] || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 bg-card/80 backdrop-blur-lg border-b border-border z-40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-muted rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="font-semibold text-foreground">내 학원 등록</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        <div className="text-center mb-6">
          <div className="mx-auto mb-4">
            <Logo size="md" showText={false} />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">학원 정보를 등록해주세요</h2>
          <p className="text-sm text-muted-foreground">
            등록하신 정보는 학부모님들에게 노출됩니다
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Academy Name */}
          <Card className="shadow-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                기본 정보
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">학원명 *</Label>
                <Input
                  id="name"
                  placeholder="예: 에듀플러스 수학학원"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={50}
                />
              </div>

              <div>
                <Label>학원 로고/대표 이미지</Label>
                <ImageUpload
                  value={profileImage}
                  onChange={setProfileImage}
                  folder="academy-profiles"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="description">학원 소개</Label>
                <Textarea
                  id="description"
                  placeholder="학원의 특장점, 교육 철학 등을 소개해주세요"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                  className="min-h-[100px]"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {description.length}/500자
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card className="shadow-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                위치 정보
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>시/군</Label>
                  <Input value={city} disabled className="bg-muted" />
                </div>
                <div>
                  <Label>구역</Label>
                  <Select value={district} onValueChange={(v) => { setDistrict(v); setDong(""); }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="동탄1신도시">동탄1신도시</SelectItem>
                      <SelectItem value="동탄2신도시">동탄2신도시</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>행정동 *</Label>
                <Select value={dong} onValueChange={setDong}>
                  <SelectTrigger>
                    <SelectValue placeholder="동을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {dongOptions.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="detailAddress">상세 주소</Label>
                <Input
                  id="detailAddress"
                  placeholder="예: 에듀타워 3층 301호"
                  value={detailAddress}
                  onChange={(e) => setDetailAddress(e.target.value)}
                  maxLength={100}
                />
              </div>
            </CardContent>
          </Card>

          {/* Subject & Target */}
          <Card className="shadow-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                과목 및 대상
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>대표 과목 *</Label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger>
                    <SelectValue placeholder="과목을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECTS.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  대상 학년 *
                </Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {TARGET_GRADES.map((grade) => (
                    <div key={grade.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={grade.id}
                        checked={targetGrades.includes(grade.id)}
                        onCheckedChange={(checked) => 
                          handleTargetGradeChange(grade.id, checked as boolean)
                        }
                      />
                      <Label htmlFor={grade.id} className="text-sm font-normal cursor-pointer">
                        {grade.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Button 
            type="submit" 
            className="w-full h-12 text-base font-medium"
            disabled={loading}
          >
            {loading ? "등록 중..." : "학원 등록하기"}
          </Button>
        </form>
      </main>
    </div>
  );
};

export default AcademySetupPage;
