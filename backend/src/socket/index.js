import { Server } from "socket.io";
import http from "http";
import express from "express";
import Redis from "ioredis";
import { createAdapter } from "@socket.io/redis-adapter";
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

// Redis Pub/Sub Adapter Setup for Horizontal Scaling
let pubClient, subClient;
if (config.redis.url) {
  pubClient = new Redis(config.redis.url);
  subClient = pubClient.duplicate();
  
  pubClient.on('error', (err) => logger.error('Redis PubClient Error', err.message));
  subClient.on('error', (err) => logger.error('Redis SubClient Error', err.message));

  io.adapter(createAdapter(pubClient, subClient));
  logger.info("Socket.IO Redis Adapter configured successfully");
}

// Apply authentication middleware
io.use(socketAuthMiddleware);

const ONLINE_USERS_KEY = "chatify:online_users";

// Helper function to emit online users globally
async function broadcastOnlineUsers() {
  if (pubClient) {
    const users = await pubClient.smembers(ONLINE_USERS_KEY);
    io.emit("getOnlineUsers", users);
  } else {
    // Fallback for no redis
    const rooms = io.of("/").adapter.rooms;
    const users = [];
    for (const [room, _] of rooms.entries()) {
      if (room.startsWith("user:")) {
        users.push(room.split(":")[1]);
      }
    }
    io.emit("getOnlineUsers", users);
  }
}

io.on("connection", async (socket) => {
  const userId = socket.userId;
  const userName = socket.user.fullName;

  logger.info(`Socket connected: ${userName} (${userId})`);

  // Join user's personal room for targeted events (Distributed compatible)
  socket.join(`user:${userId}`);

  // Track online status globally
  if (pubClient) {
    await pubClient.sadd(ONLINE_USERS_KEY, userId);
  }
  
  await broadcastOnlineUsers();

  // ─── Typing Indicators ───
  socket.on("typing", ({ conversationId, recipientId }) => {
    if (recipientId) {
      io.to(`user:${recipientId}`).emit("userTyping", {
        userId,
        conversationId,
        userName,
      });
    }
  });

  socket.on("stopTyping", ({ conversationId, recipientId }) => {
    if (recipientId) {
      io.to(`user:${recipientId}`).emit("userStoppedTyping", {
        userId,
        conversationId,
      });
    }
  });

  // ─── Read Receipts ───
  socket.on("markAsRead", ({ conversationId, senderId }) => {
    if (senderId) {
      io.to(`user:${senderId}`).emit("messagesRead", {
        conversationId,
        readBy: userId,
        readAt: new Date(),
      });
    }
  });

  // ─── WebRTC Signaling ───
  socket.on("call:initiate", ({ to, offer, callType }) => {
    if (to) {
      io.to(`user:${to}`).emit("call:incoming", {
        from: userId,
        callerName: userName,
        callerPic: socket.user.profilePic,
        offer,
        callType, // "voice" or "video"
      });
    }
  });

  socket.on("call:answer", ({ to, answer }) => {
    if (to) {
      io.to(`user:${to}`).emit("call:answered", {
        from: userId,
        answer,
      });
    }
  });

  socket.on("call:ice-candidate", ({ to, candidate }) => {
    if (to) {
      io.to(`user:${to}`).emit("call:ice-candidate", {
        from: userId,
        candidate,
      });
    }
  });

  socket.on("call:end", ({ to }) => {
    if (to) {
      io.to(`user:${to}`).emit("call:ended", {
        from: userId,
      });
    }
  });

  socket.on("call:reject", ({ to }) => {
    if (to) {
      io.to(`user:${to}`).emit("call:rejected", {
        from: userId,
      });
    }
  });

  // ─── Presence ───
  socket.on("presence:update", ({ status }) => {
    io.emit("presence:changed", { userId, status });
  });

  // ─── Disconnect ───
  socket.on("disconnect", async (reason) => {
    logger.info(`Socket disconnected: ${userName} (${userId}) - ${reason}`);
    
    // Check if user has any other active connections before removing from online set
    const sockets = await io.in(`user:${userId}`).fetchSockets();
    if (sockets.length === 0 && pubClient) {
      await pubClient.srem(ONLINE_USERS_KEY, userId);
    }
    
    await broadcastOnlineUsers();
  });
});

export { io, app, server, pubClient };
