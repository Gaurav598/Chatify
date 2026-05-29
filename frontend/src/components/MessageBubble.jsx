import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { useState, useRef } from "react";
import {
  SmileIcon, ReplyIcon, PinIcon, PencilIcon, TrashIcon,
  MoreHorizontalIcon, ForwardIcon, CopyIcon, CheckCheckIcon, CheckIcon
} from "lucide-react";

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

function MessageBubble({ message, onReply }) {
  const { authUser } = useAuthStore();
  const { editMessage, deleteMessage, reactToMessage, togglePinMessage } = useChatStore();
  const [showActions, setShowActions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text || "");
  const actionsRef = useRef(null);

  const isMine = (message.senderId?._id || message.senderId) === authUser._id;
  const isDeleted = message.deletedAt;

  const senderName = isMine ? "You" : (message.senderId?.fullName || "Unknown");
  const senderPic = message.senderId?.profilePic || "/avatar.png";

  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Read receipt
  const getReadStatus = () => {
    if (!isMine) return null;
    if (message.isOptimistic) return "sending";
    if (message.readBy && message.readBy.length > 0) return "read";
    return "delivered";
  };

  const readStatus = getReadStatus();

  const handleEdit = () => {
    if (editText.trim() && editText !== message.text) {
      editMessage(message._id, editText);
    }
    setIsEditing(false);
  };

  if (isDeleted) {
    return (
      <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-3`}>
        <div className="bg-slate-800/30 border border-slate-700/30 rounded-2xl px-4 py-2.5 max-w-xs">
          <p className="text-slate-500 text-sm italic">🚫 This message was deleted</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex ${isMine ? "justify-end" : "justify-start"} mb-3 group`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowReactions(false); }}
    >
      {/* Avatar (other user) */}
      {!isMine && (
        <div className="flex-shrink-0 mr-2 mt-auto">
          <img src={senderPic} alt="" className="w-8 h-8 rounded-full object-cover" />
        </div>
      )}

      <div className={`relative max-w-[70%] ${isMine ? "order-1" : "order-2"}`}>
        {/* Reply preview */}
        {message.replyTo && (
          <div className="bg-slate-700/30 rounded-t-2xl rounded-b-none px-4 py-2 border-l-2 border-cyan-400 mb-[-1px]">
            <p className="text-xs text-cyan-400 font-medium">{message.replyTo.senderId?.fullName || "User"}</p>
            <p className="text-xs text-slate-400 truncate">{message.replyTo.text || "Media"}</p>
          </div>
        )}

        {/* Message body */}
        <div
          className={`rounded-2xl px-4 py-2.5 ${
            isMine
              ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white"
              : "bg-slate-800 text-slate-200 border border-slate-700/50"
          } ${message.replyTo ? "rounded-t-none" : ""} ${message.shouldShake ? "animate-shake" : ""}`}
        >
          {/* Text content */}
          {isEditing ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEdit()}
                className="flex-1 bg-transparent border-b border-white/30 outline-none text-sm"
                autoFocus
              />
              <button onClick={handleEdit} className="text-xs underline">Save</button>
              <button onClick={() => setIsEditing(false)} className="text-xs opacity-60">Cancel</button>
            </div>
          ) : (
            <>
              {message.text && <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.text}</p>}

              {/* Media */}
              {message.media?.url && (
                <div className="mt-2 rounded-xl overflow-hidden">
                  {message.type === "image" ? (
                    <img src={message.media.url} alt="" className="max-w-full rounded-xl cursor-pointer hover:opacity-90 transition-opacity" />
                  ) : message.type === "video" ? (
                    <video src={message.media.url} controls className="max-w-full rounded-xl" />
                  ) : message.type === "voice" ? (
                    <audio src={message.media.url} controls className="w-full" />
                  ) : (
                    <a href={message.media.url} target="_blank" className="text-cyan-300 underline text-sm">
                      📎 {message.media.name || "Download file"}
                    </a>
                  )}
                </div>
              )}

              {/* Legacy image support */}
              {!message.media?.url && message.image && (
                <img src={message.image} alt="" className="mt-2 max-w-full rounded-xl" />
              )}
            </>
          )}

          {/* Meta info */}
          <div className={`flex items-center gap-1.5 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
            {message.isEdited && (
              <span className="text-[10px] opacity-50 italic">edited</span>
            )}
            <span className={`text-[10px] ${isMine ? "text-white/60" : "text-slate-500"}`}>
              {time}
            </span>
            {readStatus === "read" && <CheckCheckIcon className="w-3.5 h-3.5 text-cyan-300" />}
            {readStatus === "delivered" && <CheckCheckIcon className="w-3.5 h-3.5 text-white/40" />}
            {readStatus === "sending" && <CheckIcon className="w-3.5 h-3.5 text-white/30" />}
          </div>
        </div>

        {/* Pinned indicator */}
        {message.isPinned && (
          <div className="absolute -top-2 -right-2 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
            <PinIcon className="w-3 h-3 text-white" />
          </div>
        )}

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className={`flex gap-1 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
            {Object.entries(
              message.reactions.reduce((acc, r) => {
                acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                return acc;
              }, {})
            ).map(([emoji, count]) => (
              <button
                key={emoji}
                onClick={() => reactToMessage(message._id, emoji)}
                className="bg-slate-800 border border-slate-700 rounded-full px-2 py-0.5 text-xs hover:bg-slate-700 transition-colors"
              >
                {emoji} {count > 1 && <span className="text-slate-400">{count}</span>}
              </button>
            ))}
          </div>
        )}

        {/* Action buttons */}
        {showActions && !isEditing && (
          <div className={`absolute top-0 ${isMine ? "-left-28" : "-right-28"} flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-xl px-2 py-1 shadow-xl z-10`}>
            <button
              onClick={() => setShowReactions(!showReactions)}
              className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
              title="React"
            >
              <SmileIcon className="w-4 h-4 text-slate-400" />
            </button>
            <button
              onClick={() => onReply?.(message)}
              className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
              title="Reply"
            >
              <ReplyIcon className="w-4 h-4 text-slate-400" />
            </button>
            {isMine && message.type === "text" && (
              <button
                onClick={() => { setIsEditing(true); setEditText(message.text); }}
                className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
                title="Edit"
              >
                <PencilIcon className="w-4 h-4 text-slate-400" />
              </button>
            )}
            <button
              onClick={() => deleteMessage(message._id, isMine)}
              className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
              title="Delete"
            >
              <TrashIcon className="w-4 h-4 text-red-400" />
            </button>
          </div>
        )}

        {/* Reaction picker */}
        {showReactions && (
          <div className={`absolute -top-10 ${isMine ? "right-0" : "left-0"} flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-xl px-2 py-1.5 shadow-xl z-20`}>
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => { reactToMessage(message._id, emoji); setShowReactions(false); }}
                className="text-lg hover:scale-125 transition-transform px-0.5"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MessageBubble;
