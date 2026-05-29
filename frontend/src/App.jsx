import { Navigate, Route, Routes } from "react-router";
import ChatPage from "./pages/ChatPage";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import { useAuthStore } from "./store/useAuthStore";
import { useCallStore } from "./store/useCallStore";
import { useEffect } from "react";
import PageLoader from "./components/PageLoader";
import CallModal from "./components/call/CallModal";
import IncomingCallModal from "./components/call/IncomingCallModal";

import { Toaster } from "react-hot-toast";

function App() {
  const { checkAuth, isCheckingAuth, authUser, socket } = useAuthStore();
  const { callState, setIncomingCall, handleAnswer, handleIceCandidate, endCall } = useCallStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Set up call event listeners
  useEffect(() => {
    if (!socket) return;

    socket.on("call:incoming", (data) => {
      setIncomingCall(data);
    });

    socket.on("call:answered", ({ answer }) => {
      handleAnswer(answer);
    });

    socket.on("call:ice-candidate", ({ candidate }) => {
      handleIceCandidate(candidate);
    });

    socket.on("call:ended", () => {
      endCall();
    });

    socket.on("call:rejected", () => {
      endCall();
    });

    return () => {
      socket.off("call:incoming");
      socket.off("call:answered");
      socket.off("call:ice-candidate");
      socket.off("call:ended");
      socket.off("call:rejected");
    };
  }, [socket, setIncomingCall, handleAnswer, handleIceCandidate, endCall]);

  if (isCheckingAuth) return <PageLoader />;

  return (
    <div className="min-h-screen bg-slate-950 relative flex items-center justify-center p-4 overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f12_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f12_1px,transparent_1px)] bg-[size:14px_24px]" />
      <div className="absolute top-0 -left-4 size-96 bg-purple-600 opacity-15 blur-[120px]" />
      <div className="absolute bottom-0 -right-4 size-96 bg-cyan-500 opacity-15 blur-[120px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-96 bg-indigo-500 opacity-10 blur-[150px]" />

      <Routes>
        <Route path="/" element={authUser ? <ChatPage /> : <Navigate to="/login" />} />
        <Route path="/login" element={!authUser ? <LoginPage /> : <Navigate to="/" />} />
        <Route path="/signup" element={!authUser ? <SignUpPage /> : <Navigate to="/" />} />
        <Route path="/forgot-password" element={!authUser ? <ForgotPasswordPage /> : <Navigate to="/" />} />
        <Route path="/reset-password/:token" element={!authUser ? <ResetPasswordPage /> : <Navigate to="/" />} />
      </Routes>

      {/* Call modals */}
      {callState === "ringing" && <IncomingCallModal />}
      {(callState === "calling" || callState === "connected") && <CallModal />}

      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1e293b',
            color: '#e2e8f0',
            border: '1px solid #334155',
            borderRadius: '12px',
          },
        }}
      />
    </div>
  );
}
export default App;
