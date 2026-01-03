import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ParentProfile {
  id: string;
  user_name: string | null;
  phone: string | null;
  email: string | null;
}

export const useParentProfile = (parentId: string | undefined) => {
  const [profile, setProfile] = useState<ParentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!parentId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, user_name, phone, email')
          .eq('id', parentId)
          .maybeSingle();

        if (error) {
          console.error('Error fetching parent profile:', error);
        } else {
          setProfile(data);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [parentId]);

  return { profile, loading };
};
