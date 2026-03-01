import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ChatRoom {
  id: string;
  academy_id: string;
  parent_id: string;
  staff_user_id: string | null;
  academy: {
    id: string;
    name: string;
    profile_image: string | null;
  };
  parent_profile?: {
    user_name: string | null;
    phone: string | null;
  } | null;
  staff_profile?: {
    user_name: string | null;
  } | null;
  staff_role_label?: string | null;
  lastMessage: string | null;
  lastMessageAt: Date | null;
  unreadCount: number;
}

export const useChatRooms = (isAdmin: boolean = false, ownOnly: boolean = false) => {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchChatRooms = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setLoading(false);
          return;
        }

        setUserId(session.user.id);

        // Get chat rooms with academy info (RLS: 원장=전체, 멤버=본인 담당만)
        const { data: rooms, error } = await supabase
          .from('chat_rooms')
          .select(`
            id,
            academy_id,
            parent_id,
            staff_user_id,
            updated_at,
            academies (
              id,
              name,
              profile_image
            )
          `)
          .order('updated_at', { ascending: false });

        if (error) {
          console.error('Error fetching chat rooms:', error);
          setLoading(false);
          return;
        }

        // 채팅 탭: 본인 담당만 표시 (원장 포함)
        let roomsToProcess = rooms ?? [];
        if (isAdmin && ownOnly) {
          roomsToProcess = roomsToProcess.filter(
            (r: { staff_user_id?: string | null }) => r.staff_user_id === session.user.id
          );
        }

        // 학부모/학생용: 각 학원별 담당자 역할 라벨을 미리 조회
        let staffRoleMap: Record<string, Record<string, { name: string; roleLabel: string }>> = {};

        if (!isAdmin) {
          const academyIds = Array.from(
            new Set(
              roomsToProcess
                .filter((r: { staff_user_id?: string | null }) => r.staff_user_id)
                .map((r: { academy_id: string }) => r.academy_id)
            )
          );

          await Promise.all(
            academyIds.map(async (academyId) => {
              const { data } = await supabase.rpc('get_academy_staff_for_chat', {
                _academy_id: academyId,
              });

              const inner: Record<string, { name: string; roleLabel: string }> = {};

              (data ?? []).forEach(
                (row: { user_id: string; name: string | null; role_label: string | null }) => {
                  inner[row.user_id] = {
                    name: row.name ?? '이름 없음',
                    roleLabel: row.role_label ?? '담당자',
                  };
                }
              );

              staffRoleMap[academyId] = inner;
            })
          );
        }

        // Get last message and unread count for each room
        const roomsWithMessages = await Promise.all(
          roomsToProcess.map(async (room: { id: string; academy_id: string; parent_id: string; staff_user_id?: string | null; updated_at?: string; academies?: unknown }) => {
            // Get last message
            const { data: lastMessageData } = await supabase
              .from('messages')
              .select('content, created_at')
              .eq('chat_room_id', room.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            // Get unread count (messages not from current user that are unread)
            const { count: unreadCount } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('chat_room_id', room.id)
              .eq('is_read', false)
              .neq('sender_id', session.user.id);

            const academy = room.academies as unknown as { id: string; name: string; profile_image: string | null };
            const staffUserId = room.staff_user_id ?? null;

            // Fetch parent profile if admin
            let parentProfile = null;
            let staffProfile = null;
            let staffRoleLabel: string | null = null;

            if (isAdmin) {
              const { data: profileData } = await supabase
                .from('profiles')
                .select('user_name, phone')
                .eq('id', room.parent_id)
                .maybeSingle();
              parentProfile = profileData;
              if (staffUserId) {
                const { data: staffData } = await supabase
                  .from('profiles')
                  .select('user_name')
                  .eq('id', staffUserId)
                  .maybeSingle();
                staffProfile = staffData;
              }
            } else if (staffUserId) {
              const byAcademy = staffRoleMap[room.academy_id];
              const staffInfo = byAcademy?.[staffUserId];
              if (staffInfo) {
                staffProfile = { user_name: staffInfo.name };
                staffRoleLabel = staffInfo.roleLabel;
              }
            }

            return {
              id: room.id,
              academy_id: room.academy_id,
              parent_id: room.parent_id,
              staff_user_id: staffUserId,
              academy: {
                id: academy.id,
                name: academy.name,
                profile_image: academy.profile_image,
              },
              parent_profile: parentProfile,
              staff_profile: staffProfile,
              staff_role_label: staffRoleLabel,
              lastMessage: lastMessageData?.content || null,
              lastMessageAt: lastMessageData?.created_at ? new Date(lastMessageData.created_at) : null,
              unreadCount: unreadCount || 0,
            };
          })
        );

        setChatRooms(roomsWithMessages);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChatRooms();
  }, [isAdmin, ownOnly]);

  return { chatRooms, loading, userId };
};

/** 채팅방 선택 화면용 경량 훅 - lastMessage/unreadCount 조회 생략으로 빠른 로딩 */
export const useChatRoomsForSelect = () => {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchChatRooms = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setLoading(false);
          return;
        }
        setUserId(session.user.id);

        const { data: rooms, error } = await supabase
          .from('chat_rooms')
          .select(`
            id,
            academy_id,
            parent_id,
            staff_user_id,
            updated_at,
            academies (
              id,
              name,
              profile_image
            )
          `)
          .order('updated_at', { ascending: false });

        if (error) {
          console.error('Error fetching chat rooms:', error);
          setLoading(false);
          return;
        }

        const roomsToProcess = rooms ?? [];
        let staffRoleMap: Record<string, Record<string, { name: string; roleLabel: string }>> = {};

        const academyIds = Array.from(
          new Set(
            roomsToProcess
              .filter((r: { staff_user_id?: string | null }) => r.staff_user_id)
              .map((r: { academy_id: string }) => r.academy_id)
          )
        );

        await Promise.all(
          academyIds.map(async (academyId) => {
            const { data } = await supabase.rpc('get_academy_staff_for_chat', {
              _academy_id: academyId,
            });
            const inner: Record<string, { name: string; roleLabel: string }> = {};
            (data ?? []).forEach(
              (row: { user_id: string; name: string | null; role_label: string | null }) => {
                inner[row.user_id] = {
                  name: row.name ?? '이름 없음',
                  roleLabel: row.role_label ?? '담당자',
                };
              }
            );
            staffRoleMap[academyId] = inner;
          })
        );

        const roomsWithStaff = roomsToProcess.map(
          (room: { id: string; academy_id: string; parent_id: string; staff_user_id?: string | null; academies?: unknown }) => {
            const academy = room.academies as unknown as { id: string; name: string; profile_image: string | null };
            const staffUserId = room.staff_user_id ?? null;
            let staffProfile = null;
            let staffRoleLabel: string | null = null;
            if (staffUserId) {
              const staffInfo = staffRoleMap[room.academy_id]?.[staffUserId];
              if (staffInfo) {
                staffProfile = { user_name: staffInfo.name };
                staffRoleLabel = staffInfo.roleLabel;
              }
            }
            return {
              id: room.id,
              academy_id: room.academy_id,
              parent_id: room.parent_id,
              staff_user_id: staffUserId,
              academy: { id: academy.id, name: academy.name, profile_image: academy.profile_image },
              parent_profile: null,
              staff_profile: staffProfile,
              staff_role_label: staffRoleLabel,
              lastMessage: null,
              lastMessageAt: null,
              unreadCount: 0,
            };
          }
        );

        setChatRooms(roomsWithStaff);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchChatRooms();
  }, []);

  return { chatRooms, loading, userId };
};

export const useOrCreateChatRoom = () => {
  const [loading, setLoading] = useState(false);

  /**
   * 채팅방 ID를 반환합니다. 이미 있으면 기존 ID, 없으면 새로 생성합니다.
   * @param academyId 학원 ID
   * @param staffUserId 학원 담당자 user_id. 넣으면 해당 담당자와의 1:1 방을 사용합니다. 생략 시 기존처럼 학원 대표 1개 방을 사용합니다.
   * @param requireAccept true면 강사 수락 전까지 대기(pending). 강사에게 요청 메시지가 발송됨.
   */
  const getOrCreateChatRoom = async (
    academyId: string,
    staffUserId?: string | null,
    requireAccept?: boolean
  ): Promise<string | null> => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        return null;
      }

      const parentId = session.user.id;

      let query = supabase
        .from('chat_rooms')
        .select('id')
        .eq('academy_id', academyId)
        .eq('parent_id', parentId);

      if (staffUserId) {
        query = query.eq('staff_user_id', staffUserId);
      } else {
        query = query.is('staff_user_id', null);
      }

      const { data: existingRoom } = await query.maybeSingle();

      if (existingRoom) {
        return existingRoom.id;
      }

      const status = requireAccept ? 'pending' : 'active';
      const insertPayload: { academy_id: string; parent_id: string; staff_user_id?: string | null; status?: string } = {
        academy_id: academyId,
        parent_id: parentId,
        status,
      };
      if (staffUserId) {
        insertPayload.staff_user_id = staffUserId;
      } else {
        insertPayload.staff_user_id = null;
      }

      const { data: newRoom, error } = await supabase
        .from('chat_rooms')
        .insert(insertPayload)
        .select('id')
        .single();

      if (error) {
        console.error('Error creating chat room:', error);
        return null;
      }

      if (requireAccept && newRoom?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_name')
          .eq('id', parentId)
          .maybeSingle();
        const parentName =
          (profile?.user_name && profile.user_name.trim()) ||
          (session.user.user_metadata?.user_name as string)?.trim() ||
          session.user.email ||
          '학부모';
        const content = `${parentName}님이 선생님에게 채팅 상담 요청을 보냈습니다. 수락을 통해 채팅 진행 여부를 결정해주세요.`;
        await supabase.from('messages').insert({
          chat_room_id: newRoom.id,
          sender_id: parentId,
          content,
          message_type: 'chat_request',
        });
      }

      return newRoom.id;
    } catch (error) {
      console.error('Error:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { getOrCreateChatRoom, loading };
};
