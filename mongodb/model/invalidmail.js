import mongoose from "mongoose";


const InvalidatedEmailSchema = new mongoose.Schema(
  {
    
    email: {
      type: String,
      required: true,
      unique: true
    },  
     name: {
      type: String,
      required: true,
     
    },
     domain: {
      type: String,
      required: true,
    },  

    status: {
      type: Boolean,
      default: false,
    },

    smtpCode: {
      type: Number,
      default: 550
    },

    validatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { versionKey: false }
);

export const InvalidatedEmail =
  mongoose.models.InvalidatedEmail ||
  mongoose.model("InvalidatedEmail", InvalidatedEmailSchema);