import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  conversations: [],
  allContacts: [],
  messages: [],
  selectedConversation: null,
  selectedUser: null,
  isConversationsLoading: false,
  isContactsLoading: false,
  isMessagesLoading: false,
  isSoundEnabled: JSON.parse(localStorage.getItem("isSoundEnabled")) === true,
  typingUsers: {}, // { recipientId: boolean }
  searchQuery: "",
  searchResults: [],
  pagination: null,
  activeTab: "chats", // "chats" or "contacts"

  setActiveTab: (tab) => set({ activeTab: tab }),

  toggleSound: () => {
    localStorage.setItem("isSoundEnabled", !get().isSoundEnabled);
    set({ isSoundEnabled: !get().isSoundEnabled });
  },

  setSelectedUser: (selectedUser) => {
    set({ selectedUser, messages: [], pagination: null });
  },

  // ─── Conversations ───
  getConversations: async () => {
    set({ isConversationsLoading: true });
    try {
      const res = await axiosInstance.get("/conversations");
      set({ conversations: res.data.data.conversations });
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    } finally {
      set({ isConversationsLoading: false });
    }
  },

  getContacts: async () => {
    set({ isContactsLoading: true });
    try {
      const res = await axiosInstance.get("/conversations/contacts");
      set({ allContacts: res.data.data.contacts });
    } catch (error) {
      console.error("Failed to fetch contacts:", error);
    } finally {
      set({ isContactsLoading: false });
    }
  },

  // ─── Messages ───
  getMessages: async (recipientId, page = 1) => {
    if (page === 1) set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${recipientId}?page=${page}&limit=50`);
      const data = res.data.data;

      if (page === 1) {
        set({ messages: data.messages, pagination: data.pagination });
      } else {
        // Prepend older messages for infinite scroll
        set((state) => ({
          messages: [...data.messages, ...state.messages],
          pagination: data.pagination,
        }));
      }
    } catch (error) {
      if (page === 1) set({ messages: [] });
      console.error("Failed to fetch messages:", error);
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    const { authUser } = useAuthStore.getState();
    if (!selectedUser) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      _id: tempId,
      senderId: { _id: authUser._id, fullName: authUser.fullName, profilePic: authUser.profilePic },
      text: messageData.text,
      media: messageData.image ? { url: messageData.image } : undefined,
      type: messageData.image ? "image" : "text",
      createdAt: new Date().toISOString(),
      isOptimistic: true,
    };

    set({ messages: [...messages, optimisticMessage] });

    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      // Replace optimistic message with real one
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === tempId ? res.data.data.message : msg
        ),
      }));
    } catch (error) {
      // Remove optimistic message
      set((state) => ({
        messages: state.messages.filter((msg) => msg._id !== tempId),
      }));
      toast.error(error.response?.data?.error?.message || "Failed to send message");
    }
  },

  editMessage: async (messageId, text) => {
    try {
      const res = await axiosInstance.put(`/messages/${messageId}`, { text });
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId ? { ...msg, text, isEdited: true, editedAt: new Date() } : msg
        ),
      }));
      toast.success("Message edited");
    } catch (error) {
      toast.error(error.response?.data?.error?.message || "Failed to edit message");
    }
  },

  deleteMessage: async (messageId, deleteForEveryone = false) => {
    try {
      await axiosInstance.delete(`/messages/${messageId}`, {
        data: { deleteForEveryone },
      });
      if (deleteForEveryone) {
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg._id === messageId ? { ...msg, deletedAt: new Date(), text: null, media: null } : msg
          ),
        }));
      } else {
        set((state) => ({
          messages: state.messages.filter((msg) => msg._id !== messageId),
        }));
      }
    } catch (error) {
      toast.error("Failed to delete message");
    }
  },

  reactToMessage: async (messageId, emoji) => {
    try {
      const res = await axiosInstance.post(`/messages/${messageId}/react`, { emoji });
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId ? { ...msg, reactions: res.data.data.message.reactions } : msg
        ),
      }));
    } catch (error) {
      console.error("Failed to react:", error);
    }
  },

  togglePinMessage: async (messageId, conversationId) => {
    try {
      await axiosInstance.post(`/messages/${messageId}/pin`, { conversationId });
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId ? { ...msg, isPinned: !msg.isPinned } : msg
        ),
      }));
    } catch (error) {
      toast.error("Failed to pin/unpin message");
    }
  },

  searchMessages: async (query) => {
    if (!query || query.length < 2) {
      set({ searchResults: [] });
      return;
    }
    try {
      const res = await axiosInstance.get(`/messages?q=${encodeURIComponent(query)}`);
      set({ searchResults: res.data.data.messages });
    } catch (error) {
      console.error("Search failed:", error);
    }
  },

  // ─── Real-time subscriptions ───
  subscribeToMessages: () => {
    const { selectedUser, isSoundEnabled } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.on("newMessage", (newMessage) => {
      const senderId = newMessage.senderId?._id || newMessage.senderId;
      if (senderId !== selectedUser._id) return;

      set((state) => ({
        messages: [...state.messages, newMessage],
      }));

      if (isSoundEnabled) {
        const sound = new Audio("/sounds/notification.mp3");
        sound.volume = 0.5;
        sound.play().catch(() => {});
      }
    });

    socket.on("messageEdited", (editedMessage) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === editedMessage._id ? editedMessage : msg
        ),
      }));
    });

    socket.on("messageDeleted", ({ messageId }) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId ? { ...msg, deletedAt: new Date(), text: null, media: null } : msg
        ),
      }));
    });

    socket.on("messageReaction", ({ messageId, reactions }) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId ? { ...msg, reactions } : msg
        ),
      }));
    });

    socket.on("userTyping", ({ userId }) => {
      set((state) => ({
        typingUsers: { ...state.typingUsers, [userId]: true },
      }));
    });

    socket.on("userStoppedTyping", ({ userId }) => {
      set((state) => {
        const newTyping = { ...state.typingUsers };
        delete newTyping[userId];
        return { typingUsers: newTyping };
      });
    });

    socket.on("messagesRead", ({ conversationId, readBy, readAt }) => {
      set((state) => ({
        messages: state.messages.map((msg) => {
          if (msg.readBy?.some((r) => r.userId === readBy)) return msg;
          return {
            ...msg,
            readBy: [...(msg.readBy || []), { userId: readBy, readAt }],
          };
        }),
      }));
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    socket.off("newMessage");
    socket.off("messageEdited");
    socket.off("messageDeleted");
    socket.off("messageReaction");
    socket.off("userTyping");
    socket.off("userStoppedTyping");
    socket.off("messagesRead");
    set({ typingUsers: {} });
  },

  // ─── Typing ───
  emitTyping: (recipientId) => {
    const socket = useAuthStore.getState().socket;
    if (socket) socket.emit("typing", { recipientId });
  },

  emitStopTyping: (recipientId) => {
    const socket = useAuthStore.getState().socket;
    if (socket) socket.emit("stopTyping", { recipientId });
  },

  // ─── Mark as read ───
  markAsRead: (conversationId, senderId) => {
    const socket = useAuthStore.getState().socket;
    if (socket) {
      socket.emit("markAsRead", { conversationId, senderId });
    }
    axiosInstance.post(`/messages/${conversationId}/read`).catch(() => {});
  },
}));
