import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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

  const fetchVerification = async () => {
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
        console.error('Error fetching verification:', error);
      } else {
        setVerification(data as BusinessVerification | null);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerification();
  }, []);

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
        console.error('Error submitting verification:', error);
        return { success: false, error: error.message };
      }

      await fetchVerification();
      return { success: true };
    } catch (error: any) {
      console.error('Error:', error);
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
