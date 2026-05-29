import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name must be at most 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email format"],
    },
    username: {
      type: String,
      unique: true,
      sparse: true, // allows null/undefined
      lowercase: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [30, "Username must be at most 30 characters"],
      match: [/^[a-z0-9_]+$/, "Username can only contain lowercase letters, numbers, and underscores"],
    },
    password: {
      type: String,
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // never return password by default
    },
    profilePic: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
      maxlength: [200, "Bio must be at most 200 characters"],
      default: "",
    },
    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer_not_to_say"],
    },

    // Authentication
    role: {
      type: String,
      enum: ["user", "moderator", "admin"],
      default: "user",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: String,
    verificationTokenExpiry: Date,
    resetPasswordToken: String,
    resetPasswordExpiry: Date,
    refreshToken: {
      type: String,
      select: false,
    },

    // OAuth
    provider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    providerId: String,

    // Presence
    status: {
      type: String,
      enum: ["online", "offline", "away", "dnd"],
      default: "offline",
    },
    customStatus: {
      text: { type: String, maxlength: 100, default: "" },
      emoji: { type: String, default: "" },
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },

    // Social
    contacts: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
    blockedUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],

    // Settings
    settings: {
      notifications: {
        sound: { type: Boolean, default: true },
        desktop: { type: Boolean, default: true },
        email: { type: Boolean, default: false },
      },
      privacy: {
        lastSeen: { type: String, enum: ["everyone", "contacts", "nobody"], default: "everyone" },
        profilePhoto: { type: String, enum: ["everyone", "contacts", "nobody"], default: "everyone" },
        readReceipts: { type: Boolean, default: true },
      },
      theme: {
        type: String,
        enum: ["dark", "light", "system"],
        default: "dark",
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.password;
        delete ret.refreshToken;
        delete ret.verificationToken;
        delete ret.verificationTokenExpiry;
        delete ret.resetPasswordToken;
        delete ret.resetPasswordExpiry;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ fullName: "text", username: "text" });
userSchema.index({ status: 1 });
userSchema.index({ "contacts": 1 });

// Pre-save password hashing
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Instance methods
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.isBlocked = function (userId) {
  return this.blockedUsers.some(
    (id) => id.toString() === userId.toString()
  );
};

userSchema.methods.isContact = function (userId) {
  return this.contacts.some(
    (id) => id.toString() === userId.toString()
  );
};

const User = mongoose.model("User", userSchema);

export default User;
