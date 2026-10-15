import mongoose, { Schema, Document, Types } from 'mongoose'

export type PaymentStatus = 'PENDING' | 'VERIFIED' | 'REJECTED'

export type PaymentAuditAction = 'SUBMITTED' | 'VERIFIED' | 'REJECTED'

export interface IPaymentAudit {
  action: PaymentAuditAction
  previousStatus: PaymentStatus | null
  newStatus: PaymentStatus
  actorId: string
  actorRole: 'customer' | 'admin'
  actorEmail?: string
  timestamp: Date
  note?: string
}

export interface IPayment extends Document {
  paymentNumber: string
  orderId: Types.ObjectId
  orderNumber: string
  clerkId: string
  customerName: string
  customerEmail?: string
  amount: number
  currency: string
  status: PaymentStatus
  paymentMethod: string
  customerNote?: string
  submittedAt: Date
  verifiedAt?: Date
  verifiedBy?: string
  rejectedAt?: Date
  rejectedBy?: string
  rejectionReason?: string
  auditHistory: IPaymentAudit[]
  createdAt: Date
  updatedAt: Date
}

const PaymentAuditSchema = new Schema<IPaymentAudit>(
  {
    action: {
      type: String,
      enum: ['SUBMITTED', 'VERIFIED', 'REJECTED'],
      required: true,
    },
    previousStatus: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'REJECTED', null],
      default: null,
    },
    newStatus: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'REJECTED'],
      required: true,
    },
    actorId: {
      type: String,
      required: true,
    },
    actorRole: {
      type: String,
      enum: ['customer', 'admin'],
      required: true,
    },
    actorEmail: {
      type: String,
      default: '',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    note: {
      type: String,
      default: '',
    },
  },
  { _id: false }
)

const PaymentSchema = new Schema<IPayment>(
  {
    paymentNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    orderNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    clerkId: {
      type: String,
      required: true,
      index: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    customerEmail: {
      type: String,
      trim: true,
      default: '',
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'USD',
      trim: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
    paymentMethod: {
      type: String,
      default: 'MANUAL_VERIFICATION',
      trim: true,
    },
    customerNote: {
      type: String,
      trim: true,
      maxlength: 300,
      default: '',
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    verifiedAt: {
      type: Date,
    },
    verifiedBy: {
      type: String,
      trim: true,
    },
    rejectedAt: {
      type: Date,
    },
    rejectedBy: {
      type: String,
      trim: true,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    auditHistory: {
      type: [PaymentAuditSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
)

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema)
