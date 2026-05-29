import { useCallStore } from "../../store/useCallStore";
import { useAuthStore } from "../../store/useAuthStore";
import { PhoneIcon, PhoneOffIcon, VideoIcon } from "lucide-react";

function IncomingCallModal() {
  const { remoteUser, callType, answerCall, rejectCall } = useCallStore();
  const { socket } = useAuthStore();

  // Store the offer from the incoming call event
  const handleAnswer = () => {
    // The offer is stored when setIncomingCall was called
    // We need to get it from the socket event - for now pass through
    answerCall(socket, remoteUser._id, null, callType);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 max-w-sm w-full mx-4 text-center animate-in fade-in zoom-in">
        {/* Animated ring effect */}
        <div className="relative w-28 h-28 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-cyan-400/30 animate-ping" />
          <div className="absolute inset-2 rounded-full border-2 border-cyan-400/20 animate-ping" style={{ animationDelay: "0.3s" }} />
          <img
            src={remoteUser?.profilePic || "/avatar.png"}
            alt={remoteUser?.fullName}
            className="w-full h-full rounded-full object-cover border-4 border-cyan-500/50 relative z-10"
          />
        </div>

        <h3 className="text-white text-xl font-semibold mb-1">{remoteUser?.fullName}</h3>
        <p className="text-slate-400 mb-8">
          Incoming {callType === "video" ? "Video" : "Voice"} Call...
        </p>

        <div className="flex justify-center gap-6">
          <button
            onClick={() => rejectCall(socket, remoteUser._id)}
            className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-all shadow-lg shadow-red-500/30"
          >
            <PhoneOffIcon className="w-7 h-7" />
          </button>

          <button
            onClick={handleAnswer}
            className="w-16 h-16 rounded-full bg-green-500 text-white flex items-center justify-center hover:bg-green-600 transition-all shadow-lg shadow-green-500/30"
          >
            {callType === "video" ? (
              <VideoIcon className="w-7 h-7" />
            ) : (
              <PhoneIcon className="w-7 h-7" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default IncomingCallModal;
