import { create } from "zustand";

export const useCallStore = create((set, get) => ({
  callState: "idle", // idle, calling, ringing, connected
  callType: null, // "voice" or "video"
  remoteUser: null,
  localStream: null,
  remoteStream: null,
  peerConnection: null,
  isScreenSharing: false,

  initiateCall: async (socket, userId, userName, userPic, callType) => {
    try {
      const constraints = {
        audio: true,
        video: callType === "video",
      };

      const localStream = await navigator.mediaDevices.getUserMedia(constraints);

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      });

      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

      pc.ontrack = (event) => {
        set({ remoteStream: event.streams[0] });
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("call:ice-candidate", {
            to: userId,
            candidate: event.candidate,
          });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit("call:initiate", {
        to: userId,
        offer,
        callType,
      });

      set({
        callState: "calling",
        callType,
        remoteUser: { _id: userId, fullName: userName, profilePic: userPic },
        localStream,
        peerConnection: pc,
      });
    } catch (error) {
      console.error("Failed to initiate call:", error);
      get().endCall();
    }
  },

  answerCall: async (socket, from, offer, callType) => {
    try {
      const constraints = {
        audio: true,
        video: callType === "video",
      };

      const localStream = await navigator.mediaDevices.getUserMedia(constraints);

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      });

      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

      pc.ontrack = (event) => {
        set({ remoteStream: event.streams[0] });
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("call:ice-candidate", {
            to: from,
            candidate: event.candidate,
          });
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("call:answer", { to: from, answer });

      set({
        callState: "connected",
        localStream,
        peerConnection: pc,
      });
    } catch (error) {
      console.error("Failed to answer call:", error);
      get().endCall();
    }
  },

  handleAnswer: async (answer) => {
    const { peerConnection } = get();
    if (peerConnection) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      set({ callState: "connected" });
    }
  },

  handleIceCandidate: async (candidate) => {
    const { peerConnection } = get();
    if (peerConnection) {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  },

  setIncomingCall: (data) => {
    set({
      callState: "ringing",
      callType: data.callType,
      remoteUser: {
        _id: data.from,
        fullName: data.callerName,
        profilePic: data.callerPic,
      },
    });
  },

  rejectCall: (socket, userId) => {
    socket.emit("call:reject", { to: userId });
    get().endCall();
  },

  toggleScreenShare: async () => {
    const { peerConnection, isScreenSharing, localStream } = get();
    if (!peerConnection) return;

    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const videoTrack = screenStream.getVideoTracks()[0];
        const sender = peerConnection.getSenders().find((s) => s.track?.kind === "video");
        if (sender) {
          await sender.replaceTrack(videoTrack);
        }
        videoTrack.onended = () => get().toggleScreenShare();
        set({ isScreenSharing: true });
      } else {
        const videoTrack = localStream?.getVideoTracks()[0];
        const sender = peerConnection.getSenders().find((s) => s.track?.kind === "video");
        if (sender && videoTrack) {
          await sender.replaceTrack(videoTrack);
        }
        set({ isScreenSharing: false });
      }
    } catch (error) {
      console.error("Screen share error:", error);
    }
  },

  toggleMute: () => {
    const { localStream } = get();
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) audioTrack.enabled = !audioTrack.enabled;
    }
  },

  toggleVideo: () => {
    const { localStream } = get();
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) videoTrack.enabled = !videoTrack.enabled;
    }
  },

  endCall: (socket, userId) => {
    const { localStream, peerConnection } = get();

    if (socket && userId) {
      socket.emit("call:end", { to: userId });
    }

    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }

    if (peerConnection) {
      peerConnection.close();
    }

    set({
      callState: "idle",
      callType: null,
      remoteUser: null,
      localStream: null,
      remoteStream: null,
      peerConnection: null,
      isScreenSharing: false,
    });
  },
}));
