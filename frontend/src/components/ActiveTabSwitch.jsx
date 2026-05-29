import { useChatStore } from "../store/useChatStore";
import { MessageSquareIcon, UsersIcon } from "lucide-react";

function ActiveTabSwitch() {
  const { activeTab, setActiveTab } = useChatStore();

  return (
    <div className="flex p-1.5 m-4 bg-slate-900/60 rounded-xl border border-slate-700/50 backdrop-blur-md">
      <button
        onClick={() => setActiveTab("chats")}
        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
          activeTab === "chats"
            ? "bg-slate-700 text-white shadow-md"
            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
        }`}
      >
        <MessageSquareIcon className="w-4 h-4" />
        Chats
      </button>

      <button
        onClick={() => setActiveTab("contacts")}
        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
          activeTab === "contacts"
            ? "bg-slate-700 text-white shadow-md"
            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
        }`}
      >
        <UsersIcon className="w-4 h-4" />
        Contacts
      </button>
    </div>
  );
}

export default ActiveTabSwitch;
