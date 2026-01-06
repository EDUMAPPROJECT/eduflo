import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logError } from "@/lib/errorLogger";

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

export const useBusinessVerification = () => {
  const [verification, setVerification] = useState<BusinessVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchVerification = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setLoading(false);
        return;
      }

      setUserId(session.user.id);

      const { data, error } = await supabase
        .from('business_verifications')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error) {
        logError('BusinessVerification Fetch', error);
      } else {
        setVerification(data as BusinessVerification | null);
      }
    } catch (error) {
      logError('BusinessVerification Fetch', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchVerification();
  }, [fetchVerification]);

  // Real-time subscription for status changes
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`verification-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'business_verifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newVerification = payload.new as BusinessVerification;
          const oldStatus = verification?.status;
          const newStatus = newVerification.status;
          
          // Show toast notification when status changes
          if (oldStatus !== newStatus) {
            if (newStatus === 'approved') {
              toast.success("🎉 사업자 인증이 승인되었습니다!", {
                description: "이제 학원 프로필을 등록할 수 있습니다.",
                duration: 10000,
              });
            } else if (newStatus === 'rejected') {
              toast.error("사업자 인증이 거절되었습니다", {
                description: newVerification.rejection_reason || "자세한 내용은 인증 페이지를 확인해주세요.",
                duration: 10000,
              });
            }
          }
          
          setVerification(newVerification);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, verification?.status]);

  const submitVerification = async (
    documentUrl: string,
    businessName: string,
    businessNumber: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!userId) return { success: false, error: '로그인이 필요합니다' };

    try {
      const { error } = await supabase
        .from('business_verifications')
        .insert({
          user_id: userId,
          document_url: documentUrl,
          business_name: businessName,
          business_number: businessNumber,
        });

      if (error) {
        logError('BusinessVerification Submit', error);
        return { success: false, error: error.message };
      }

      await fetchVerification();
      return { success: true };
    } catch (error: any) {
      logError('BusinessVerification Submit', error);
      return { success: false, error: error.message };
    }
  };

  const isVerified = verification?.status === 'approved';
  const isPending = verification?.status === 'pending';
  const isRejected = verification?.status === 'rejected';

  return {
    verification,
    loading,
    isVerified,
    isPending,
    isRejected,
    submitVerification,
    refetch: fetchVerification,
  };
};
