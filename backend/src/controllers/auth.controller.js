import { z } from "zod";
import authService from "../services/auth.service.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { validate, emailSchema, passwordSchema, fullNameSchema } from "../middleware/validate.js";
import { sendWelcomeEmail } from "../emails/emailHandlers.js";
import config from "../config/index.js";
import logger from "../config/logger.js";

// Validation schemas
const signupSchema = z.object({
  body: z.object({
    fullName: fullNameSchema,
    email: emailSchema,
    password: passwordSchema,
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: z.string().min(1, "Password is required"),
  }),
});

const forgotPasswordSchema = z.object({
  body: z.object({
    email: emailSchema,
  }),
});

const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, "Reset token is required"),
    password: passwordSchema,
  }),
});

const updateProfileSchema = z.object({
  body: z.object({
    fullName: fullNameSchema.optional(),
    bio: z.string().max(200).optional(),
    profilePic: z.string().optional(),
    username: z.string().min(3).max(30).regex(/^[a-z0-9_]+$/).optional(),
    gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
    customStatus: z.object({
      text: z.string().max(100).optional(),
      emoji: z.string().max(10).optional(),
    }).optional(),
    settings: z.object({
      notifications: z.object({
        sound: z.boolean().optional(),
        desktop: z.boolean().optional(),
        email: z.boolean().optional(),
      }).optional(),
      privacy: z.object({
        lastSeen: z.enum(["everyone", "contacts", "nobody"]).optional(),
        profilePhoto: z.enum(["everyone", "contacts", "nobody"]).optional(),
        readReceipts: z.boolean().optional(),
      }).optional(),
      theme: z.enum(["dark", "light", "system"]).optional(),
    }).optional(),
  }),
});

// Controllers
export const signup = [
  validate(signupSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.signup(req.body);
    authService.setTokenCookies(res, result);

    // Send welcome email (non-blocking)
    try {
      await sendWelcomeEmail(result.user.email, result.user.fullName, config.client.url);
    } catch (err) {
      logger.warn(`Failed to send welcome email to ${result.user.email}:`, err.message);
    }

    res.status(201).json({
      success: true,
      data: { user: result.user },
    });
  }),
];

export const login = [
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.login(req.body);
    authService.setTokenCookies(res, result);

    res.status(200).json({
      success: true,
      data: { user: result.user },
    });
  }),
];

export const logout = asyncHandler(async (req, res) => {
  if (req.user) {
    await authService.logout(req.user._id);
  }
  authService.clearTokenCookies(res);

  res.status(200).json({
    success: true,
    data: { message: "Logged out successfully" },
  });
});

export const refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken;
  const result = await authService.refreshToken(token);
  authService.setTokenCookies(res, result);

  res.status(200).json({
    success: true,
    data: { message: "Token refreshed" },
  });
});

export const checkAuth = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: { user: req.user },
  });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const user = await authService.verifyEmail(token);

  res.status(200).json({
    success: true,
    data: { message: "Email verified successfully", user },
  });
});

export const forgotPassword = [
  validate(forgotPasswordSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.forgotPassword(req.body.email);

    // If there's a reset token, send the email (non-blocking)
    if (result.resetToken) {
      try {
        const resetUrl = `${config.client.url}/reset-password/${result.resetToken}`;
        logger.info(`Password reset URL generated for ${result.email}: ${resetUrl}`);
        // Email sending would go here
      } catch (err) {
        logger.warn("Failed to send reset email:", err.message);
      }
    }

    // Always return the same message (don't reveal if email exists)
    res.status(200).json({
      success: true,
      data: { message: "If that email exists, a password reset link has been sent" },
    });
  }),
];

export const resetPassword = [
  validate(resetPasswordSchema),
  asyncHandler(async (req, res) => {
    const { token, password } = req.body;
    await authService.resetPassword(token, password);

    res.status(200).json({
      success: true,
      data: { message: "Password reset successfully. Please login with your new password." },
    });
  }),
];

export const updateProfile = [
  validate(updateProfileSchema),
  asyncHandler(async (req, res) => {
    // Handle profile pic upload via Cloudinary
    if (req.body.profilePic && req.body.profilePic.startsWith("data:")) {
      const cloudinary = (await import("../config/cloudinary.js")).default;
      const uploadResponse = await cloudinary.uploader.upload(req.body.profilePic, {
        folder: "chatify/avatars",
        transformation: [{ width: 400, height: 400, crop: "fill", quality: "auto" }],
      });
      req.body.profilePic = uploadResponse.secure_url;
    }

    const user = await authService.updateProfile(req.user._id, req.body);

    res.status(200).json({
      success: true,
      data: { user },
    });
  }),
];

export const googleCallback = asyncHandler(async (req, res) => {
  const { email, displayName, id, photos } = req.user;

  const result = await authService.googleAuth({
    email,
    fullName: displayName,
    providerId: id,
    profilePic: photos?.[0]?.value || "",
  });

  authService.setTokenCookies(res, result);

  // Redirect to frontend
  res.redirect(config.client.url);
});
