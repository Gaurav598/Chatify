import jwt from "jsonwebtoken";
import User from "../models/User.js";
import config from "../config/index.js";
import logger from "../config/logger.js";

/**
 * Socket.IO authentication middleware.
 * Extracts JWT from cookies and attaches user to socket.
 */
export const socketAuthMiddleware = async (socket, next) => {
  try {
    // Extract token from http-only cookies
    const cookieHeader = socket.handshake.headers.cookie;
    if (!cookieHeader) {
      return next(new Error("Unauthorized - No cookies"));
    }

    const token = cookieHeader
      .split("; ")
      .find((row) => row.startsWith("accessToken="))
      ?.split("=")[1];

    if (!token) {
      // Fallback to old jwt cookie for backward compatibility
      const legacyToken = cookieHeader
        .split("; ")
        .find((row) => row.startsWith("jwt="))
        ?.split("=")[1];

      if (!legacyToken) {
        return next(new Error("Unauthorized - No token"));
      }

      const decoded = jwt.verify(legacyToken, config.jwt.secret);
      const user = await User.findById(decoded.userId);
      if (!user) return next(new Error("User not found"));

      socket.user = user;
      socket.userId = user._id.toString();
      return next();
    }

    const decoded = jwt.verify(token, config.jwt.secret);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return next(new Error("User not found"));
    }

    socket.user = user;
    socket.userId = user._id.toString();

    logger.debug(`Socket authenticated: ${user.fullName} (${user._id})`);
    next();
  } catch (error) {
    logger.warn(`Socket auth failed: ${error.message}`);
    next(new Error("Unauthorized - Authentication failed"));
  }
};
