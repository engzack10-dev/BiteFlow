import mongoose, { Schema, Document, Types } from 'mongoose'

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'DISPATCHED'
  | 'DELIVERED'

export type PaymentStatus = 'PENDING' | 'VERIFIED' | 'REJECTED'

export interface IOrderStatusHistory {
  previousStatus: OrderStatus | null
  newStatus: OrderStatus
  timestamp: Date
  actorId: string
  actorRole: 'admin' | 'customer' | 'system'
  actorEmail?: string
  note?: string
}

export interface IOrderItem {
  productId: Types.ObjectId
  name: string
  image: string
  unitPrice: number
  quantity: number
  subtotal: number
}

export interface IOrder extends Document {
  orderNumber: string
  clerkId: string
  customerName: string
  customerEmail?: string
  customerPhone: string
  deliveryAddress: string
  deliveryArea: string
  deliveryInstructions?: string
  items: IOrderItem[]
  subtotal: number
  deliveryFee: number
  totalAmount: number
  status: OrderStatus
  paymentStatus: PaymentStatus
  paymentId?: Types.ObjectId
  paymentRejectionReason?: string
  statusHistory: IOrderStatusHistory[]
  dispatchedAt?: Date
  deliveredAt?: Date
  dispatchedBy?: string
  deliveredBy?: string
  createdAt: Date
  updatedAt: Date
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      default: '/delicious-burger.jpg',
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
)

const OrderStatusHistorySchema = new Schema<IOrderStatusHistory>(
  {
    previousStatus: {
      type: String,
      enum: ['PENDING_PAYMENT', 'CONFIRMED', 'PREPARING', 'READY', 'DISPATCHED', 'DELIVERED', null],
      default: null,
    },
    newStatus: {
      type: String,
      enum: ['PENDING_PAYMENT', 'CONFIRMED', 'PREPARING', 'READY', 'DISPATCHED', 'DELIVERED'],
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
    actorId: {
      type: String,
      required: true,
    },
    actorRole: {
      type: String,
      enum: ['admin', 'customer', 'system'],
      required: true,
    },
    actorEmail: {
      type: String,
      trim: true,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 300,
    },
  },
  { _id: false }
)

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
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
      required: [true, 'Customer name is required'],
      trim: true,
      maxlength: 100,
    },
    customerEmail: {
      type: String,
      trim: true,
      default: '',
    },
    customerPhone: {
      type: String,
      required: [true, 'Contact phone number is required'],
      trim: true,
      maxlength: 25,
    },
    deliveryAddress: {
      type: String,
      required: [true, 'Delivery address is required'],
      trim: true,
      maxlength: 250,
    },
    deliveryArea: {
      type: String,
      required: [true, 'Delivery area is required'],
      trim: true,
      maxlength: 100,
    },
    deliveryInstructions: {
      type: String,
      trim: true,
      maxlength: 300,
      default: '',
    },
    items: {
      type: [OrderItemSchema],
      required: true,
      validate: [(val: IOrderItem[]) => val.length > 0, 'Order must contain at least one item'],
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    deliveryFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['PENDING_PAYMENT', 'CONFIRMED', 'PREPARING', 'READY', 'DISPATCHED', 'DELIVERED'],
      default: 'PENDING_PAYMENT',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
    },
    paymentRejectionReason: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    statusHistory: {
      type: [OrderStatusHistorySchema],
      default: [],
    },
    dispatchedAt: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
    },
    dispatchedBy: {
      type: String,
      trim: true,
    },
    deliveredBy: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
)

// Index for date filtering and status queries
OrderSchema.index({ createdAt: -1 })
OrderSchema.index({ status: 1, createdAt: -1 })

export const Order = mongoose.model<IOrder>('Order', OrderSchema)
