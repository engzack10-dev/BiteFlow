import mongoose, { Schema, Document } from 'mongoose'

export type UserRole = 'customer' | 'admin'

export interface IUser extends Document {
  clerkId: string
  email: string
  name: string
  role: UserRole
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<IUser>(
  {
    clerkId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      default: '',
    },
    role: {
      type: String,
      enum: ['customer', 'admin'],
      default: 'customer',
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

export const User = mongoose.model<IUser>('User', UserSchema)
