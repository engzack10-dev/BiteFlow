import { Router, Request, Response } from 'express'
import { z } from 'zod'
import mongoose from 'mongoose'
import { Product } from '../models/Product.js'
import { Category } from '../models/Category.js'
import { requireRole } from '../middleware/auth.js'

export const productRouter = Router()

const createProductSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  description: z.string().trim().min(2, 'Description must be at least 2 characters'),
  price: z.number().min(0, 'Price must be 0 or greater'),
  image: z.string().trim().optional(),
  category: z.string().trim(),
  isAvailable: z.boolean().optional(),
})

const updateProductSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().min(2).optional(),
  price: z.number().min(0).optional(),
  image: z.string().trim().optional(),
  category: z.string().trim().optional(),
  isAvailable: z.boolean().optional(),
})

const toggleAvailabilitySchema = z.object({
  isAvailable: z.boolean(),
})

/**
 * GET /api/products
 * Public: retrieves products with optional category and availability filtering.
 */
productRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, availableOnly } = req.query
    const filter: Record<string, unknown> = {}

    if (category && mongoose.Types.ObjectId.isValid(category as string)) {
      filter.category = category
    }

    if (availableOnly === 'true') {
      filter.isAvailable = true
    }

    const products = await Product.find(filter)
      .populate('category', 'name description isActive')
      .sort({ createdAt: -1 })

    res.json({ products })
  } catch (error) {
    console.error('[GET /api/products] Error:', error)
    res.status(500).json({ error: 'Failed to fetch products' })
  }
})

/**
 * GET /api/products/:id
 * Public: retrieves product by ID.
 */
productRouter.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: 'Invalid product ID' })
      return
    }

    const product = await Product.findById(id).populate('category', 'name description isActive')
    if (!product) {
      res.status(404).json({ error: 'Product not found' })
      return
    }

    res.json({ product })
  } catch (error) {
    console.error('[GET /api/products/:id] Error:', error)
    res.status(500).json({ error: 'Failed to fetch product' })
  }
})

/**
 * POST /api/products
 * Admin-only: creates a new product under a valid category.
 */
productRouter.post(
  '/',
  requireRole(['admin']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const parseResult = createProductSchema.safeParse(req.body)
      if (!parseResult.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: parseResult.error.format(),
        })
        return
      }

      const { name, description, price, image, category: categoryId, isAvailable } = parseResult.data

      // Validate category ID format
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        res.status(400).json({ error: 'Invalid category ID format' })
        return
      }

      // Ensure category actually exists
      const categoryExists = await Category.findById(categoryId)
      if (!categoryExists) {
        res.status(404).json({ error: 'Referenced category does not exist' })
        return
      }

      const product = await Product.create({
        name,
        description,
        price,
        image: image || '/delicious-burger.jpg',
        category: categoryId,
        isAvailable: isAvailable ?? true,
      })

      const populatedProduct = await Product.findById(product._id).populate(
        'category',
        'name description isActive'
      )

      res.status(201).json({
        success: true,
        product: populatedProduct,
      })
    } catch (error) {
      console.error('[POST /api/products] Error:', error)
      res.status(500).json({ error: 'Failed to create product' })
    }
  }
)

/**
 * PATCH /api/products/:id
 * Admin-only: updates product fields.
 */
productRouter.patch(
  '/:id',
  requireRole(['admin']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Invalid product ID' })
        return
      }

      const parseResult = updateProductSchema.safeParse(req.body)
      if (!parseResult.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: parseResult.error.format(),
        })
        return
      }

      const product = await Product.findById(id)
      if (!product) {
        res.status(404).json({ error: 'Product not found' })
        return
      }

      const { name, description, price, image, category: categoryId, isAvailable } = parseResult.data

      if (categoryId) {
        if (!mongoose.Types.ObjectId.isValid(categoryId)) {
          res.status(400).json({ error: 'Invalid category ID format' })
          return
        }
        const categoryExists = await Category.findById(categoryId)
        if (!categoryExists) {
          res.status(404).json({ error: 'Referenced category does not exist' })
          return
        }
        product.category = new mongoose.Types.ObjectId(categoryId)
      }

      if (name !== undefined) product.name = name
      if (description !== undefined) product.description = description
      if (price !== undefined) product.price = price
      if (image !== undefined) product.image = image
      if (isAvailable !== undefined) product.isAvailable = isAvailable

      await product.save()

      const populatedProduct = await Product.findById(product._id).populate(
        'category',
        'name description isActive'
      )

      res.json({
        success: true,
        product: populatedProduct,
      })
    } catch (error) {
      console.error('[PATCH /api/products/:id] Error:', error)
      res.status(500).json({ error: 'Failed to update product' })
    }
  }
)

/**
 * PATCH /api/products/:id/availability
 * Admin-only: quick toggle for product availability.
 */
productRouter.patch(
  '/:id/availability',
  requireRole(['admin']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Invalid product ID' })
        return
      }

      const parseResult = toggleAvailabilitySchema.safeParse(req.body)
      if (!parseResult.success) {
        res.status(400).json({ error: 'Field "isAvailable" (boolean) is required' })
        return
      }

      const product = await Product.findById(id)
      if (!product) {
        res.status(404).json({ error: 'Product not found' })
        return
      }

      product.isAvailable = parseResult.data.isAvailable
      await product.save()

      res.json({
        success: true,
        message: `Product "${product.name}" is now ${product.isAvailable ? 'available' : 'unavailable'}`,
        product,
      })
    } catch (error) {
      console.error('[PATCH /api/products/:id/availability] Error:', error)
      res.status(500).json({ error: 'Failed to update product availability' })
    }
  }
)

/**
 * DELETE /api/products/:id
 * Admin-only: deletes a product.
 */
productRouter.delete(
  '/:id',
  requireRole(['admin']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Invalid product ID' })
        return
      }

      const product = await Product.findByIdAndDelete(id)
      if (!product) {
        res.status(404).json({ error: 'Product not found' })
        return
      }

      res.json({
        success: true,
        message: `Product "${product.name}" deleted successfully`,
      })
    } catch (error) {
      console.error('[DELETE /api/products/:id] Error:', error)
      res.status(500).json({ error: 'Failed to delete product' })
    }
  }
)
