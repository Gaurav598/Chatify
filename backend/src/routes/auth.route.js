import express from "express";
import {
  signup, login, logout, refreshToken, checkAuth,
  verifyEmail, forgotPassword, resetPassword,
  updateProfile, googleCallback,
} from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// Public routes
router.post("/signup", ...signup);
router.post("/login", ...login);
router.post("/logout", logout);
router.post("/refresh", refreshToken);
router.get("/verify-email/:token", verifyEmail);
router.post("/forgot-password", ...forgotPassword);
router.post("/reset-password", ...resetPassword);

// Protected routes
router.get("/check", protectRoute, checkAuth);
router.put("/update-profile", protectRoute, ...updateProfile);

// Google OAuth (structure — requires passport setup)
// router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));
// router.get("/google/callback", passport.authenticate("google", { session: false }), googleCallback);

export default router;
