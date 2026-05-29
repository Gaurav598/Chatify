import { useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import UsersLoadingSkeleton from "./UsersLoadingSkeleton";

function ContactList() {
  const { getContacts, allContacts, setSelectedUser, selectedUser, isContactsLoading } = useChatStore();
  const { onlineUsers } = useAuthStore();

  useEffect(() => {
    getContacts();
  }, [getContacts]);

  if (isContactsLoading) return <UsersLoadingSkeleton />;

  if (allContacts.length === 0) {
    return (
      <div className="text-center py-8 px-4 text-slate-400 text-sm">
        <p>No contacts found.</p>
        <p className="mt-1 opacity-70">Search for users to add them.</p>
      </div>
    );
  }

  return (
    <>
      {allContacts.map((contact) => {
        const isOnline = onlineUsers.includes(contact._id);
        const isSelected = selectedUser?._id === contact._id;

        return (
          <div
            key={contact._id}
            className={`p-3 rounded-xl cursor-pointer transition-all flex items-center justify-between group ${
              isSelected 
                ? "bg-cyan-500/20 border border-cyan-500/30" 
                : "hover:bg-slate-700/50 border border-transparent"
            }`}
            onClick={() => setSelectedUser(contact)}
          >
            <div className="flex items-center gap-3">
              <div className={`avatar ${isOnline ? "online" : "offline"}`}>
                <div className="w-12 h-12 rounded-full overflow-hidden">
                  <img src={contact.profilePic || "/avatar.png"} alt={contact.fullName} className="w-full h-full object-cover" />
                </div>
              </div>
              <div>
                <h4 className={`font-medium ${isSelected ? "text-cyan-400" : "text-slate-200"}`}>
                  {contact.fullName}
                </h4>
                <p className="text-xs text-slate-400">
                  {isOnline ? "Online" : "Offline"}
                </p>
              </div>
            </div>
            
            <button className="text-xs px-3 py-1 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white opacity-0 group-hover:opacity-100 transition-opacity">
              Message
            </button>
          </div>
        );
      })}
    </>
  );
}

export default ContactList;
