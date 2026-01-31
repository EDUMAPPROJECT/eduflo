import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// 기존 Child 인터페이스 유지 (하위 호환성)
export interface Child {
  id: string;
  parent_id: string;
  name: string;
  grade: string | null;
  created_at: string;
  updated_at: string;
  // 새 필드 추가
  school_name?: string | null;
  is_virtual?: boolean;
  user_id?: string | null;
}

export const useChildren = () => {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  const fetchChildren = useCallback(async (uid: string) => {
    // 사용자 역할 확인
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
        // Child 인터페이스로 변환
        const childData: Child = {
          id: profileData.id,
          parent_id: uid, // 학생 자신의 ID
          name: profileData.name,
          grade: profileData.grade,
          school_name: profileData.school_name,
          created_at: profileData.created_at,
          updated_at: profileData.updated_at,
          is_virtual: false,
          user_id: profileData.user_id,
        };
        setChildren([childData]);
        setSelectedChildId(childData.id);
      } else {
        setChildren([]);
      }
    } else {
      // 부모인 경우: parent_child_relations를 통해 자녀 조회
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
        // Child 인터페이스로 변환
        const childrenData: Child[] = (relationsData || [])
          .filter((r: any) => r.student_profile)
          .map((r: any) => ({
            id: r.student_profile.id,
            parent_id: uid,
            name: r.student_profile.name,
            grade: r.student_profile.grade,
            school_name: r.student_profile.school_name,
            created_at: r.student_profile.created_at,
            updated_at: r.student_profile.updated_at,
            is_virtual: r.student_profile.user_id === null,
            user_id: r.student_profile.user_id,
          }));

        setChildren(childrenData);

        // 선택된 자녀 설정
        if (childrenData.length > 0 && !selectedChildId) {
          const savedChildId = localStorage.getItem("selectedChildId");
          if (savedChildId && childrenData.some((c: Child) => c.id === savedChildId)) {
            setSelectedChildId(savedChildId);
          } else {
            setSelectedChildId(childrenData[0].id);
            localStorage.setItem("selectedChildId", childrenData[0].id);
          }
        }
      }
    }

    setLoading(false);
  }, [selectedChildId]);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        fetchChildren(session.user.id);
      } else {
        setLoading(false);
      }
    };

    fetchUser();
  }, [fetchChildren]);

  const selectChild = useCallback((childId: string | null) => {
    setSelectedChildId(childId);
    if (childId) {
      localStorage.setItem("selectedChildId", childId);
    } else {
      localStorage.removeItem("selectedChildId");
    }
  }, []);

  const refetch = useCallback(() => {
    if (userId) {
      fetchChildren(userId);
    }
  }, [userId, fetchChildren]);

  const selectedChild = children.find(c => c.id === selectedChildId) || null;

  return {
    children,
    loading,
    selectedChildId,
    selectedChild,
    selectChild,
    refetch,
    hasChildren: children.length > 0,
    userRole,
  };
};
