import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface EnrolledClassWithDetails {
  id: string;
  class_id: string;
  child_id: string | null;
  created_at: string;
  class?: {
    id: string;
    name: string;
    schedule: string | null;
    target_grade: string | null;
    fee: number | null;
    is_recruiting: boolean | null;
    academy?: {
      id: string;
      name: string;
    };
    teacher?: {
      id: string;
      name: string;
    };
  };
  child?: {
    id: string;
    name: string;
    grade: string | null;
  };
}

// Color palette for different classes in timetable
export const CLASS_COLORS = [
  { bg: "bg-blue-500", text: "text-white", light: "bg-blue-100", border: "border-blue-500" },
  { bg: "bg-green-500", text: "text-white", light: "bg-green-100", border: "border-green-500" },
  { bg: "bg-purple-500", text: "text-white", light: "bg-purple-100", border: "border-purple-500" },
  { bg: "bg-orange-500", text: "text-white", light: "bg-orange-100", border: "border-orange-500" },
  { bg: "bg-pink-500", text: "text-white", light: "bg-pink-100", border: "border-pink-500" },
  { bg: "bg-cyan-500", text: "text-white", light: "bg-cyan-100", border: "border-cyan-500" },
  { bg: "bg-yellow-500", text: "text-black", light: "bg-yellow-100", border: "border-yellow-500" },
  { bg: "bg-red-500", text: "text-white", light: "bg-red-100", border: "border-red-500" },
];

export interface ParsedScheduleEntry {
  day: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}

// Parse schedule string like "월 18:00~20:00, 수 19:00~21:00" or "월/수/금 18:00~22:00"
export function parseScheduleMultiple(schedule: string | null): ParsedScheduleEntry[] {
  if (!schedule) return [];
  
  const entries: ParsedScheduleEntry[] = [];
  
  // Split by comma for new format: "월 18:00~20:00, 수 19:00~21:00"
  const parts = schedule.split(",").map(s => s.trim()).filter(Boolean);
  
  for (const part of parts) {
    // Match pattern: 요일 시간~시간 (single day with time)
    const singleDayMatch = part.match(/^([월화수목금토일])\s*(\d{1,2}):(\d{2})\s*[~\-]\s*(\d{1,2}):(\d{2})$/);
    if (singleDayMatch) {
      entries.push({
        day: singleDayMatch[1],
        startHour: parseInt(singleDayMatch[2], 10),
        startMinute: parseInt(singleDayMatch[3], 10),
        endHour: parseInt(singleDayMatch[4], 10),
        endMinute: parseInt(singleDayMatch[5], 10),
      });
      continue;
    }
    
    // Match pattern: 요일들 시간~시간 (multiple days with same time)
    const multiDayMatch = part.match(/([월화수목금토일\/]+)\s*(\d{1,2}):(\d{2})\s*[~\-]\s*(\d{1,2}):(\d{2})/);
    if (multiDayMatch) {
      const dayString = multiDayMatch[1];
      const startHour = parseInt(multiDayMatch[2], 10);
      const startMinute = parseInt(multiDayMatch[3], 10);
      const endHour = parseInt(multiDayMatch[4], 10);
      const endMinute = parseInt(multiDayMatch[5], 10);
      
      const days = dayString.includes("/") 
        ? dayString.split("/").filter(Boolean)
        : dayString.split("").filter(d => ["월", "화", "수", "목", "금", "토", "일"].includes(d));
      
      for (const day of days) {
        entries.push({ day, startHour, startMinute, endHour, endMinute });
      }
    }
  }
  
  return entries;
}

// Legacy support - returns first entry in old format
export interface ParsedSchedule {
  days: string[];
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}

export function parseSchedule(schedule: string | null): ParsedSchedule | null {
  const entries = parseScheduleMultiple(schedule);
  if (entries.length === 0) return null;
  
  // Group entries by time
  const days = entries.map(e => e.day);
  const first = entries[0];
  
  return {
    days,
    startHour: first.startHour,
    startMinute: first.startMinute,
    endHour: first.endHour,
    endMinute: first.endMinute,
  };
}

export function useClassEnrollments(childId?: string | null) {
  const [enrollments, setEnrollments] = useState<EnrolledClassWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchEnrollments = useCallback(async (uid: string) => {
    let query = supabase
      .from("class_enrollments")
      .select(`
        *,
        class:classes (
          id,
          name,
          schedule,
          target_grade,
          fee,
          is_recruiting,
          academy:academies (
            id,
            name
          ),
          teacher:teachers (
            id,
            name
          )
        ),
        child:children (
          id,
          name,
          grade
        )
      `)
      .eq("user_id", uid)
      .order("created_at", { ascending: true });

    // Filter by child if specified
    if (childId) {
      query = query.eq("child_id", childId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching enrollments:", error);
    } else {
      setEnrollments((data as any) || []);
    }
    setLoading(false);
  }, [childId]);

  useEffect(() => {
    const initFetch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setLoading(false);
        return;
      }
      
      setUserId(session.user.id);
      fetchEnrollments(session.user.id);
    };

    initFetch();
  }, [fetchEnrollments]);

  const checkEnrollment = async (classId: string): Promise<boolean> => {
    if (!userId) return false;
    
    const { data } = await supabase
      .from("class_enrollments")
      .select("id")
      .eq("user_id", userId)
      .eq("class_id", classId)
      .maybeSingle();
    
    return !!data;
  };

  const enrollClass = async (classId: string, enrollChildId?: string | null): Promise<boolean> => {
    if (!userId) return false;

    const { error } = await supabase
      .from("class_enrollments")
      .insert({
        user_id: userId,
        class_id: classId,
        child_id: enrollChildId || null,
      });

    if (error) {
      console.error("Error enrolling class:", error);
      return false;
    }

    // Refresh enrollments
    let query = supabase
      .from("class_enrollments")
      .select(`
        *,
        class:classes (
          id,
          name,
          schedule,
          target_grade,
          fee,
          is_recruiting,
          academy:academies (
            id,
            name
          ),
          teacher:teachers (
            id,
            name
          )
        ),
        child:children (
          id,
          name,
          grade
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (childId) {
      query = query.eq("child_id", childId);
    }

    const { data } = await query;

    setEnrollments((data as any) || []);
    return true;
  };

  const unenrollClass = async (classId: string): Promise<boolean> => {
    if (!userId) return false;

    const { error } = await supabase
      .from("class_enrollments")
      .delete()
      .eq("user_id", userId)
      .eq("class_id", classId);

    if (error) {
      console.error("Error unenrolling class:", error);
      return false;
    }

    setEnrollments(prev => prev.filter(e => e.class_id !== classId));
    return true;
  };

  return {
    enrollments,
    loading,
    userId,
    checkEnrollment,
    enrollClass,
    unenrollClass,
  };
}
