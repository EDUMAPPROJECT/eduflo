import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminHeader from "@/components/AdminHeader";
import AdminBottomNavigation from "@/components/AdminBottomNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ArrowLeft,
  Building2,
  FileText,
  Eye,
  ExternalLink
} from "lucide-react";

interface BusinessVerification {
  id: string;
  user_id: string;
  document_url: string;
  business_name: string | null;
  business_number: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
}

const VerificationReviewPage = () => {
  const navigate = useNavigate();
  const [verifications, setVerifications] = useState<BusinessVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVerification, setSelectedVerification] = useState<BusinessVerification | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");

  const fetchVerifications = async () => {
    try {
      const { data, error } = await supabase
        .from('business_verifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching verifications:', error);
        toast.error("인증 목록을 불러오는데 실패했습니다");
      } else {
        setVerifications((data || []) as BusinessVerification[]);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerifications();
  }, []);

  const handleApprove = async (verification: BusinessVerification) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('business_verifications')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          rejection_reason: null
        })
        .eq('id', verification.id);

      if (error) {
        console.error('Error approving:', error);
        toast.error("승인 처리에 실패했습니다");
      } else {
        toast.success("인증이 승인되었습니다");
        fetchVerifications();
        // TODO: Send email notification
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error("오류가 발생했습니다");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedVerification) return;
    if (!rejectionReason.trim()) {
      toast.error("거절 사유를 입력해주세요");
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('business_verifications')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectionReason.trim()
        })
        .eq('id', selectedVerification.id);

      if (error) {
        console.error('Error rejecting:', error);
        toast.error("거절 처리에 실패했습니다");
      } else {
        toast.success("인증이 거절되었습니다");
        setRejectDialogOpen(false);
        setSelectedVerification(null);
        setRejectionReason("");
        fetchVerifications();
        // TODO: Send email notification
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error("오류가 발생했습니다");
    } finally {
      setProcessing(false);
    }
  };

  const openRejectDialog = (verification: BusinessVerification) => {
    setSelectedVerification(verification);
    setRejectionReason("");
    setRejectDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-warning/10 text-warning">대기중</Badge>;
      case 'approved':
        return <Badge className="bg-primary text-primary-foreground">승인됨</Badge>;
      case 'rejected':
        return <Badge variant="destructive">거절됨</Badge>;
      default:
        return null;
    }
  };

  const filteredVerifications = verifications.filter(v => {
    if (activeTab === 'pending') return v.status === 'pending';
    if (activeTab === 'approved') return v.status === 'approved';
    if (activeTab === 'rejected') return v.status === 'rejected';
    return true;
  });

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
          <h1 className="font-semibold text-foreground">사업자 인증 심사</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="shadow-card">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-warning">
                {verifications.filter(v => v.status === 'pending').length}
              </div>
              <div className="text-xs text-muted-foreground">대기중</div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">
                {verifications.filter(v => v.status === 'approved').length}
              </div>
              <div className="text-xs text-muted-foreground">승인됨</div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-destructive">
                {verifications.filter(v => v.status === 'rejected').length}
              </div>
              <div className="text-xs text-muted-foreground">거절됨</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending" className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              대기중
            </TabsTrigger>
            <TabsTrigger value="approved" className="flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              승인됨
            </TabsTrigger>
            <TabsTrigger value="rejected" className="flex items-center gap-1">
              <XCircle className="w-4 h-4" />
              거절됨
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4 space-y-4">
            {filteredVerifications.length === 0 ? (
              <Card className="shadow-card">
                <CardContent className="p-8 text-center">
                  <div className="text-muted-foreground">
                    {activeTab === 'pending' && "대기 중인 인증 요청이 없습니다"}
                    {activeTab === 'approved' && "승인된 인증 요청이 없습니다"}
                    {activeTab === 'rejected' && "거절된 인증 요청이 없습니다"}
                  </div>
                </CardContent>
              </Card>
            ) : (
              filteredVerifications.map((verification) => (
                <Card key={verification.id} className="shadow-card">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">
                            {verification.business_name || '상호명 없음'}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {verification.business_number || '번호 없음'}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(verification.status)}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      신청일: {new Date(verification.created_at).toLocaleDateString('ko-KR')}
                      {verification.reviewed_at && (
                        <> · 심사일: {new Date(verification.reviewed_at).toLocaleDateString('ko-KR')}</>
                      )}
                    </div>

                    {verification.rejection_reason && (
                      <div className="bg-destructive/10 rounded-lg p-3">
                        <p className="text-sm text-destructive">
                          거절 사유: {verification.rejection_reason}
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => window.open(verification.document_url, '_blank')}
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        서류 보기
                      </Button>
                      
                      {verification.status === 'pending' && (
                        <>
                          <Button
                            variant="default"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleApprove(verification)}
                            disabled={processing}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            승인
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="flex-1"
                            onClick={() => openRejectDialog(verification)}
                            disabled={processing}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            거절
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>인증 거절</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                거절 사유를 입력해주세요. 신청자에게 이 내용이 전달됩니다.
              </p>
              <Textarea
                placeholder="예: 사업자등록증이 불선명하여 확인이 어렵습니다. 다시 업로드해주세요."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              취소
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={processing || !rejectionReason.trim()}
            >
              {processing ? "처리 중..." : "거절하기"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AdminBottomNavigation />
    </div>
  );
};

export default VerificationReviewPage;
