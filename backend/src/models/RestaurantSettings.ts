import mongoose, { Schema, Document } from 'mongoose'

export type RestaurantOperationalStatus = 'OPEN' | 'CLOSED' | 'BUSY'

export interface IRestaurantSettings extends Document {
  restaurantName: string
  contactPhone: string
  contactEmail: string
  operatingHours: string
  restaurantStatus: RestaurantOperationalStatus
  deliveryNotice: string
  isDeliveryActive: boolean
  currency: string
  updatedBy?: string
  createdAt: Date
  updatedAt: Date
}

const RestaurantSettingsSchema = new Schema<IRestaurantSettings>(
  {
    restaurantName: {
      type: String,
      required: [true, 'Restaurant name is required'],
      trim: true,
      default: 'BiteFlow',
    },
    contactPhone: {
      type: String,
      required: [true, 'Contact phone is required'],
      trim: true,
      default: '+252-61xxxxxxx',
    },
    contactEmail: {
      type: String,
      required: [true, 'Contact email is required'],
      trim: true,
      default: 'kitchen@biteflow.com',
    },
    operatingHours: {
      type: String,
      required: [true, 'Operating hours are required'],
      trim: true,
      default: '6:00 AM – 11:30 PM',
    },
    restaurantStatus: {
      type: String,
      enum: ['OPEN', 'CLOSED', 'BUSY'],
      default: 'OPEN',
    },
    deliveryNotice: {
      type: String,
      trim: true,
      default: 'Free delivery on all orders within local delivery zones.',
    },
    isDeliveryActive: {
      type: Boolean,
      default: true,
    },
    currency: {
      type: String,
      trim: true,
      default: 'USD',
    },
    updatedBy: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

export const RestaurantSettings =
  mongoose.models.RestaurantSettings ||
  mongoose.model<IRestaurantSettings>('RestaurantSettings', RestaurantSettingsSchema)
