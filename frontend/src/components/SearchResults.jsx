import { useChatStore } from "../store/useChatStore";
import { SearchIcon, MessageSquareIcon } from "lucide-react";

function SearchResults() {
  const { searchResults, setSelectedUser } = useChatStore();

  if (searchResults.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-3 px-4 text-center">
        <SearchIcon className="w-10 h-10 text-slate-600" />
        <p>No messages found matching your search.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-3 px-1">
        Search Results
      </p>
      {searchResults.map((msg) => {
        const isGroup = msg.conversationId?.type === "group";
        const displayName = isGroup ? msg.conversationId.groupInfo?.name : msg.senderId.fullName;
        
        return (
          <div
            key={msg._id}
            className="p-3 rounded-xl cursor-pointer transition-all hover:bg-slate-700/50 border border-transparent hover:border-slate-600"
            onClick={() => {
              // Set the selected user to jump to the conversation
              const targetUser = isGroup 
                ? { _id: msg.conversationId._id, fullName: displayName, isGroup: true, profilePic: msg.conversationId.groupInfo?.avatar }
                : msg.senderId;
              setSelectedUser(targetUser);
            }}
          >
            <div className="flex justify-between items-baseline mb-1">
              <h4 className="font-medium text-slate-200 text-sm truncate">
                {displayName}
              </h4>
              <span className="text-[10px] text-slate-500 flex-shrink-0 ml-2">
                {new Date(msg.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <MessageSquareIcon className="w-3 h-3 text-cyan-500 mt-1 flex-shrink-0" />
              <p className="text-xs text-slate-400 line-clamp-2">
                {msg.text}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default SearchResults;
