import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/errorLogger";

export interface AcademyStaffItem {
  user_id: string;
  name: string;
  roleLabel: string;
  description: string;
}

/**
 * 학원에 소속된 채팅 상담 가능 담당자(원장, 부원장, 강사 등) 목록을 조회합니다.
 * 학부모/학생이 채팅 상담 시 상대를 선택할 때 사용합니다.
 * RLS로 academy_members는 학원 멤버만 읽을 수 있으므로, SECURITY DEFINER RPC로 조회합니다.
 */
export function useAcademyStaffForChat(academyId: string | undefined) {
  const [staff, setStaff] = useState<AcademyStaffItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStaff = useCallback(async () => {
    if (!academyId) {
      setStaff([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_academy_staff_for_chat", {
        _academy_id: academyId,
      });

      if (error) {
        logError("AcademyStaffForChat", error);
        setStaff([]);
        setLoading(false);
        return;
      }

      const roleOrder: Record<string, number> = {
        원장: 0,
        부원장: 1,
        강사: 2,
        관리자: 3,
      };

      const items: AcademyStaffItem[] = (data ?? [])
        .map((row: { user_id: string; name: string; role_label: string; description: string }) => ({
          user_id: row.user_id,
          name: row.name ?? "이름 없음",
          roleLabel: row.role_label ?? "관리자",
          description: row.description ?? "",
        }))
        .sort((a, b) => (roleOrder[a.roleLabel] ?? 99) - (roleOrder[b.roleLabel] ?? 99));

      setStaff(items);
    } catch (e) {
      logError("AcademyStaffForChat", e);
      setStaff([]);
    } finally {
      setLoading(false);
    }
  }, [academyId]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  return { staff, loading, refetch: fetchStaff };
}