import mongoose, { Schema, Document, Types } from 'mongoose'
import { ICategory } from './Category.js'

export interface IProduct extends Document {
  name: string
  description: string
  price: number
  image: string
  category: Types.ObjectId | ICategory
  isAvailable: boolean
  createdAt: Date
  updatedAt: Date
}

const ProductSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      minlength: [2, 'Product name must be at least 2 characters'],
      maxlength: [100, 'Product name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
      trim: true,
      default: '',
    },
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: [0, 'Price must be a positive number or zero'],
    },
    image: {
      type: String,
      trim: true,
      default: '/delicious-burger.jpg',
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Product must belong to a category'],
      index: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
)

export const Product = mongoose.model<IProduct>('Product', ProductSchema)
