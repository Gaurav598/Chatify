import jwt from "jsonwebtoken";
import crypto from "crypto";
import config from "../config/index.js";
import User from "../models/User.js";
import { BadRequestError, UnauthorizedError, ConflictError, NotFoundError } from "../utils/errors.js";
import logger from "../config/logger.js";

class AuthService {
  /**
   * Register a new user
   */
  async signup({ fullName, email, password }) {
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new ConflictError("Email already registered");
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Generate username from email
    const baseUsername = email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "");
    let username = baseUsername;
    let counter = 1;
    while (await User.findOne({ username })) {
      username = `${baseUsername}${counter}`;
      counter++;
    }

    const user = await User.create({
      fullName,
      email: email.toLowerCase(),
      username,
      password,
      verificationToken,
      verificationTokenExpiry,
    });

    const tokens = this.generateTokens(user._id);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    logger.info(`New user registered: ${user.email}`);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
      verificationToken,
    };
  }

  /**
   * Login with email and password
   */
  async login({ email, password }) {
    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user) {
      throw new UnauthorizedError("Invalid credentials");
    }

    if (user.provider !== "local") {
      throw new BadRequestError(`Please sign in with ${user.provider}`);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const tokens = this.generateTokens(user._id);
    user.refreshToken = tokens.refreshToken;
    user.status = "online";
    user.lastSeen = new Date();
    await user.save();

    logger.info(`User logged in: ${user.email}`);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  /**
   * Google OAuth login/signup
   */
  async googleAuth({ email, fullName, providerId, profilePic }) {
    let user = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { provider: "google", providerId },
      ],
    });

    if (user && user.provider !== "google") {
      // User exists with local auth — link the Google account
      user.provider = "google";
      user.providerId = providerId;
      user.isVerified = true;
      if (!user.profilePic && profilePic) user.profilePic = profilePic;
      await user.save();
    } else if (!user) {
      // Create new user
      const baseUsername = email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "");
      let username = baseUsername;
      let counter = 1;
      while (await User.findOne({ username })) {
        username = `${baseUsername}${counter}`;
        counter++;
      }

      user = await User.create({
        fullName,
        email: email.toLowerCase(),
        username,
        provider: "google",
        providerId,
        profilePic: profilePic || "",
        isVerified: true,
      });
    }

    const tokens = this.generateTokens(user._id);
    user.refreshToken = tokens.refreshToken;
    user.status = "online";
    await user.save();

    logger.info(`Google OAuth login: ${user.email}`);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken) {
    if (!refreshToken) {
      throw new UnauthorizedError("Refresh token required");
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
    } catch {
      throw new UnauthorizedError("Invalid refresh token");
    }

    const user = await User.findById(decoded.userId).select("+refreshToken");
    if (!user || user.refreshToken !== refreshToken) {
      throw new UnauthorizedError("Invalid refresh token");
    }

    // Rotate refresh token
    const tokens = this.generateTokens(user._id);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    return tokens;
  }

  /**
   * Verify email
   */
  async verifyEmail(token) {
    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      throw new BadRequestError("Invalid or expired verification token");
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiry = undefined;
    await user.save();

    logger.info(`Email verified: ${user.email}`);
    return this.sanitizeUser(user);
  }

  /**
   * Request password reset
   */
  async forgotPassword(email) {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal if email exists
      return { message: "If that email exists, a reset link has been sent" };
    }

    if (user.provider !== "local") {
      throw new BadRequestError(`This account uses ${user.provider} sign-in`);
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    user.resetPasswordExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    logger.info(`Password reset requested: ${user.email}`);

    return { resetToken, email: user.email, name: user.fullName };
  }

  /**
   * Reset password with token
   */
  async resetPassword(token, newPassword) {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpiry: { $gt: Date.now() },
    });

    if (!user) {
      throw new BadRequestError("Invalid or expired reset token");
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;
    user.refreshToken = undefined; // Invalidate all sessions
    await user.save();

    logger.info(`Password reset completed: ${user.email}`);
    return this.sanitizeUser(user);
  }

  /**
   * Logout — invalidate refresh token
   */
  async logout(userId) {
    await User.findByIdAndUpdate(userId, {
      refreshToken: undefined,
      status: "offline",
      lastSeen: new Date(),
    });

    logger.info(`User logged out: ${userId}`);
  }

  /**
   * Update user profile
   */
  async updateProfile(userId, updates) {
    const allowedUpdates = ["fullName", "bio", "profilePic", "username", "gender", "settings", "customStatus"];
    const filteredUpdates = {};

    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = updates[key];
      }
    }

    if (filteredUpdates.username) {
      const existing = await User.findOne({
        username: filteredUpdates.username.toLowerCase(),
        _id: { $ne: userId },
      });
      if (existing) {
        throw new ConflictError("Username already taken");
      }
    }

    const user = await User.findByIdAndUpdate(userId, filteredUpdates, {
      new: true,
      runValidators: true,
    });

    if (!user) throw new NotFoundError("User not found");

    return this.sanitizeUser(user);
  }

  /**
   * Generate access + refresh tokens
   */
  generateTokens(userId) {
    const accessToken = jwt.sign({ userId }, config.jwt.secret, {
      expiresIn: config.jwt.accessExpiry,
    });

    const refreshToken = jwt.sign({ userId }, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiry,
    });

    return { accessToken, refreshToken };
  }

  /**
   * Set auth cookies on response
   */
  setTokenCookies(res, { accessToken, refreshToken }) {
    const cookieOptions = {
      httpOnly: true,
      sameSite: "strict",
      secure: config.isProd,
    };

    res.cookie("accessToken", accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie("refreshToken", refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: "/api/auth/refresh", // Only sent on refresh endpoint
    });
  }

  /**
   * Clear auth cookies
   */
  clearTokenCookies(res) {
    res.cookie("accessToken", "", { maxAge: 0 });
    res.cookie("refreshToken", "", { maxAge: 0, path: "/api/auth/refresh" });
  }

  /**
   * Sanitize user object for response
   */
  sanitizeUser(user) {
    const userObj = user.toJSON ? user.toJSON() : { ...user };
    delete userObj.password;
    delete userObj.refreshToken;
    delete userObj.verificationToken;
    delete userObj.verificationTokenExpiry;
    delete userObj.resetPasswordToken;
    delete userObj.resetPasswordExpiry;
    return userObj;
  }
}

export default new AuthService();
