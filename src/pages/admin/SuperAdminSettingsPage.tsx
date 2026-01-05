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
  Save
} from "lucide-react";
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

  useEffect(() => {
    if (!authLoading && isSuperAdmin) {
      fetchAnnouncements();
    }
  }, [authLoading, isSuperAdmin]);

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
          <CardContent>
            <p className="text-center text-muted-foreground py-8">
              추가 설정 기능이 곧 제공될 예정입니다
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default SuperAdminSettingsPage;
