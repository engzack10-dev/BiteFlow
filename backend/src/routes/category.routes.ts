import { Router, Request, Response } from 'express'
import { z } from 'zod'
import mongoose from 'mongoose'
import { Category } from '../models/Category.js'
import { Product } from '../models/Product.js'
import { requireRole } from '../middleware/auth.js'

export const categoryRouter = Router()

const createCategorySchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60),
  description: z.string().trim().optional(),
  isActive: z.boolean().optional(),
})

const updateCategorySchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  description: z.string().trim().optional(),
  isActive: z.boolean().optional(),
})

/**
 * GET /api/categories
 * Public: returns all categories with their product counts.
 */
categoryRouter.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const categories = await Category.find().sort({ name: 1 })

    // Include product count for each category
    const categoriesWithCount = await Promise.all(
      categories.map(async (cat) => {
        const productCount = await Product.countDocuments({ category: cat._id })
        return {
          ...cat.toObject(),
          productCount,
        }
      })
    )

    res.json({ categories: categoriesWithCount })
  } catch (error) {
    console.error('[GET /api/categories] Error:', error)
    res.status(500).json({ error: 'Failed to fetch categories' })
  }
})

/**
 * GET /api/categories/:id
 * Public: retrieves category by ID.
 */
categoryRouter.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: 'Invalid category ID' })
      return
    }

    const category = await Category.findById(id)
    if (!category) {
      res.status(404).json({ error: 'Category not found' })
      return
    }

    const productCount = await Product.countDocuments({ category: category._id })
    res.json({
      category: {
        ...category.toObject(),
        productCount,
      },
    })
  } catch (error) {
    console.error('[GET /api/categories/:id] Error:', error)
    res.status(500).json({ error: 'Failed to fetch category' })
  }
})

/**
 * POST /api/categories
 * Admin-only: creates a new category.
 */
categoryRouter.post(
  '/',
  requireRole(['admin']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const parseResult = createCategorySchema.safeParse(req.body)
      if (!parseResult.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: parseResult.error.format(),
        })
        return
      }

      const { name, description, isActive } = parseResult.data

      // Check for duplicate category name (case-insensitive)
      const existing = await Category.findOne({
        name: { $regex: new RegExp(`^${name}$`, 'i') },
      })

      if (existing) {
        res.status(409).json({ error: `A category named "${name}" already exists` })
        return
      }

      const category = await Category.create({
        name,
        description: description || '',
        isActive: isActive ?? true,
      })

      res.status(201).json({
        success: true,
        category: {
          ...category.toObject(),
          productCount: 0,
        },
      })
    } catch (error) {
      console.error('[POST /api/categories] Error:', error)
      res.status(500).json({ error: 'Failed to create category' })
    }
  }
)

/**
 * PATCH /api/categories/:id
 * Admin-only: updates an existing category.
 */
categoryRouter.patch(
  '/:id',
  requireRole(['admin']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Invalid category ID' })
        return
      }

      const parseResult = updateCategorySchema.safeParse(req.body)
      if (!parseResult.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: parseResult.error.format(),
        })
        return
      }

      const category = await Category.findById(id)
      if (!category) {
        res.status(404).json({ error: 'Category not found' })
        return
      }

      const { name, description, isActive } = parseResult.data

      if (name && name.toLowerCase() !== category.name.toLowerCase()) {
        const existing = await Category.findOne({
          _id: { $ne: category._id },
          name: { $regex: new RegExp(`^${name}$`, 'i') },
        })
        if (existing) {
          res.status(409).json({ error: `A category named "${name}" already exists` })
          return
        }
        category.name = name
      }

      if (description !== undefined) category.description = description
      if (isActive !== undefined) category.isActive = isActive

      await category.save()

      const productCount = await Product.countDocuments({ category: category._id })
      res.json({
        success: true,
        category: {
          ...category.toObject(),
          productCount,
        },
      })
    } catch (error) {
      console.error('[PATCH /api/categories/:id] Error:', error)
      res.status(500).json({ error: 'Failed to update category' })
    }
  }
)

/**
 * DELETE /api/categories/:id
 * Admin-only: deletes a category safely.
 * Rejects deletion if products are currently linked to this category.
 */
categoryRouter.delete(
  '/:id',
  requireRole(['admin']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Invalid category ID' })
        return
      }

      const category = await Category.findById(id)
      if (!category) {
        res.status(404).json({ error: 'Category not found' })
        return
      }

      // Safe deletion strategy: check for associated products
      const linkedProductCount = await Product.countDocuments({ category: id })
      if (linkedProductCount > 0) {
        res.status(400).json({
          error: `Cannot delete category "${category.name}" because it contains ${linkedProductCount} product(s). Please reassign or delete these products first.`,
          linkedProductCount,
        })
        return
      }

      await Category.findByIdAndDelete(id)

      res.json({
        success: true,
        message: `Category "${category.name}" deleted successfully`,
      })
    } catch (error) {
      console.error('[DELETE /api/categories/:id] Error:', error)
      res.status(500).json({ error: 'Failed to delete category' })
    }
  }
)
