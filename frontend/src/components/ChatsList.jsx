import { useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import UsersLoadingSkeleton from "./UsersLoadingSkeleton";
import NoChatsFound from "./NoChatsFound";
import { UsersIcon, CheckCheckIcon, CheckIcon } from "lucide-react";

function ChatsList() {
  const { getConversations, conversations, isConversationsLoading, setSelectedUser, selectedUser, typingUsers } = useChatStore();
  const { authUser, onlineUsers } = useAuthStore();

  useEffect(() => {
    getConversations();
  }, [getConversations]);

  if (isConversationsLoading) return <UsersLoadingSkeleton />;
  if (conversations.length === 0) return <NoChatsFound />;

  return (
    <>
      {conversations.map((conversation) => {
        const isGroup = conversation.type === "group";
        
        let displayPic = "/avatar.png";
        let displayName = "Unknown";
        let isOnline = false;
        let isTyping = false;
        let chatTarget = null; // What we set as selectedUser when clicked

        if (isGroup) {
          displayPic = conversation.groupInfo?.avatar || "/group-avatar.png";
          displayName = conversation.groupInfo?.name || "Group";
          // Group typing logic could be added here
          
          chatTarget = {
            _id: conversation._id,
            fullName: displayName,
            profilePic: displayPic,
            isGroup: true,
          };
        } else {
          // Direct chat - find the other participant
          const otherParticipant = conversation.participants.find(
            (p) => p.userId?._id !== authUser._id
          );
          
          if (otherParticipant?.userId) {
            displayPic = otherParticipant.userId.profilePic || "/avatar.png";
            displayName = otherParticipant.userId.fullName || "User";
            isOnline = onlineUsers.includes(otherParticipant.userId._id);
            isTyping = typingUsers[otherParticipant.userId._id];
            
            chatTarget = {
              _id: otherParticipant.userId._id,
              fullName: displayName,
              profilePic: displayPic,
              lastSeen: otherParticipant.userId.lastSeen,
              isGroup: false,
            };
          }
        }

        const lastMessage = conversation.lastMessage;
        const isSelected = selectedUser?._id === chatTarget?._id;
        
        // Determine read status of last message
        const isLastMessageMine = lastMessage && (lastMessage.senderId === authUser._id || lastMessage.senderId?._id === authUser._id);
        const isRead = lastMessage?.readBy?.length > 0;

        return (
          <div
            key={conversation._id}
            className={`p-3 rounded-xl cursor-pointer transition-all ${
              isSelected 
                ? "bg-cyan-500/20 border border-cyan-500/30 shadow-lg shadow-cyan-900/20" 
                : "hover:bg-slate-700/50 border border-transparent"
            }`}
            onClick={() => chatTarget && setSelectedUser(chatTarget)}
          >
            <div className="flex items-center gap-3">
              <div className={`avatar ${isOnline ? "online" : ""}`}>
                <div className={`w-12 h-12 rounded-full overflow-hidden ${isGroup ? "bg-slate-700 flex items-center justify-center" : ""}`}>
                  {isGroup && !conversation.groupInfo?.avatar ? (
                    <UsersIcon className="w-6 h-6 text-slate-400" />
                  ) : (
                    <img src={displayPic} alt={displayName} className="w-full h-full object-cover" />
                  )}
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <h4 className={`font-medium truncate ${isSelected ? "text-cyan-400" : "text-slate-200"}`}>
                    {displayName}
                  </h4>
                  {lastMessage && (
                    <span className="text-[10px] text-slate-500 flex-shrink-0 ml-2">
                      {new Date(lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-1">
                  {isTyping ? (
                    <p className="text-cyan-400 text-xs italic">typing...</p>
                  ) : lastMessage ? (
                    <div className="flex items-center gap-1 overflow-hidden">
                      {isLastMessageMine && (
                        isRead ? (
                          <CheckCheckIcon className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                        ) : (
                          <CheckCheckIcon className="w-3 h-3 text-slate-500 flex-shrink-0" />
                        )
                      )}
                      <p className={`text-xs truncate ${!isRead && !isLastMessageMine ? "text-slate-200 font-semibold" : "text-slate-400"}`}>
                        {lastMessage.type === "image" ? "📸 Image" : 
                         lastMessage.type === "file" ? "📎 File" : 
                         lastMessage.type === "voice" ? "🎤 Voice Note" : 
                         lastMessage.text}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">No messages yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

export default ChatsList;
