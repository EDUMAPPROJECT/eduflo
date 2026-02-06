import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import Logo from "@/components/Logo";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import MultiImageUpload from "@/components/MultiImageUpload";
import { 
  ArrowLeft, 
  Shield, 
  Loader2,
  Plus,
  Calendar,
  MapPin,
  Trash2,
  Edit,
  X,
  HelpCircle
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface Seminar {
  id: string;
  title: string;
  description: string | null;
  date: string;
  location: string | null;
  image_url: string | null;
  capacity: number | null;
  status: 'recruiting' | 'closed';
  subject: string | null;
  target_grade: string | null;
  author_id: string | null;
  academy_id: string | null;
  custom_questions: string[] | null;
  author?: {
    user_name: string | null;
  };
}

const gradeOptions = [
  { value: '초등', label: '초등학생' },
  { value: '중등', label: '중학생' },
  { value: '고등', label: '고등학생' },
  { value: '전체', label: '전체' },
  { value: '기타', label: '기타' },
];

const subjectOptions = [
  { value: '수학', label: '수학' },
  { value: '영어', label: '영어' },
  { value: '국어', label: '국어' },
  { value: '과학', label: '과학' },
  { value: '코딩', label: '코딩' },
  { value: '입시설명회', label: '입시설명회' },
  { value: '기타', label: '기타' },
];

const hourOptions = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const minuteOptions = ['00', '15', '30', '45'];

const SuperAdminSeminarPage = () => {
  const navigate = useNavigate();
  const { isSuperAdmin, loading } = useSuperAdmin();
  const [seminars, setSeminars] = useState<Seminar[]>([]);
  const [seminarsLoading, setSeminarsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSeminar, setEditingSeminar] = useState<Seminar | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [hour, setHour] = useState('10');
  const [minute, setMinute] = useState('00');
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState(30);
  const [subject, setSubject] = useState('');
  const [targetGrade, setTargetGrade] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [customQuestions, setCustomQuestions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && isSuperAdmin) {
      fetchSeminars();
    }
  }, [loading, isSuperAdmin]);

  const fetchSeminars = async () => {
    try {
      const { data, error } = await supabase
        .from('seminars')
        .select('*')
        .is('academy_id', null)
        .order('date', { ascending: false });

      if (error) throw error;

      // Fetch author names
      const authorIds = [...new Set((data || []).filter(s => s.author_id).map(s => s.author_id))];
      let authorsMap: Record<string, string> = {};
      
      if (authorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, user_name')
          .in('id', authorIds);
        
        if (profiles) {
          authorsMap = profiles.reduce((acc, p) => {
            acc[p.id] = p.user_name || '운영자';
            return acc;
          }, {} as Record<string, string>);
        }
      }

      setSeminars((data || []).map(seminar => ({
        ...seminar,
        author: { user_name: seminar.author_id ? authorsMap[seminar.author_id] || '운영자' : '운영자' }
      })));
    } catch (error) {
      console.error('Error fetching seminars:', error);
      toast.error('설명회를 불러오는데 실패했습니다');
    } finally {
      setSeminarsLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDate('');
    setHour('10');
    setMinute('00');
    setLocation('');
    setCapacity(30);
    setSubject('');
    setTargetGrade('');
    setImageUrls([]);
    setCustomQuestions([]);
    setEditingSeminar(null);
  };

  const handleOpenDialog = (seminar?: Seminar) => {
    if (seminar) {
      setEditingSeminar(seminar);
      setTitle(seminar.title);
      setDescription(seminar.description || '');
      const seminarDate = new Date(seminar.date);
      setDate(format(seminarDate, 'yyyy-MM-dd'));
      setHour(format(seminarDate, 'HH'));
      setMinute(format(seminarDate, 'mm'));
      setLocation(seminar.location || '');
      setCapacity(seminar.capacity || 30);
      setSubject(seminar.subject || '');
      setTargetGrade(seminar.target_grade || '');
      // Parse image_url - could be JSON array or single URL
      try {
        const parsed = seminar.image_url ? JSON.parse(seminar.image_url) : [];
        setImageUrls(Array.isArray(parsed) ? parsed : seminar.image_url ? [seminar.image_url] : []);
      } catch {
        setImageUrls(seminar.image_url ? [seminar.image_url] : []);
      }
      setCustomQuestions(seminar.custom_questions || []);
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleAddQuestion = () => {
    if (customQuestions.length >= 3) {
      toast.error('질문은 최대 3개까지 추가할 수 있습니다');
      return;
    }
    setCustomQuestions([...customQuestions, '']);
  };

  const handleQuestionChange = (index: number, value: string) => {
    const updated = [...customQuestions];
    updated[index] = value;
    setCustomQuestions(updated);
  };

  const handleRemoveQuestion = (index: number) => {
    setCustomQuestions(customQuestions.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!title.trim() || !date) {
      toast.error('필수 항목을 입력해주세요');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.error('로그인이 필요합니다');
        return;
      }

      const seminarDate = new Date(`${date}T${hour}:${minute}`);

      // Filter out empty questions
      const validQuestions = customQuestions.filter(q => q.trim());

      const seminarData = {
        title: title.trim(),
        description: description.trim() || null,
        date: seminarDate.toISOString(),
        location: location.trim() || null,
        capacity,
        subject: subject.trim() || null,
        target_grade: targetGrade || null,
        image_url: imageUrls.length > 0 ? JSON.stringify(imageUrls) : null,
        author_id: session.user.id,
        academy_id: null,
        status: 'recruiting' as const,
        custom_questions: validQuestions.length > 0 ? validQuestions : null,
        updated_at: new Date().toISOString(),
      };

      if (editingSeminar) {
        const { error } = await supabase
          .from('seminars')
          .update(seminarData)
          .eq('id', editingSeminar.id);

        if (error) throw error;
        toast.success('설명회가 수정되었습니다');
      } else {
        const { error } = await supabase
          .from('seminars')
          .insert(seminarData);

        if (error) throw error;
        toast.success('설명회가 등록되었습니다');
      }

      setDialogOpen(false);
      resetForm();
      fetchSeminars();
    } catch (error) {
      console.error('Error saving seminar:', error);
      toast.error('설명회 저장에 실패했습니다');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (seminarId: string) => {
    if (!confirm('이 설명회를 삭제하시겠습니까?')) return;

    try {
      const { error } = await supabase
        .from('seminars')
        .delete()
        .eq('id', seminarId);

      if (error) throw error;
      toast.success('설명회가 삭제되었습니다');
      fetchSeminars();
    } catch (error) {
      console.error('Error deleting seminar:', error);
      toast.error('설명회 삭제에 실패했습니다');
    }
  };

  if (loading) {
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
          <span className="font-semibold text-foreground">설명회 관리</span>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Add Button */}
        <Button onClick={() => handleOpenDialog()} className="w-full gap-2">
          <Plus className="w-4 h-4" />
          새 설명회 등록
        </Button>

        {/* Seminars List */}
        {seminarsLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : seminars.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="p-6 text-center text-muted-foreground">
              등록된 설명회가 없습니다
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {seminars.map((seminar) => {
              const seminarDate = new Date(seminar.date);
              const isPast = seminarDate < new Date();
              return (
                <Card key={seminar.id} className="shadow-card">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={isPast ? 'secondary' : seminar.status === 'recruiting' ? 'default' : 'secondary'}>
                            {isPast ? '종료' : seminar.status === 'recruiting' ? '모집중' : '마감'}
                          </Badge>
                          {seminar.custom_questions && seminar.custom_questions.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              <HelpCircle className="w-3 h-3 mr-1" />
                              질문 {seminar.custom_questions.length}개
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-medium text-foreground truncate">{seminar.title}</h3>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(seminarDate, 'M/d HH:mm', { locale: ko })}
                          </span>
                          {seminar.location && (
                            <span className="flex items-center gap-1 truncate">
                              <MapPin className="w-3 h-3 shrink-0" />
                              {seminar.location.split(' | ')[0]}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          등록자: {seminar.author?.user_name || '운영자'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(seminar)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(seminar.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSeminar ? '설명회 수정' : '새 설명회 등록'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>제목 *</Label>
              <Input
                placeholder="설명회 제목"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label>날짜 *</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>시간 *</Label>
              <div className="flex items-center gap-2">
                <Select value={hour} onValueChange={setHour}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {hourOptions.map(h => (
                      <SelectItem key={h} value={h}>{h}시</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-muted-foreground">:</span>
                <Select value={minute} onValueChange={setMinute}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {minuteOptions.map(m => (
                      <SelectItem key={m} value={m}>{m}분</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>장소</Label>
              <Input
                placeholder="장소 (예: 서울시 강남구 역삼동 123-45, 3층)"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>정원</Label>
                <Input
                  type="number"
                  value={capacity}
                  onChange={(e) => setCapacity(parseInt(e.target.value) || 30)}
                  min={1}
                />
              </div>
              <div className="space-y-2">
                <Label>대상 학년</Label>
                <Select value={targetGrade} onValueChange={setTargetGrade}>
                  <SelectTrigger>
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {gradeOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>과목/주제</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="선택" />
                </SelectTrigger>
                <SelectContent>
                  {subjectOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>상세 내용</Label>
              <Textarea
                placeholder="설명회 상세 내용"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                maxLength={2000}
              />
            </div>

            <div className="space-y-2">
              <Label>포스터 이미지 (선택, 최대 5장)</Label>
              <MultiImageUpload
                values={imageUrls}
                onChange={setImageUrls}
                folder="seminars"
                maxImages={5}
              />
            </div>

            {/* Custom Questions Section */}
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4" />
                  신청자 질문 (최대 3개)
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddQuestion}
                  disabled={customQuestions.length >= 3}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  추가
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                학부모가 신청 시 답변해야 할 질문을 추가할 수 있습니다.
              </p>
              {customQuestions.map((question, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    placeholder={`질문 ${index + 1}`}
                    value={question}
                    onChange={(e) => handleQuestionChange(index, e.target.value)}
                    maxLength={100}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveQuestion(index)}
                    className="shrink-0 text-destructive hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={submitting || !title.trim() || !date}
            >
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {submitting ? '저장 중...' : editingSeminar ? '수정' : '등록'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminSeminarPage;
