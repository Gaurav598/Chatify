import jwt from "jsonwebtoken";
import User from "../models/User.js";
import config from "../config/index.js";
import { UnauthorizedError, ForbiddenError } from "../utils/errors.js";

/**
 * Protect routes — requires valid JWT access token.
 */
export const protectRoute = async (req, res, next) => {
  try {
    const token = req.cookies.accessToken || req.cookies.jwt; // backward compat

    if (!token) {
      throw new UnauthorizedError("No token provided");
    }

    const decoded = jwt.verify(token, config.jwt.secret);

    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new UnauthorizedError("User not found");
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return next(new UnauthorizedError(error.message));
    }
    next(error);
  }
};

/**
 * Role-based access control middleware.
 * Usage: authorize("admin", "moderator")
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError("Authentication required"));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError("Insufficient permissions"));
    }

    next();
  };
};

/**
 * Optional auth — attaches user if token exists, but doesn't block.
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const token = req.cookies.accessToken || req.cookies.jwt;
    if (token) {
      const decoded = jwt.verify(token, config.jwt.secret);
      req.user = await User.findById(decoded.userId);
    }
  } catch {
    // Silently continue without auth
  }
  next();
};
