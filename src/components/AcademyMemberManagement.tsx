import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAcademyMembership, AcademyMember } from "@/hooks/useAcademyMembership";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, Copy, RefreshCw, Crown, Shield, Trash2, Settings, Clock, Check, X } from "lucide-react";
import { logError } from "@/lib/errorLogger";

interface AcademyMemberManagementProps {
  academyId: string;
}

interface MemberWithProfile {
  id: string;
  user_id: string;
  role: string;
  status: string;
  permissions: AcademyMember['permissions'];
  created_at: string;
  profile: {
    user_name: string | null;
    email: string | null;
  } | null;
}

const AcademyMemberManagement = ({ academyId }: AcademyMemberManagementProps) => {
  const { isOwner, generateJoinCode, primaryAcademy, refetch } = useAcademyMembership();
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [joinCode, setJoinCode] = useState<string | null>(null);
  
  // Permission editing
  const [editingMember, setEditingMember] = useState<MemberWithProfile | null>(null);
  const [editedPermissions, setEditedPermissions] = useState<AcademyMember['permissions'] | null>(null);
  const [saving, setSaving] = useState(false);

  const isAcademyOwner = isOwner(academyId);

  useEffect(() => {
    fetchMembers();
    fetchJoinCode();
  }, [academyId]);

  const fetchJoinCode = async () => {
    const { data } = await supabase
      .from('academies')
      .select('join_code')
      .eq('id', academyId)
      .single();
    
    if (data) {
      setJoinCode(data.join_code);
    }
  };

  const fetchMembers = async () => {
    try {
      const { data: memberData, error } = await supabase
        .from('academy_members')
        .select('*')
        .eq('academy_id', academyId)
        .order('created_at');

      if (error) throw error;

      // Fetch profiles for each member
      if (memberData && memberData.length > 0) {
        const userIds = memberData.map(m => m.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, user_name, email')
          .in('id', userIds);

        const membersWithProfiles = memberData.map(member => ({
          ...member,
          permissions: member.permissions as AcademyMember['permissions'],
          profile: profiles?.find(p => p.id === member.user_id) || null,
        }));

        setMembers(membersWithProfiles);
      } else {
        setMembers([]);
      }
    } catch (error) {
      logError('Fetch Members', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCode = async () => {
    setGenerating(true);
    const result = await generateJoinCode(academyId);
    setGenerating(false);

    if (result.success) {
      setJoinCode(result.code || null);
      toast.success("새 참여 코드가 생성되었습니다");
    } else {
      toast.error(result.error || "코드 생성에 실패했습니다");
    }
  };

  const copyCode = () => {
    if (joinCode) {
      navigator.clipboard.writeText(joinCode);
      toast.success("참여 코드가 복사되었습니다");
    }
  };

  const openPermissionDialog = (member: MemberWithProfile) => {
    setEditingMember(member);
    setEditedPermissions({ ...member.permissions });
  };

  const handlePermissionChange = (key: keyof AcademyMember['permissions'], value: boolean) => {
    if (editedPermissions) {
      setEditedPermissions({ ...editedPermissions, [key]: value });
    }
  };

  const savePermissions = async () => {
    if (!editingMember || !editedPermissions) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('academy_members')
        .update({ permissions: editedPermissions as any })
        .eq('id', editingMember.id);

      if (error) throw error;

      toast.success("권한이 수정되었습니다");
      setEditingMember(null);
      fetchMembers();
    } catch (error) {
      logError('Save Permissions', error);
      toast.error("권한 저장에 실패했습니다");
    } finally {
      setSaving(false);
    }
  };

  const removeMember = async (memberId: string) => {
    if (!confirm("정말로 이 관리자를 제거하시겠습니까?")) return;

    try {
      const { error } = await supabase
        .from('academy_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast.success("관리자가 제거되었습니다");
      fetchMembers();
    } catch (error) {
      logError('Remove Member', error);
      toast.error("관리자 제거에 실패했습니다");
    }
  };

  const permissionLabels: Record<keyof AcademyMember['permissions'], string> = {
    manage_classes: "수업 관리",
    manage_teachers: "강사 관리",
    manage_posts: "게시물 관리",
    manage_seminars: "설명회 관리",
    manage_consultations: "상담 관리",
    view_analytics: "통계 조회",
    manage_settings: "설정 관리",
    manage_members: "멤버 관리",
    edit_profile: "학원 프로필 편집",
  };

  const approveMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('academy_members')
        .update({ status: 'approved' })
        .eq('id', memberId);

      if (error) throw error;

      toast.success("관리자가 승인되었습니다");
      fetchMembers();
    } catch (error) {
      logError('Approve Member', error);
      toast.error("승인에 실패했습니다");
    }
  };

  const rejectMember = async (memberId: string) => {
    if (!confirm("정말로 이 참여 요청을 거절하시겠습니까?")) return;

    try {
      const { error } = await supabase
        .from('academy_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast.success("참여 요청이 거절되었습니다");
      fetchMembers();
    } catch (error) {
      logError('Reject Member', error);
      toast.error("거절에 실패했습니다");
    }
  };

  if (!isAcademyOwner) {
    return null;
  }

  return (
    <Card className="shadow-card border-border">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          관리자 관리
        </CardTitle>
        <CardDescription>
          학원 관리자를 초대하고 권한을 설정하세요
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Join Code Section */}
        <div className="p-4 bg-muted/50 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">참여 코드</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateCode}
              disabled={generating}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
              {joinCode ? '코드 재생성' : '코드 생성'}
            </Button>
          </div>
          {joinCode ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 font-mono text-2xl tracking-widest text-center py-3 bg-background rounded-lg border">
                {joinCode}
              </div>
              <Button variant="outline" size="icon" onClick={copyCode}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-3">
              참여 코드를 생성하면 다른 관리자가 이 학원에 참여할 수 있습니다
            </p>
          )}
        </div>

        {/* Pending Members List */}
        {members.filter(m => m.status === 'pending').length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              승인 대기 중
            </h4>
            <div className="space-y-2">
              {members.filter(m => m.status === 'pending').map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {member.profile?.user_name || '이름 없음'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {member.profile?.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                      대기중
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => approveMember(member.id)}
                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => rejectMember(member.id)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Approved Members List */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">현재 관리자</h4>
          {loading ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              로딩 중...
            </div>
          ) : members.filter(m => m.status === 'approved').length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              등록된 관리자가 없습니다
            </div>
          ) : (
            <div className="space-y-2">
              {members.filter(m => m.status === 'approved').map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      {member.role === 'owner' ? (
                        <Crown className="w-5 h-5 text-primary" />
                      ) : (
                        <Shield className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {member.profile?.user_name || '이름 없음'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {member.profile?.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={member.role === 'owner' ? 'default' : 'secondary'}>
                      {member.role === 'owner' ? '원장' : '관리자'}
                    </Badge>
                    {member.role !== 'owner' && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openPermissionDialog(member)}
                        >
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeMember(member.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      {/* Permission Edit Dialog */}
      <Dialog open={!!editingMember} onOpenChange={() => setEditingMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>권한 설정</DialogTitle>
            <DialogDescription>
              {editingMember?.profile?.user_name || '관리자'}의 권한을 설정합니다
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {editedPermissions && Object.entries(permissionLabels).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between">
                <Label htmlFor={key} className="text-sm">{label}</Label>
                <Switch
                  id={key}
                  checked={editedPermissions[key as keyof AcademyMember['permissions']]}
                  onCheckedChange={(checked) => 
                    handlePermissionChange(key as keyof AcademyMember['permissions'], checked)
                  }
                />
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMember(null)}>
              취소
            </Button>
            <Button onClick={savePermissions} disabled={saving}>
              {saving ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default AcademyMemberManagement;
