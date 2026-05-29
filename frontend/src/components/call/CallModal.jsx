import { useRef, useEffect } from "react";
import { useCallStore } from "../../store/useCallStore";
import { useAuthStore } from "../../store/useAuthStore";
import {
  PhoneOffIcon, MicIcon, MicOffIcon, VideoIcon, VideoOffIcon,
  MonitorIcon, MaximizeIcon
} from "lucide-react";
import { useState } from "react";

function CallModal() {
  const {
    callState, callType, remoteUser, localStream, remoteStream,
    endCall, toggleMute, toggleVideo, toggleScreenShare, isScreenSharing,
  } = useCallStore();
  const { socket } = useAuthStore();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    let interval;
    if (callState === "connected") {
      interval = setInterval(() => setDuration((d) => d + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [callState]);

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 flex flex-col items-center justify-center">
      {/* Remote video (full screen) */}
      {callType === "video" && remoteStream && (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Overlay content */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Remote user info */}
        {(callState === "calling" || callType === "voice") && (
          <div className="text-center">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-cyan-500/30 mx-auto mb-4">
              <img
                src={remoteUser?.profilePic || "/avatar.png"}
                alt={remoteUser?.fullName}
                className="w-full h-full object-cover"
              />
            </div>
            <h3 className="text-white text-2xl font-semibold">{remoteUser?.fullName}</h3>
            <p className="text-slate-400 mt-1">
              {callState === "calling" ? "Calling..." : callState === "connected" ? formatDuration(duration) : "Connecting..."}
            </p>
          </div>
        )}

        {/* Call status indicator */}
        {callState === "calling" && (
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-3 h-3 bg-cyan-400 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        )}

        {/* Connected duration for video */}
        {callState === "connected" && callType === "video" && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-slate-900/60 backdrop-blur px-4 py-2 rounded-full">
            <p className="text-white text-sm font-mono">{formatDuration(duration)}</p>
          </div>
        )}
      </div>

      {/* Local video (PIP) */}
      {callType === "video" && localStream && (
        <div className="absolute top-6 right-6 w-48 h-36 bg-slate-800 rounded-2xl overflow-hidden border-2 border-slate-700 shadow-2xl">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover mirror"
          />
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-4">
        <button
          onClick={() => { toggleMute(); setIsMuted(!isMuted); }}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
            isMuted ? "bg-red-500 text-white" : "bg-slate-700 text-white hover:bg-slate-600"
          }`}
        >
          {isMuted ? <MicOffIcon className="w-6 h-6" /> : <MicIcon className="w-6 h-6" />}
        </button>

        {callType === "video" && (
          <button
            onClick={() => { toggleVideo(); setIsVideoOff(!isVideoOff); }}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              isVideoOff ? "bg-red-500 text-white" : "bg-slate-700 text-white hover:bg-slate-600"
            }`}
          >
            {isVideoOff ? <VideoOffIcon className="w-6 h-6" /> : <VideoIcon className="w-6 h-6" />}
          </button>
        )}

        <button
          onClick={toggleScreenShare}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
            isScreenSharing ? "bg-cyan-500 text-white" : "bg-slate-700 text-white hover:bg-slate-600"
          }`}
        >
          <MonitorIcon className="w-6 h-6" />
        </button>

        <button
          onClick={() => endCall(socket, remoteUser?._id)}
          className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-all shadow-lg shadow-red-500/25"
        >
          <PhoneOffIcon className="w-7 h-7" />
        </button>
      </div>
    </div>
  );
}

export default CallModal;
