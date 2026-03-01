import { useState, useEffect, useCallback } from "react";

export interface ChatFolder {
  id: string;
  name: string;
  chatRoomIds: string[];
  createdAt: string;
}

const STORAGE_KEY_PREFIX = "chat_folders_";

const loadFolders = (userId: string): ChatFolder[] => {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatFolder[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveFolders = (userId: string, folders: ChatFolder[]) => {
  localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(folders));
};

export const useChatFolders = (userId: string | null) => {
  const [folders, setFolders] = useState<ChatFolder[]>([]);

  useEffect(() => {
    if (!userId) {
      setFolders([]);
      return;
    }
    setFolders(loadFolders(userId));
  }, [userId]);

  const addFolder = useCallback(
    (name: string, chatRoomIds: string[] = []): ChatFolder | null => {
      if (!userId || !name.trim()) return null;
      const trimmed = name.trim();
      const newFolder: ChatFolder = {
        id: crypto.randomUUID(),
        name: trimmed,
        chatRoomIds: chatRoomIds ?? [],
        createdAt: new Date().toISOString(),
      };
      const next = [...loadFolders(userId), newFolder].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      saveFolders(userId, next);
      setFolders(next);
      return newFolder;
    },
    [userId]
  );

  const removeFolder = useCallback(
    (folderId: string) => {
      if (!userId) return;
      const next = loadFolders(userId).filter((f) => f.id !== folderId);
      saveFolders(userId, next);
      setFolders(next);
    },
    [userId]
  );

  const addChatRoomToFolder = useCallback(
    (folderId: string, chatRoomId: string) => {
      if (!userId) return;
      const next = loadFolders(userId).map((f) =>
        f.id === folderId && !f.chatRoomIds.includes(chatRoomId)
          ? { ...f, chatRoomIds: [...f.chatRoomIds, chatRoomId] }
          : f
      );
      saveFolders(userId, next);
      setFolders(next);
    },
    [userId]
  );

  const removeChatRoomFromFolder = useCallback(
    (folderId: string, chatRoomId: string) => {
      if (!userId) return;
      const next = loadFolders(userId).map((f) =>
        f.id === folderId
          ? { ...f, chatRoomIds: f.chatRoomIds.filter((id) => id !== chatRoomId) }
          : f
      );
      saveFolders(userId, next);
      setFolders(next);
    },
    [userId]
  );

  const getFolderById = useCallback(
    (folderId: string): ChatFolder | undefined => {
      return folders.find((f) => f.id === folderId);
    },
    [folders]
  );

  return {
    folders,
    addFolder,
    removeFolder,
    addChatRoomToFolder,
    removeChatRoomFromFolder,
    getFolderById,
  };
};
