import { useChatStore } from "../store/useChatStore";

import BorderAnimatedContainer from "../components/BorderAnimatedContainer";
import ProfileHeader from "../components/ProfileHeader";
import ActiveTabSwitch from "../components/ActiveTabSwitch";
import ChatsList from "../components/ChatsList";
import ContactList from "../components/ContactList";
import ChatContainer from "../components/ChatContainer";
import NoConversationPlaceholder from "../components/NoConversationPlaceholder";
import SearchResults from "../components/SearchResults";
import { SearchIcon } from "lucide-react";

function ChatPage() {
  const { activeTab, selectedUser, searchQuery } = useChatStore();

  return (
    <div className="relative w-full max-w-6xl h-[800px]">
      <BorderAnimatedContainer>
        {/* LEFT SIDE */}
        <div className="w-80 bg-slate-800/50 backdrop-blur-sm flex flex-col">
          <ProfileHeader />
          
          <div className="px-4 py-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search messages..."
                onChange={(e) => {
                  useChatStore.setState({ searchQuery: e.target.value });
                  useChatStore.getState().searchMessages(e.target.value);
                }}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
              />
              <SearchIcon className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            </div>
          </div>

          <ActiveTabSwitch />

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {searchQuery?.length >= 2 ? (
              <SearchResults />
            ) : activeTab === "chats" ? (
              <ChatsList />
            ) : (
              <ContactList />
            )}
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="flex-1 flex flex-col bg-slate-900/50 backdrop-blur-sm">
          {selectedUser ? <ChatContainer /> : <NoConversationPlaceholder />}
        </div>
      </BorderAnimatedContainer>
    </div>
  );
}
export default ChatPage;
