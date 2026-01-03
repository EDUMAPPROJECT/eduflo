import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useUnreadMessages = (isAdmin: boolean = false) => {
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    const checkUnread = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setHasUnread(false);
        return;
      }

      const userId = session.user.id;

      if (isAdmin) {
        // Admin: Check unread messages in chat rooms for academies they own
        const { data: academies } = await supabase
          .from('academies')
          .select('id')
          .eq('owner_id', userId);

        if (!academies || academies.length === 0) {
          setHasUnread(false);
          return;
        }

        const academyIds = academies.map(a => a.id);

        const { data: chatRooms } = await supabase
          .from('chat_rooms')
          .select('id')
          .in('academy_id', academyIds);

        if (!chatRooms || chatRooms.length === 0) {
          setHasUnread(false);
          return;
        }

        const chatRoomIds = chatRooms.map(r => r.id);

        const { count } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .in('chat_room_id', chatRoomIds)
          .neq('sender_id', userId)
          .eq('is_read', false);

        setHasUnread((count || 0) > 0);
      } else {
        // Parent: Check unread messages in their chat rooms
        const { data: chatRooms } = await supabase
          .from('chat_rooms')
          .select('id')
          .eq('parent_id', userId);

        if (!chatRooms || chatRooms.length === 0) {
          setHasUnread(false);
          return;
        }

        const chatRoomIds = chatRooms.map(r => r.id);

        const { count } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .in('chat_room_id', chatRoomIds)
          .neq('sender_id', userId)
          .eq('is_read', false);

        setHasUnread((count || 0) > 0);
      }
    };

    checkUnread();

    // Subscribe to new messages
    const channel = supabase
      .channel('unread-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          checkUnread();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  return hasUnread;
};
