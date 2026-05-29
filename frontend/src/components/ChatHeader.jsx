import { XIcon, PhoneIcon, VideoIcon, SearchIcon, MoreVerticalIcon, PinIcon } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { useCallStore } from "../store/useCallStore";
import { useEffect, useState, useRef } from "react";

function ChatHeader() {
  const { selectedUser, setSelectedUser, typingUsers } = useChatStore();
  const { onlineUsers, socket } = useAuthStore();
  const { initiateCall } = useCallStore();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  const isOnline = onlineUsers.includes(selectedUser._id);
  const isTyping = typingUsers[selectedUser._id];

  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === "Escape") setSelectedUser(null);
    };
    window.addEventListener("keydown", handleEscKey);
    return () => window.removeEventListener("keydown", handleEscKey);
  }, [setSelectedUser]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleVoiceCall = () => {
    initiateCall(socket, selectedUser._id, selectedUser.fullName, selectedUser.profilePic, "voice");
  };

  const handleVideoCall = () => {
    initiateCall(socket, selectedUser._id, selectedUser.fullName, selectedUser.profilePic, "video");
  };

  return (
    <div className="flex justify-between items-center bg-slate-800/50 border-b border-slate-700/50 px-6 py-3">
      <div className="flex items-center space-x-3">
        <div className={`avatar ${isOnline ? "online" : "offline"}`}>
          <div className="w-12 rounded-full ring-2 ring-offset-2 ring-offset-slate-900 ring-cyan-500/30">
            <img src={selectedUser.profilePic || "/avatar.png"} alt={selectedUser.fullName} />
          </div>
        </div>

        <div>
          <h3 className="text-slate-200 font-medium">{selectedUser.fullName}</h3>
          {isTyping ? (
            <p className="text-cyan-400 text-sm flex items-center gap-1">
              <span>typing</span>
              <span className="flex gap-0.5">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </span>
            </p>
          ) : (
            <p className="text-slate-400 text-sm">
              {isOnline ? "Online" : selectedUser.lastSeen ? `Last seen ${new Date(selectedUser.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : "Offline"}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleVoiceCall}
          className="p-2.5 rounded-xl text-slate-400 hover:text-cyan-400 hover:bg-slate-700/50 transition-all"
          title="Voice Call"
        >
          <PhoneIcon className="w-5 h-5" />
        </button>

        <button
          onClick={handleVideoCall}
          className="p-2.5 rounded-xl text-slate-400 hover:text-cyan-400 hover:bg-slate-700/50 transition-all"
          title="Video Call"
        >
          <VideoIcon className="w-5 h-5" />
        </button>

        {/* Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-all"
          >
            <MoreVerticalIcon className="w-5 h-5" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-12 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
              <button className="w-full px-4 py-2.5 text-left text-sm text-slate-300 hover:bg-slate-700/50 flex items-center gap-2">
                <SearchIcon className="w-4 h-4" /> Search messages
              </button>
              <button className="w-full px-4 py-2.5 text-left text-sm text-slate-300 hover:bg-slate-700/50 flex items-center gap-2">
                <PinIcon className="w-4 h-4" /> Pinned messages
              </button>
              <hr className="border-slate-700 my-1" />
              <button className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-slate-700/50">
                Block user
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => setSelectedUser(null)}
          className="p-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-all"
        >
          <XIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export default ChatHeader;
