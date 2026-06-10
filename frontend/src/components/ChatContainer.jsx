import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import ChatHeader from "./ChatHeader";
import NoChatHistoryPlaceholder from "./NoChatHistoryPlaceholder";
import MessageInput from "./MessageInput";
import MessagesLoadingSkeleton from "./MessagesLoadingSkeleton";
import MessageBubble from "./MessageBubble";
import { LoaderIcon } from "lucide-react";
import { Virtuoso } from "react-virtuoso";

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

  // Scroll handling is now managed by Virtuoso
  const loadMore = () => {
    if (pagination?.hasMore && !isMessagesLoading) {
      getMessages(selectedUser._id, pagination.page + 1);
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

      <div className="flex-1 p-4 relative">
        {isMessagesLoading && messages.length > 0 && (
          <div className="flex justify-center py-2 absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-slate-900/80 to-transparent">
            <LoaderIcon className="w-5 h-5 animate-spin text-cyan-500" />
          </div>
        )}

        {messages.length > 0 ? (
          <Virtuoso
            style={{ height: '100%' }}
            data={messages}
            firstItemIndex={Math.max(0, (pagination?.total || messages.length) - messages.length)}
            initialTopMostItemIndex={messages.length - 1}
            startReached={loadMore}
            itemContent={(index, msg) => (
              <div className="max-w-4xl mx-auto px-2">
                <MessageBubble message={msg} onReply={setReplyingTo} />
              </div>
            )}
            followOutput="smooth"
            alignToBottom={true}
          />
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
