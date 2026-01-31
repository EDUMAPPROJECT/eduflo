import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface StudentProfile {
  id: string;
  user_id: string | null;
  name: string;
  school_name: string | null;
  grade: string | null;
  propensity_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  is_virtual: boolean; // user_id가 null이면 가상 프로필
}

export interface ParentChildRelation {
  id: string;
  parent_user_id: string;
  student_profile_id: string;
  is_primary: boolean;
  created_at: string;
  student_profile?: StudentProfile;
}

export const useStudentProfiles = () => {
  const [profiles, setProfiles] = useState<StudentProfile[]>([]);
  const [relations, setRelations] = useState<ParentChildRelation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  const fetchData = useCallback(async (uid: string) => {
    // Fetch user role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .maybeSingle();
    
    const role = roleData?.role || "parent";
    setUserRole(role);

    if (role === "student") {
      // 학생인 경우: 자신의 프로필 조회
      const { data: profileData, error } = await supabase
        .from("student_profiles")
        .select("*")
        .eq("user_id", uid)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching student profile:", error);
      }

      if (profileData) {
        const profile: StudentProfile = {
          ...profileData,
          is_virtual: false,
          propensity_data: (profileData.propensity_data as Record<string, unknown>) || {},
        };
        setProfiles([profile]);
        setSelectedProfileId(profile.id);
      } else {
        setProfiles([]);
      }
    } else {
      // 부모인 경우: 연결된 자녀 프로필들 조회
      const { data: relationsData, error: relationsError } = await supabase
        .from("parent_child_relations")
        .select(`
          *,
          student_profile:student_profiles(*)
        `)
        .eq("parent_user_id", uid)
        .order("created_at", { ascending: true });

      if (relationsError) {
        console.error("Error fetching relations:", relationsError);
      } else {
        const fetchedRelations = (relationsData || []).map((r: any) => ({
          ...r,
          student_profile: r.student_profile ? {
            ...r.student_profile,
            is_virtual: r.student_profile.user_id === null,
            propensity_data: r.student_profile.propensity_data || {},
          } : undefined,
        }));
        setRelations(fetchedRelations);

        const profilesList = fetchedRelations
          .filter((r: ParentChildRelation) => r.student_profile)
          .map((r: ParentChildRelation) => r.student_profile as StudentProfile);
        setProfiles(profilesList);

        // 선택된 프로필 설정
        if (profilesList.length > 0 && !selectedProfileId) {
          const savedId = localStorage.getItem("selectedStudentProfileId");
          if (savedId && profilesList.some((p: StudentProfile) => p.id === savedId)) {
            setSelectedProfileId(savedId);
          } else {
            const primary = fetchedRelations.find((r: ParentChildRelation) => r.is_primary);
            setSelectedProfileId(primary?.student_profile_id || profilesList[0].id);
          }
        }
      }
    }

    setLoading(false);
  }, [selectedProfileId]);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        fetchData(session.user.id);
      } else {
        setLoading(false);
      }
    };

    fetchUser();
  }, [fetchData]);

  const selectProfile = useCallback((profileId: string | null) => {
    setSelectedProfileId(profileId);
    if (profileId) {
      localStorage.setItem("selectedStudentProfileId", profileId);
    } else {
      localStorage.removeItem("selectedStudentProfileId");
    }
  }, []);

  const refetch = useCallback(() => {
    if (userId) {
      fetchData(userId);
    }
  }, [userId, fetchData]);

  const createVirtualProfile = async (name: string, grade?: string, schoolName?: string) => {
    if (!userId) return null;

    // 1. 가상 프로필 생성
    const { data: profile, error: profileError } = await supabase
      .from("student_profiles")
      .insert({
        name,
        grade: grade || null,
        school_name: schoolName || null,
        user_id: null, // 가상 프로필
      })
      .select()
      .single();

    if (profileError) {
      console.error("Error creating profile:", profileError);
      throw profileError;
    }

    // 2. 부모-자녀 관계 생성
    const { error: relationError } = await supabase
      .from("parent_child_relations")
      .insert({
        parent_user_id: userId,
        student_profile_id: profile.id,
        is_primary: profiles.length === 0, // 첫 자녀면 대표로 설정
      });

    if (relationError) {
      console.error("Error creating relation:", relationError);
      throw relationError;
    }

    await refetch();
    return profile;
  };

  const deleteVirtualProfile = async (profileId: string) => {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile || !profile.is_virtual) {
      throw new Error("실제 학생 계정과 연결된 프로필은 삭제할 수 없습니다.");
    }

    // 관계 삭제 (cascade로 프로필도 삭제됨)
    const { error } = await supabase
      .from("student_profiles")
      .delete()
      .eq("id", profileId);

    if (error) {
      console.error("Error deleting profile:", error);
      throw error;
    }

    await refetch();
  };

  const selectedProfile = profiles.find(p => p.id === selectedProfileId) || null;

  return {
    profiles,
    relations,
    loading,
    selectedProfileId,
    selectedProfile,
    selectProfile,
    refetch,
    createVirtualProfile,
    deleteVirtualProfile,
    hasProfiles: profiles.length > 0,
    userId,
    userRole,
  };
};
