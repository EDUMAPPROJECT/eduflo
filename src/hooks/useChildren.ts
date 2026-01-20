import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Child {
  id: string;
  parent_id: string;
  name: string;
  grade: string | null;
  created_at: string;
  updated_at: string;
}

export const useChildren = () => {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchChildren = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from("children")
      .select("*")
      .eq("parent_id", uid)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching children:", error);
    } else {
      setChildren(data || []);
      // Set first child as selected if none is selected
      if (data && data.length > 0 && !selectedChildId) {
        // Try to get saved selection from localStorage
        const savedChildId = localStorage.getItem("selectedChildId");
        if (savedChildId && data.some(c => c.id === savedChildId)) {
          setSelectedChildId(savedChildId);
        } else {
          setSelectedChildId(data[0].id);
          localStorage.setItem("selectedChildId", data[0].id);
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
  };
};