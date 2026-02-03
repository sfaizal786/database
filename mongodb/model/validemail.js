import mongoose from "mongoose";

const ValidatedEmailSchema = new mongoose.Schema(
  {
    
    email: {
      type: String,
      required: true,
      unique: true
    },

    status: {
      type: Boolean,
      default: true
    },

    smtpCode: {
      type: Number,
      default: 250
    },

    validatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { versionKey: false }
);

export const ValidatedEmail =
  mongoose.models.ValidatedEmail ||
  mongoose.model("ValidatedEmail", ValidatedEmailSchema);
