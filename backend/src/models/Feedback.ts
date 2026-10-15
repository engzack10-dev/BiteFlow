import mongoose, { Schema, Document } from 'mongoose'

export type FeedbackStatus = 'PENDING' | 'REVIEWED' | 'ARCHIVED'

export interface IFeedback extends Document {
  name: string
  email: string
  phone?: string
  subject: string
  message: string
  status: FeedbackStatus
  clerkId?: string
  reviewedBy?: string
  reviewedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const FeedbackSchema = new Schema<IFeedback>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
      minlength: [2, 'Subject must be at least 2 characters'],
      maxlength: [150, 'Subject cannot exceed 150 characters'],
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      minlength: [5, 'Message must be at least 5 characters'],
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },
    status: {
      type: String,
      enum: ['PENDING', 'REVIEWED', 'ARCHIVED'],
      default: 'PENDING',
      index: true,
    },
    clerkId: {
      type: String,
      default: null,
      index: true,
    },
    reviewedBy: {
      type: String,
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

export const Feedback =
  mongoose.models.Feedback || mongoose.model<IFeedback>('Feedback', FeedbackSchema)

