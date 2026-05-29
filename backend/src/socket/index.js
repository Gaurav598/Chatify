import { Server } from "socket.io";
import http from "http";
import express from "express";
import config from "../config/index.js";
import logger from "../config/logger.js";
import { socketAuthMiddleware } from "./middleware.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [config.client.url],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Apply authentication middleware
io.use(socketAuthMiddleware);

// Online users map: { userId: socketId }
const userSocketMap = {};

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

export function getOnlineUserIds() {
  return Object.keys(userSocketMap);
}

io.on("connection", (socket) => {
  const userId = socket.userId;
  const userName = socket.user.fullName;

  logger.info(`Socket connected: ${userName} (${userId})`);

  // Register user
  userSocketMap[userId] = socket.id;

  // Broadcast online users
  io.emit("getOnlineUsers", getOnlineUserIds());

  // Join user's personal room for targeted events
  socket.join(`user:${userId}`);

  // ─── Typing Indicators ───
  socket.on("typing", ({ conversationId, recipientId }) => {
    if (recipientId) {
      const recipientSocketId = getReceiverSocketId(recipientId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("userTyping", {
          userId,
          conversationId,
          userName,
        });
      }
    }
  });

  socket.on("stopTyping", ({ conversationId, recipientId }) => {
    if (recipientId) {
      const recipientSocketId = getReceiverSocketId(recipientId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("userStoppedTyping", {
          userId,
          conversationId,
        });
      }
    }
  });

  // ─── Read Receipts ───
  socket.on("markAsRead", ({ conversationId, senderId }) => {
    if (senderId) {
      const senderSocketId = getReceiverSocketId(senderId);
      if (senderSocketId) {
        io.to(senderSocketId).emit("messagesRead", {
          conversationId,
          readBy: userId,
          readAt: new Date(),
        });
      }
    }
  });

  // ─── WebRTC Signaling ───
  socket.on("call:initiate", ({ to, offer, callType }) => {
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("call:incoming", {
        from: userId,
        callerName: userName,
        callerPic: socket.user.profilePic,
        offer,
        callType, // "voice" or "video"
      });
    }
  });

  socket.on("call:answer", ({ to, answer }) => {
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("call:answered", {
        from: userId,
        answer,
      });
    }
  });

  socket.on("call:ice-candidate", ({ to, candidate }) => {
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("call:ice-candidate", {
        from: userId,
        candidate,
      });
    }
  });

  socket.on("call:end", ({ to }) => {
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("call:ended", {
        from: userId,
      });
    }
  });

  socket.on("call:reject", ({ to }) => {
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("call:rejected", {
        from: userId,
      });
    }
  });

  // ─── Presence ───
  socket.on("presence:update", ({ status }) => {
    io.emit("presence:changed", { userId, status });
  });

  // ─── Disconnect ───
  socket.on("disconnect", (reason) => {
    logger.info(`Socket disconnected: ${userName} (${userId}) - ${reason}`);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", getOnlineUserIds());
  });
});

export { io, app, server };
