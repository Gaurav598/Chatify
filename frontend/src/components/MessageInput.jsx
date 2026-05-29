import { useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import toast from "react-hot-toast";
import { ImageIcon, SendIcon, XIcon, FileIcon } from "lucide-react";
import useKeyboardSound from "../hooks/useKeyboardSound";

function MessageInput({ replyingTo, onCancelReply }) {
  const { playRandomKeyStrokeSound } = useKeyboardSound();
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [filePreview, setFilePreview] = useState(null);

  const fileInputRef = useRef(null);

  const { sendMessage, isSoundEnabled, emitTyping, emitStopTyping, selectedUser } = useChatStore();
  const typingTimeoutRef = useRef(null);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview && !filePreview) return;
    if (isSoundEnabled) playRandomKeyStrokeSound();

    sendMessage({
      text: text.trim(),
      image: imagePreview,
      media: filePreview,
      replyTo: replyingTo?._id,
    });

    setText("");
    setImagePreview(null);
    setFilePreview(null);
    onCancelReply?.();
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (selectedUser) emitStopTyping(selectedUser._id);
  };

  const handleTextChange = (e) => {
    setText(e.target.value);
    if (isSoundEnabled) playRandomKeyStrokeSound();

    if (selectedUser) {
      emitTyping(selectedUser._id);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      typingTimeoutRef.current = setTimeout(() => {
        emitStopTyping(selectedUser._id);
      }, 2000);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const removeMedia = () => {
    setImagePreview(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="p-4 border-t border-slate-700/50 bg-slate-900/50 backdrop-blur z-20">
      {/* Reply Preview */}
      {replyingTo && (
        <div className="mb-3 max-w-4xl mx-auto flex items-center justify-between bg-slate-800/80 rounded-xl p-3 border-l-4 border-cyan-500 shadow-lg">
          <div>
            <p className="text-xs text-cyan-400 font-medium mb-1">
              Replying to {replyingTo.senderId?.fullName || "User"}
            </p>
            <p className="text-sm text-slate-300 truncate max-w-md">
              {replyingTo.text || "Media message"}
            </p>
          </div>
          <button onClick={onCancelReply} className="text-slate-400 hover:text-white p-1 bg-slate-700/50 rounded-full">
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Media Preview */}
      {(imagePreview || filePreview) && (
        <div className="max-w-4xl mx-auto mb-3 flex items-center gap-2">
          <div className="relative group">
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="w-24 h-24 object-cover rounded-xl border-2 border-slate-700" />
            ) : (
              <div className="w-24 h-24 bg-slate-800 rounded-xl border-2 border-slate-700 flex flex-col items-center justify-center">
                <FileIcon className="w-8 h-8 text-cyan-500 mb-1" />
                <span className="text-[10px] text-slate-400">File attached</span>
              </div>
            )}
            <button
              onClick={removeMedia}
              className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-white hover:bg-red-500 transition-colors shadow-lg opacity-0 group-hover:opacity-100"
              type="button"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-end gap-3">
        <div className="flex-1 bg-slate-800/80 border border-slate-700 rounded-3xl p-1.5 flex items-end focus-within:border-cyan-500/50 focus-within:ring-1 focus-within:ring-cyan-500/50 transition-all shadow-inner">
          <div className="flex items-center pb-1 px-1 gap-1">
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} className="hidden" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-full text-slate-400 hover:text-cyan-400 hover:bg-slate-700/80 transition-colors"
              title="Attach Image"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
          </div>

          <textarea
            value={text}
            onChange={handleTextChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
            placeholder="Type a message..."
            className="flex-1 bg-transparent text-slate-200 placeholder:text-slate-500 resize-none max-h-32 min-h-[44px] py-3 px-3 outline-none text-sm md:text-base leading-relaxed"
            rows={1}
            style={{ height: "auto" }}
          />
        </div>

        <button
          type="submit"
          disabled={!text.trim() && !imagePreview && !filePreview}
          className="w-14 h-14 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-500 text-white flex items-center justify-center hover:from-cyan-500 hover:to-blue-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0 shadow-lg shadow-cyan-900/30"
        >
          <SendIcon className="w-6 h-6 -ml-1 mt-1" />
        </button>
      </form>
    </div>
  );
}

export default MessageInput;
