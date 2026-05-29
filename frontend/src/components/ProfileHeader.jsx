import { useState, useRef } from "react";
import { LogOutIcon, VolumeOffIcon, Volume2Icon, SettingsIcon, UserIcon, LoaderIcon } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";

function ProfileHeader() {
  const { logout, authUser, updateProfile, isUpdatingProfile } = useAuthStore();
  const { isSoundEnabled, toggleSound } = useChatStore();
  const [showDropdown, setShowDropdown] = useState(false);
  
  const fileInputRef = useRef(null);
  const dropdownRef = useRef(null);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onloadend = async () => {
      const base64Image = reader.result;
      await updateProfile({ profilePic: base64Image });
    };
  };

  return (
    <div className="p-4 border-b border-slate-700/50 bg-slate-800/80 backdrop-blur-md relative z-30">
      <div className="flex items-center justify-between">
        
        {/* User Profile Area */}
        <div 
          className="flex items-center gap-3 cursor-pointer hover:bg-slate-700/40 p-1.5 rounded-xl transition-colors"
          onClick={() => setShowDropdown(!showDropdown)}
        >
          <div className="relative group">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-cyan-500/50 ring-2 ring-transparent group-hover:ring-cyan-500/20 transition-all">
              <img
                src={authUser.profilePic || "/avatar.png"}
                alt={authUser.fullName}
                className="w-full h-full object-cover"
              />
              {isUpdatingProfile && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <LoaderIcon className="w-4 h-4 text-cyan-400 animate-spin" />
                </div>
              )}
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-slate-800 rounded-full"></div>
          </div>
          
          <div className="flex flex-col">
            <h3 className="text-slate-200 font-semibold text-sm leading-tight max-w-[120px] truncate">
              {authUser.fullName}
            </h3>
            <p className="text-cyan-400 text-[11px] font-medium tracking-wide">ONLINE</p>
          </div>
        </div>

        {/* Dropdown Menu */}
        {showDropdown && (
          <div 
            className="absolute top-16 left-4 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 z-50"
          >
            <div className="p-3 border-b border-slate-700 bg-slate-900/30">
              <p className="text-xs text-slate-400">Signed in as</p>
              <p className="text-sm font-medium text-slate-200 truncate">{authUser.email}</p>
            </div>
            
            <div className="p-1.5">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
              >
                <UserIcon className="w-4 h-4 text-slate-400" />
                Change Avatar
              </button>
              <button 
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
              >
                <SettingsIcon className="w-4 h-4 text-slate-400" />
                Settings
              </button>
            </div>
            
            <div className="p-1.5 border-t border-slate-700">
              <button 
                onClick={logout}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"
              >
                <LogOutIcon className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </div>
        )}

        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleImageUpload}
          className="hidden"
        />

        {/* Top Right Quick Actions */}
        <div className="flex gap-1 items-center">
          <button
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition-all"
            onClick={toggleSound}
            title={isSoundEnabled ? "Mute notifications" : "Unmute notifications"}
          >
            {isSoundEnabled ? (
              <Volume2Icon className="w-5 h-5" />
            ) : (
              <VolumeOffIcon className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProfileHeader;
