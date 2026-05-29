import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import ChatHeader from "./ChatHeader";
import NoChatHistoryPlaceholder from "./NoChatHistoryPlaceholder";
import MessageInput from "./MessageInput";
import MessagesLoadingSkeleton from "./MessagesLoadingSkeleton";
import MessageBubble from "./MessageBubble";
import { LoaderIcon } from "lucide-react";

function ChatContainer() {
  const {
    selectedUser,
    getMessages,
    messages,
    isMessagesLoading,
    subscribeToMessages,
    unsubscribeFromMessages,
    markAsRead,
    pagination,
  } = useChatStore();

  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const containerRef = useRef(null);
  const [replyingTo, setReplyingTo] = useState(null);

  useEffect(() => {
    if (selectedUser) {
      getMessages(selectedUser._id, 1);
      subscribeToMessages();

      // Ensure we mark conversation as read
      // Assuming selectedUser._id is the conversation ID or recipient ID
      markAsRead(selectedUser._id, selectedUser._id);
    }

    return () => unsubscribeFromMessages();
  }, [selectedUser, getMessages, subscribeToMessages, unsubscribeFromMessages, markAsRead]);

  useEffect(() => {
    // Scroll to bottom on initial load or new messages if we are on the first page
    if (messageEndRef.current && (!pagination || pagination.page === 1)) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, pagination]);

  const handleScroll = () => {
    if (containerRef.current) {
      const { scrollTop } = containerRef.current;
      // Fetch more messages when scrolled to top
      if (scrollTop === 0 && pagination?.hasMore && !isMessagesLoading) {
        getMessages(selectedUser._id, pagination.page + 1);
      }
    }
  };

  if (isMessagesLoading && messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col">
        <ChatHeader />
        <MessagesLoadingSkeleton />
        <MessageInput replyingTo={replyingTo} onCancelReply={() => setReplyingTo(null)} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-900/30">
      <ChatHeader />

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-2 relative"
      >
        {isMessagesLoading && messages.length > 0 && (
          <div className="flex justify-center py-2 absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-slate-900/80 to-transparent">
            <LoaderIcon className="w-5 h-5 animate-spin text-cyan-500" />
          </div>
        )}

        {messages.length > 0 ? (
          <div className="max-w-4xl mx-auto flex flex-col justify-end min-h-full pb-4">
            {messages.map((msg) => (
              <MessageBubble
                key={msg._id || msg.createdAt}
                message={msg}
                onReply={setReplyingTo}
              />
            ))}
            <div ref={messageEndRef} className="h-1" />
          </div>
        ) : (
          <NoChatHistoryPlaceholder name={selectedUser?.fullName} />
        )}
      </div>

      <MessageInput
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
      />
    </div>
  );
}

export default ChatContainer;
