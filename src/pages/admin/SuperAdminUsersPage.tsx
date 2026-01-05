import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import Logo from "@/components/Logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Users, 
  Search,
  Loader2,
  Shield,
  UserCheck,
  UserX,
  Trash2,
  Eye,
  X,
  Phone,
  Mail,
  Calendar
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface UserWithRole {
  id: string;
  user_id: string;
  role: 'parent' | 'admin';
  is_super_admin: boolean;
  profile: {
    user_name: string | null;
    email: string | null;
    phone: string | null;
    learning_style: string | null;
    created_at: string;
    updated_at: string;
  } | null;
}

const SuperAdminUsersPage = () => {
  const navigate = useNavigate();
  const { isSuperAdmin, loading: authLoading } = useSuperAdmin();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && isSuperAdmin) {
      fetchUsers();
    }
  }, [authLoading, isSuperAdmin]);

  const fetchUsers = async () => {
    try {
      // Fetch user_roles with profile data
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Fetch all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_name, email, phone, learning_style, created_at, updated_at');

      if (profilesError) throw profilesError;

      // Combine data
      const combinedUsers = rolesData?.map(role => {
        const profile = profilesData?.find(p => p.id === role.user_id);
        return {
          ...role,
          profile: profile || null
        };
      }) || [];

      setUsers(combinedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error("사용자 목록을 불러오는데 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'parent' | 'admin') => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;
      
      toast.success(`역할이 ${newRole === 'admin' ? '관리자' : '학부모'}로 변경되었습니다`);
      fetchUsers();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error("역할 변경에 실패했습니다");
    }
  };

  const toggleSuperAdmin = async (userId: string, currentStatus: boolean) => {
    if (!confirm(currentStatus 
      ? "슈퍼관리자 권한을 해제하시겠습니까?" 
      : "슈퍼관리자 권한을 부여하시겠습니까?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ is_super_admin: !currentStatus })
        .eq('user_id', userId);

      if (error) throw error;
      
      toast.success(currentStatus 
        ? "슈퍼관리자 권한이 해제되었습니다" 
        : "슈퍼관리자 권한이 부여되었습니다");
      fetchUsers();
    } catch (error) {
      console.error('Error toggling super admin:', error);
      toast.error("권한 변경에 실패했습니다");
    }
  };

  const handleDeleteUser = async (userId: string, userName: string | null) => {
    if (!confirm(`정말 "${userName || '이름 없음'}" 사용자를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    try {
      // Delete from user_roles first (this will cascade delete related data)
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (roleError) throw roleError;

      // Delete from profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (profileError) throw profileError;
      
      toast.success("사용자가 삭제되었습니다");
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error("사용자 삭제에 실패했습니다");
    }
  };

  const handleViewDetail = (user: UserWithRole) => {
    setSelectedUser(user);
    setDetailDialogOpen(true);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.profile?.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.profile?.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = filterRole === "all" || user.role === filterRole;
    
    return matchesSearch && matchesRole;
  });

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
          <span className="font-semibold text-foreground">사용자 관리</span>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="shadow-card">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{users.length}</p>
              <p className="text-xs text-muted-foreground">전체</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">
                {users.filter(u => u.role === 'admin').length}
              </p>
              <p className="text-xs text-muted-foreground">관리자</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-chart-2">
                {users.filter(u => u.role === 'parent').length}
              </p>
              <p className="text-xs text-muted-foreground">학부모</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="이름 또는 이메일로 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-28">
              <SelectValue placeholder="역할" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="admin">관리자</SelectItem>
              <SelectItem value="parent">학부모</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Users List */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              사용자 목록 ({filteredUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredUsers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {searchQuery || filterRole !== "all" 
                  ? "검색 결과가 없습니다" 
                  : "등록된 사용자가 없습니다"}
              </p>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="p-4 border border-border rounded-lg space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 cursor-pointer" onClick={() => handleViewDetail(user)}>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-foreground">
                          {user.profile?.user_name || "이름 없음"}
                        </h4>
                        <Badge variant={user.role === 'admin' ? "default" : "secondary"}>
                          {user.role === 'admin' ? '관리자' : '학부모'}
                        </Badge>
                        {user.is_super_admin && (
                          <Badge className="bg-chart-1 text-white">
                            <Shield className="w-3 h-3 mr-1" />
                            슈퍼
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {user.profile?.email || "이메일 없음"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        가입일: {user.profile?.created_at 
                          ? new Date(user.profile.created_at).toLocaleDateString('ko-KR')
                          : "알 수 없음"}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewDetail(user)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteUser(user.user_id, user.profile?.user_name)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <Select 
                      value={user.role} 
                      onValueChange={(value) => handleRoleChange(user.user_id, value as 'parent' | 'admin')}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="parent">
                          <div className="flex items-center gap-2">
                            <UserCheck className="w-4 h-4" />
                            학부모
                          </div>
                        </SelectItem>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            <UserX className="w-4 h-4" />
                            관리자
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant={user.is_super_admin ? "destructive" : "outline"}
                      size="sm"
                      onClick={() => toggleSuperAdmin(user.user_id, user.is_super_admin || false)}
                    >
                      <Shield className="w-4 h-4 mr-1" />
                      {user.is_super_admin ? "슈퍼 해제" : "슈퍼 부여"}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </main>

      {/* User Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              사용자 상세 정보
            </DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={selectedUser.role === 'admin' ? "default" : "secondary"}>
                  {selectedUser.role === 'admin' ? '관리자' : '학부모'}
                </Badge>
                {selectedUser.is_super_admin && (
                  <Badge className="bg-chart-1 text-white">
                    <Shield className="w-3 h-3 mr-1" />
                    슈퍼관리자
                  </Badge>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                  <Users className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">이름</p>
                    <p className="font-medium">{selectedUser.profile?.user_name || "이름 없음"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">이메일</p>
                    <p className="font-medium">{selectedUser.profile?.email || "이메일 없음"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                  <Phone className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">전화번호</p>
                    <p className="font-medium">{selectedUser.profile?.phone || "미등록"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">가입일</p>
                    <p className="font-medium">
                      {selectedUser.profile?.created_at 
                        ? new Date(selectedUser.profile.created_at).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })
                        : "알 수 없음"}
                    </p>
                  </div>
                </div>

                {selectedUser.profile?.learning_style && (
                  <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                    <div className="w-5 h-5 text-muted-foreground text-center">🎯</div>
                    <div>
                      <p className="text-xs text-muted-foreground">학습 성향</p>
                      <p className="font-medium">{selectedUser.profile.learning_style}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setDetailDialogOpen(false)}
                >
                  닫기
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setDetailDialogOpen(false);
                    handleDeleteUser(selectedUser.user_id, selectedUser.profile?.user_name);
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  삭제
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminUsersPage;
