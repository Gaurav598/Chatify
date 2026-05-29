import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["direct", "group"],
      required: true,
      default: "direct",
    },
    participants: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      role: {
        type: String,
        enum: ["member", "admin", "owner"],
        default: "member",
      },
      joinedAt: {
        type: Date,
        default: Date.now,
      },
      lastReadAt: {
        type: Date,
        default: Date.now,
      },
      isMuted: {
        type: Boolean,
        default: false,
      },
      mutedUntil: Date,
    }],
    // Group-specific fields
    groupInfo: {
      name: {
        type: String,
        maxlength: [100, "Group name cannot exceed 100 characters"],
        trim: true,
      },
      description: {
        type: String,
        maxlength: [500, "Group description cannot exceed 500 characters"],
        trim: true,
      },
      avatar: String,
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },
    // Last message for sidebar preview
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    // Pinned messages
    pinnedMessages: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    }],
    // Metadata
    messageCount: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
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

// Indexes
conversationSchema.index({ "participants.userId": 1 });
conversationSchema.index({ type: 1, "participants.userId": 1 });
conversationSchema.index({ lastMessageAt: -1 });
conversationSchema.index({ isActive: 1 });

// Ensure direct conversations are unique between two users
conversationSchema.index(
  { type: 1, "participants.userId": 1 },
  { unique: true, partialFilterExpression: { type: "direct" } }
);

// Instance methods
conversationSchema.methods.isParticipant = function (userId) {
  return this.participants.some(
    (p) => p.userId.toString() === userId.toString()
  );
};

conversationSchema.methods.getParticipant = function (userId) {
  return this.participants.find(
    (p) => p.userId.toString() === userId.toString()
  );
};

conversationSchema.methods.isAdmin = function (userId) {
  const participant = this.getParticipant(userId);
  return participant && (participant.role === "admin" || participant.role === "owner");
};

conversationSchema.methods.getOtherParticipants = function (userId) {
  return this.participants.filter(
    (p) => p.userId.toString() !== userId.toString()
  );
};

// Static method to find or create a direct conversation
conversationSchema.statics.findOrCreateDirect = async function (userId1, userId2) {
  let conversation = await this.findOne({
    type: "direct",
    "participants.userId": { $all: [userId1, userId2] },
    "participants": { $size: 2 },
  });

  if (!conversation) {
    conversation = await this.create({
      type: "direct",
      participants: [
        { userId: userId1, role: "member" },
        { userId: userId2, role: "member" },
      ],
    });
  }

  return conversation;
};

const Conversation = mongoose.model("Conversation", conversationSchema);

export default Conversation;
