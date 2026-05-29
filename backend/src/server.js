import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import path from "path";

import config from "./config/index.js";
import logger from "./config/logger.js";
import { connectDB } from "./config/db.js";
import { initRedis } from "./config/redis.js";
import { app, server } from "./socket/index.js";
import { errorHandler } from "./middleware/errorHandler.js";

import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import conversationRoutes from "./routes/conversation.route.js";
import userRoutes from "./routes/user.route.js";

const __dirname = path.resolve();

// ─── Security Middleware ───
app.use(helmet({
  contentSecurityPolicy: config.isProd ? undefined : false,
  crossOriginEmbedderPolicy: false,
}));

// ─── CORS ───
app.use(cors({
  origin: config.isDev ? [config.client.url, "http://localhost:5173", "http://localhost:3000"] : [config.client.url],
  credentials: true,
}));

// ─── Body Parsing ───
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use(compression());

// ─── HTTP Request Logging ───
if (config.isDev) {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined", {
    stream: { write: (message) => logger.info(message.trim()) },
  }));
}

// ─── Health Check ───
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
  });
});

// ─── API Routes ───
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/users", userRoutes);

// ─── Static Files (Production) ───
if (config.isProd) {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

// ─── 404 Handler ───
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { code: "NOT_FOUND", message: `Route ${req.originalUrl} not found` },
  });
});

// ─── Global Error Handler (must be last) ───
app.use(errorHandler);

// ─── Start Server ───
const startServer = async () => {
  try {
    await connectDB();
    await initRedis();

    server.listen(config.port, () => {
      logger.info(`
╔══════════════════════════════════════════╗
║         🚀 Chatify Server Ready          ║
║──────────────────────────────────────────║
║  Port:        ${String(config.port).padEnd(26)}║
║  Environment: ${config.nodeEnv.padEnd(26)}║
║  Client URL:  ${config.client.url.padEnd(26)}║
╚══════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

// ─── Graceful Shutdown ───
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  server.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled Rejection:", reason);
});
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  process.exit(1);
});

startServer();
