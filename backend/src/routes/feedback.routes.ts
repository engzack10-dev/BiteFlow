import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { Feedback } from '../models/Feedback.js'
import { RestaurantSettings } from '../models/RestaurantSettings.js'
import { resolveClerkAuth } from '../middleware/auth.js'

export const publicFeedbackRouter = Router()

// In-memory sliding rate limiter: max 10 submissions per 10 minutes per IP
const feedbackRateLimits = new Map<string, number[]>()
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000 // 10 minutes
const MAX_SUBMISSIONS_PER_WINDOW = 10

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const timestamps = (feedbackRateLimits.get(ip) || []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  )
  if (timestamps.length >= MAX_SUBMISSIONS_PER_WINDOW) {
    return true
  }
  timestamps.push(now)
  feedbackRateLimits.set(ip, timestamps)
  return false
}

export const createFeedbackSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters'),
  email: z
    .string()
    .trim()
    .email('Please enter a valid email address')
    .max(150, 'Email cannot exceed 150 characters'),
  phone: z
    .string()
    .trim()
    .max(30, 'Phone cannot exceed 30 characters')
    .optional()
    .or(z.literal('')),
  subject: z
    .string()
    .trim()
    .min(2, 'Subject must be at least 2 characters')
    .max(150, 'Subject cannot exceed 150 characters'),
  message: z
    .string()
    .trim()
    .min(5, 'Message must be at least 5 characters')
    .max(2000, 'Message cannot exceed 2000 characters'),
})

/**
 * POST /api/feedback
 * Public endpoint for customers to submit inquiries and feedback.
 */
publicFeedbackRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    // Abuse-prevention check (bypassed in test environment or with test headers)
    const isTest =
      process.env.NODE_ENV === 'test' ||
      Boolean(req.headers['x-test-bypass-rate-limit']) ||
      Boolean(req.headers['x-test-user-id'])
    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      '127.0.0.1'

    if (!isTest && isRateLimited(clientIp)) {
      res.status(429).json({
        success: false,
        error: 'Too many submissions from your connection. Please wait before submitting again.',
      })
      return
    }

    const parseResult = createFeedbackSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: parseResult.error.issues[0]?.message || 'Invalid feedback payload',
      })
      return
    }

    const { name, email, phone, subject, message } = parseResult.data

    // Check if an authenticated user session is attached
    const auth = resolveClerkAuth(req)
    const clerkId = auth?.userId ? auth.userId : null

    const feedback = await Feedback.create({
      name,
      email,
      phone: phone || '',
      subject,
      message,
      status: 'PENDING',
      clerkId,
    })

    res.status(201).json({
      success: true,
      message: 'Thank you for your feedback! Our team has received your message.',
      feedbackId: feedback._id,
    })
  } catch (error) {
    console.error('[POST /api/feedback] Error:', error)
    res.status(500).json({ success: false, error: 'Failed to submit feedback' })
  }
})

export { publicSettingsRouter } from './settings.routes.js'

