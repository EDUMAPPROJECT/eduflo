import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import Logo from "@/components/Logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Settings, 
  Megaphone, 
  Plus,
  Trash2,
  Edit2,
  Loader2,
  Shield,
  Save,
  Sparkles,
  Copy,
  Check
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Announcement {
  id: string;
  title: string;
  content: string;
  is_active: boolean;
  priority: number;
  created_at: string;
}

interface PlatformSettings {
  email_verification_enabled: boolean;
}

const AI_PROMPT = `# 학부모-학원 연결 플랫폼 (Parent-Academy Connection Platform)

## 프로젝트 개요
학부모와 학원을 연결하는 모바일 우선 웹 애플리케이션입니다. 학부모는 학원을 탐색하고, 상담을 예약하고, 수업을 등록할 수 있습니다. 학원 관리자는 학원 프로필, 수업, 상담 예약을 관리할 수 있습니다.

## 기술 스택
- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- Supabase (Auth, Database, Storage, Edge Functions)
- React Query (TanStack Query)
- React Router v6

## 사용자 역할
1. **학부모 (Parent)**: 학원 탐색, 찜하기, 상담 예약, 수업 등록, 시간표 관리
2. **학원 관리자 (Admin)**: 학원 프로필 관리, 수업/강사 관리, 상담 예약 관리, 피드 포스트 작성
3. **슈퍼 관리자 (Super Admin)**: 전체 플랫폼 관리, 학원 등록/수정, 사용자 관리, 시스템 설정

## 주요 기능

### 학부모 기능
- 지역별 학원 탐색 및 검색
- 학원 상세 정보 조회 (강사, 수업, 커리큘럼)
- 학원 찜하기 (북마크)
- 상담 예약 신청
- 수업 등록 및 시간표 관리
- 수동 일정 추가
- 학습 성향 테스트
- 커뮤니티 피드 조회

### 학원 관리자 기능
- 학원 프로필 관리 (기본 정보, 이미지, 태그)
- 강사 등록 및 관리
- 수업 개설 및 관리 (시간표, 수강료, 커리큘럼)
- 상담 예약 확인 및 관리
- 피드 포스트 작성 (공지, 이벤트, 설명회)
- 채팅 상담

### 슈퍼 관리자 기능
- 등록 학원 관리 (생성, 수정, 삭제)
- 사용자 관리
- 사업자 인증 심사
- 플랫폼 공지사항 관리
- 시스템 설정 (이메일 인증 등)

## 데이터베이스 테이블
- academies: 학원 정보
- teachers: 강사 정보
- classes: 수업 정보
- consultations: 상담 신청
- consultation_reservations: 상담 예약
- bookmarks: 찜한 학원
- class_enrollments: 수업 등록
- manual_schedules: 수동 일정
- feed_posts: 피드 게시물
- seminars: 설명회
- chat_rooms, messages: 채팅
- profiles: 사용자 프로필
- user_roles: 사용자 역할
- announcements: 플랫폼 공지
- platform_settings: 플랫폼 설정

## 라우트 구조

### 학부모용
- /: 홈 (학원 탐색)
- /explore: 탐색
- /events: 이벤트/설명회
- /community: 커뮤니티 피드
- /my: 마이페이지
- /my/classes: 내 수업
- /my/bookmarks: 찜한 학원
- /my/reservations: 상담 예약 내역
- /timetable: 시간표
- /academy/:id: 학원 상세
- /chat: 채팅 목록
- /chat/:roomId: 채팅방

### 학원 관리자용
- /admin/home: 관리자 홈
- /admin/dashboard: 대시보드
- /admin/profile: 프로필 관리
- /admin/consultations: 상담 관리
- /admin/reservations: 예약 관리
- /admin/posts: 게시물 관리
- /admin/feed-posts: 피드 관리
- /admin/seminars: 설명회 관리
- /admin/chat: 채팅

### 슈퍼 관리자용
- /admin/super: 슈퍼 관리자 메인
- /admin/super/academies: 학원 관리
- /admin/super/academies/create: 학원 생성
- /admin/super/academies/:id/edit: 학원 수정
- /admin/super/users: 사용자 관리
- /admin/super/settings: 시스템 설정
- /admin/super/verification: 사업자 인증 심사

## 디자인 시스템
- 모바일 우선 반응형 디자인 (max-w-lg)
- 하단 네비게이션 바
- 카드 기반 UI
- 시맨틱 컬러 토큰 사용 (--primary, --secondary, --muted 등)
- 한국어 UI

## 인증 플로우
1. 이메일/비밀번호 회원가입
2. 역할 선택 (학부모/학원 관리자)
3. 학원 관리자는 학원 설정 필요
4. 슈퍼 관리자는 user_roles 테이블에서 is_super_admin = true

## 주요 컴포넌트
- BottomNavigation: 학부모용 하단 네비게이션
- AdminBottomNavigation: 관리자용 하단 네비게이션
- Logo: 로고 컴포넌트
- RegionSelector: 지역 선택
- ImageUpload: 이미지 업로드
- ClassScheduleInput: 수업 시간표 입력

이 프롬프트를 사용하여 AI가 앱의 구조와 기능을 이해하고 추가 개발을 할 수 있습니다.`;

const SuperAdminSettingsPage = () => {
  const navigate = useNavigate();
  const { isSuperAdmin, loading: authLoading } = useSuperAdmin();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    is_active: true,
    priority: 0
  });
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>({
    email_verification_enabled: true
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [promptDialogOpen, setPromptDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(AI_PROMPT);
      setCopied(true);
      toast.success("프롬프트가 복사되었습니다");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("복사에 실패했습니다");
    }
  };

  useEffect(() => {
    if (!authLoading && isSuperAdmin) {
      fetchAnnouncements();
      fetchPlatformSettings();
    }
  }, [authLoading, isSuperAdmin]);

  const fetchPlatformSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('key, value')
        .eq('key', 'email_verification_enabled')
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setPlatformSettings({
          email_verification_enabled: data.value === true || data.value === 'true'
        });
      }
    } catch (error) {
      console.error('Error fetching platform settings:', error);
    }
  };

  const handleEmailVerificationToggle = async (enabled: boolean) => {
    setSettingsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data: existingData } = await supabase
        .from('platform_settings')
        .select('id')
        .eq('key', 'email_verification_enabled')
        .maybeSingle();

      if (existingData) {
        const { error } = await supabase
          .from('platform_settings')
          .update({ 
            value: enabled,
            updated_by: session?.user?.id 
          })
          .eq('key', 'email_verification_enabled');

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('platform_settings')
          .insert({
            key: 'email_verification_enabled',
            value: enabled,
            description: '회원가입 시 이메일 인증 필수 여부',
            updated_by: session?.user?.id
          });

        if (error) throw error;
      }

      setPlatformSettings({ email_verification_enabled: enabled });
      toast.success(enabled ? "이메일 인증이 활성화되었습니다" : "이메일 인증이 비활성화되었습니다");
    } catch (error) {
      console.error('Error updating email verification setting:', error);
      toast.error("설정 변경에 실패했습니다");
    } finally {
      setSettingsLoading(false);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      toast.error("공지사항을 불러오는데 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error("제목과 내용을 입력해주세요");
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (editingAnnouncement) {
        const { error } = await supabase
          .from('announcements')
          .update({
            title: formData.title.trim(),
            content: formData.content.trim(),
            is_active: formData.is_active,
            priority: formData.priority
          })
          .eq('id', editingAnnouncement.id);

        if (error) throw error;
        toast.success("공지사항이 수정되었습니다");
      } else {
        const { error } = await supabase
          .from('announcements')
          .insert({
            title: formData.title.trim(),
            content: formData.content.trim(),
            is_active: formData.is_active,
            priority: formData.priority,
            created_by: session?.user?.id
          });

        if (error) throw error;
        toast.success("공지사항이 등록되었습니다");
      }

      setDialogOpen(false);
      resetForm();
      fetchAnnouncements();
    } catch (error) {
      console.error('Error saving announcement:', error);
      toast.error("저장에 실패했습니다");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;

    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("공지사항이 삭제되었습니다");
      fetchAnnouncements();
    } catch (error) {
      console.error('Error deleting announcement:', error);
      toast.error("삭제에 실패했습니다");
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      is_active: announcement.is_active,
      priority: announcement.priority
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({ title: "", content: "", is_active: true, priority: 0 });
    setEditingAnnouncement(null);
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      fetchAnnouncements();
      toast.success(currentStatus ? "공지사항이 비활성화되었습니다" : "공지사항이 활성화되었습니다");
    } catch (error) {
      console.error('Error toggling announcement:', error);
      toast.error("상태 변경에 실패했습니다");
    }
  };

  if (authLoading || loading) {
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
        <Button onClick={() => navigate('/admin/home')}>돌아가기</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-card/80 backdrop-blur-lg border-b border-border z-40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/super')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Logo size="sm" showText={false} />
          <span className="font-semibold text-foreground">시스템 설정</span>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Announcements Section */}
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-primary" />
              플랫폼 공지사항
            </CardTitle>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  추가
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingAnnouncement ? "공지사항 수정" : "새 공지사항"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">제목</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="공지사항 제목"
                      maxLength={100}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="content">내용</Label>
                    <Textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="공지사항 내용을 입력하세요"
                      rows={4}
                      maxLength={1000}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">우선순위</Label>
                    <Input
                      id="priority"
                      type="number"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                      placeholder="높을수록 상단에 표시"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="is_active">활성화</Label>
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    <Save className="w-4 h-4 mr-2" />
                    {editingAnnouncement ? "수정하기" : "등록하기"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="space-y-3">
            {announcements.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                등록된 공지사항이 없습니다
              </p>
            ) : (
              announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="p-4 border border-border rounded-lg space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-foreground">{announcement.title}</h4>
                        <Badge variant={announcement.is_active ? "default" : "secondary"}>
                          {announcement.is_active ? "활성" : "비활성"}
                        </Badge>
                        {announcement.priority > 0 && (
                          <Badge variant="outline">우선: {announcement.priority}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {announcement.content}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(announcement.created_at).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleActive(announcement.id, announcement.is_active)}
                      >
                        <Switch checked={announcement.is_active} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(announcement)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(announcement.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Platform Settings */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              기본 설정
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Email Verification Toggle */}
            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div className="flex-1">
                <h4 className="font-medium text-foreground">이메일 인증</h4>
                <p className="text-sm text-muted-foreground">
                  회원가입 시 이메일 인증을 필수로 요구합니다
                </p>
              </div>
              <Switch
                checked={platformSettings.email_verification_enabled}
                onCheckedChange={handleEmailVerificationToggle}
                disabled={settingsLoading}
              />
            </div>
            
            <p className="text-xs text-muted-foreground">
              ※ 이메일 인증을 비활성화하면 가입 즉시 계정이 활성화됩니다
            </p>
          </CardContent>
        </Card>
      </main>

      {/* AI Prompt Button - Fixed Bottom Right */}
      <Dialog open={promptDialogOpen} onOpenChange={setPromptDialogOpen}>
        <DialogTrigger asChild>
          <Button
            size="icon"
            className="fixed bottom-24 right-4 h-12 w-12 rounded-full shadow-lg z-50"
          >
            <Sparkles className="w-5 h-5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI 구현용 프롬프트
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              아래 프롬프트를 AI에게 제공하면 이 앱의 구조와 기능을 이해하고 추가 개발을 할 수 있습니다.
            </p>
            <ScrollArea className="h-[50vh] border border-border rounded-lg p-4">
              <pre className="text-xs whitespace-pre-wrap font-mono text-foreground">
                {AI_PROMPT}
              </pre>
            </ScrollArea>
            <Button onClick={handleCopyPrompt} className="w-full">
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  복사됨
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  프롬프트 복사
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminSettingsPage;
