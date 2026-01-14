import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/errorLogger";

export interface AcademyMember {
  id: string;
  academy_id: string;
  user_id: string;
  role: 'owner' | 'admin';
  status: 'pending' | 'approved';
  permissions: {
    manage_classes: boolean;
    manage_teachers: boolean;
    manage_posts: boolean;
    manage_seminars: boolean;
    manage_consultations: boolean;
    view_analytics: boolean;
    manage_settings: boolean;
    manage_members: boolean;
    edit_profile: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface AcademyWithMembership {
  id: string;
  name: string;
  subject: string;
  profile_image: string | null;
  join_code: string | null;
  membership: AcademyMember;
}

export const useAcademyMembership = () => {
  const [memberships, setMemberships] = useState<AcademyWithMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchMemberships = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setLoading(false);
        return;
      }

      setUserId(session.user.id);

      // Fetch academy memberships with academy info
      const { data: memberData, error: memberError } = await supabase
        .from('academy_members')
        .select('*')
        .eq('user_id', session.user.id);

      if (memberError) {
        logError('AcademyMembership Fetch', memberError);
        setLoading(false);
        return;
      }

      if (!memberData || memberData.length === 0) {
        setMemberships([]);
        setLoading(false);
        return;
      }

      // Fetch academy details for each membership
      const academyIds = memberData.map(m => m.academy_id);
      const { data: academyData, error: academyError } = await supabase
        .from('academies')
        .select('id, name, subject, profile_image, join_code')
        .in('id', academyIds);

      if (academyError) {
        logError('Academy Fetch', academyError);
        setLoading(false);
        return;
      }

      const combined = memberData.map(member => {
        const academy = academyData?.find(a => a.id === member.academy_id);
        return {
          id: academy?.id || '',
          name: academy?.name || '',
          subject: academy?.subject || '',
          profile_image: academy?.profile_image || null,
          join_code: academy?.join_code || null,
          membership: {
            ...member,
            permissions: member.permissions as AcademyMember['permissions'],
          } as AcademyMember,
        };
      }).filter(m => m.id);

      setMemberships(combined);
    } catch (error) {
      logError('AcademyMembership Fetch', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMemberships();
  }, [fetchMemberships]);

  // Join academy by code
  const joinByCode = async (code: string): Promise<{ success: boolean; error?: string; academyName?: string; pending?: boolean }> => {
    if (!userId) return { success: false, error: '로그인이 필요합니다' };

    try {
      // Find academy by join code
      const { data: academy, error: findError } = await supabase
        .from('academies')
        .select('id, name')
        .eq('join_code', code.toUpperCase())
        .maybeSingle();

      if (findError) {
        logError('Academy Find', findError);
        return { success: false, error: '학원을 찾을 수 없습니다' };
      }

      if (!academy) {
        return { success: false, error: '유효하지 않은 참여 코드입니다' };
      }

      // Check if already a member
      const { data: existing } = await supabase
        .from('academy_members')
        .select('id')
        .eq('academy_id', academy.id)
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        return { success: false, error: '이미 해당 학원의 멤버입니다' };
      }

      // Add as pending admin member (requires owner approval)
      const { error: insertError } = await supabase
        .from('academy_members')
        .insert({
          academy_id: academy.id,
          user_id: userId,
          role: 'admin',
          status: 'pending',
          permissions: {
            manage_classes: true,
            manage_teachers: true,
            manage_posts: true,
            manage_seminars: true,
            manage_consultations: true,
            view_analytics: true,
            manage_settings: false,
            manage_members: false,
            edit_profile: false,
          },
        });

      if (insertError) {
        logError('Academy Join', insertError);
        return { success: false, error: '학원 참여에 실패했습니다' };
      }

      await fetchMemberships();
      return { success: true, academyName: academy.name, pending: true };
    } catch (error: any) {
      logError('Academy Join', error);
      return { success: false, error: error.message };
    }
  };

  // Generate join code for owned academy
  const generateJoinCode = async (academyId: string): Promise<{ success: boolean; code?: string; error?: string }> => {
    if (!userId) return { success: false, error: '로그인이 필요합니다' };

    try {
      // Call the database function to generate code
      const { data: newCode, error: genError } = await supabase.rpc('generate_academy_join_code');

      if (genError) {
        logError('Generate Join Code', genError);
        return { success: false, error: '코드 생성에 실패했습니다' };
      }

      // Update academy with the new code
      const { error: updateError } = await supabase
        .from('academies')
        .update({ 
          join_code: newCode, 
          join_code_created_at: new Date().toISOString() 
        })
        .eq('id', academyId);

      if (updateError) {
        logError('Update Join Code', updateError);
        return { success: false, error: '코드 저장에 실패했습니다' };
      }

      await fetchMemberships();
      return { success: true, code: newCode };
    } catch (error: any) {
      logError('Generate Join Code', error);
      return { success: false, error: error.message };
    }
  };

  // Check if user has specific permission
  const hasPermission = (academyId: string, permission: keyof AcademyMember['permissions']): boolean => {
    const membership = memberships.find(m => m.id === academyId);
    if (!membership) return false;
    if (membership.membership.role === 'owner') return true;
    return membership.membership.permissions[permission] === true;
  };

  // Check if user is owner
  const isOwner = (academyId: string): boolean => {
    const membership = memberships.find(m => m.id === academyId);
    return membership?.membership.role === 'owner';
  };

  // Get primary academy (first one, usually the owned one)
  const primaryAcademy = memberships.length > 0 ? memberships[0] : null;

  return {
    memberships,
    loading,
    primaryAcademy,
    hasPermission,
    isOwner,
    joinByCode,
    generateJoinCode,
    refetch: fetchMemberships,
  };
};
