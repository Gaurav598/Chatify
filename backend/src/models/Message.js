import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // Message content
    type: {
      type: String,
      enum: ["text", "image", "video", "file", "voice", "system"],
      default: "text",
    },
    text: {
      type: String,
      trim: true,
      maxlength: [5000, "Message cannot exceed 5000 characters"],
    },
    // Media attachments
    media: {
      url: String,
      publicId: String, // Cloudinary public ID for deletion
      type: String, // MIME type
      name: String, // Original filename
      size: Number, // File size in bytes
      duration: Number, // For voice/video in seconds
      thumbnail: String, // For video thumbnails
    },
    // Reply
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    // Forward
    forwardedFrom: {
      messageId: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
      senderName: String,
    },
    // Reactions
    reactions: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      emoji: {
        type: String,
        required: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    }],
    // Read receipts
    readBy: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      readAt: {
        type: Date,
        default: Date.now,
      },
    }],
    // Mentions
    mentions: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
    // Status
    isPinned: {
      type: Boolean,
      default: false,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: Date,
    deletedAt: Date, // Soft delete
    deletedFor: [{ // Selective deletion
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound indexes for efficient querying
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ conversationId: 1, isPinned: 1 });
messageSchema.index({ senderId: 1, createdAt: -1 });
messageSchema.index({ text: "text" }); // Full-text search

// Virtual for checking if message is deleted
messageSchema.virtual("isDeleted").get(function () {
  return !!this.deletedAt;
});

// Method to check if message is deleted for a specific user
messageSchema.methods.isDeletedFor = function (userId) {
  if (this.deletedAt) return true;
  return this.deletedFor.some((id) => id.toString() === userId.toString());
};

// Pre-find middleware to exclude globally deleted messages
messageSchema.pre(/^find/, function () {
  if (!this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
});

const Message = mongoose.model("Message", messageSchema);

export default Message;
