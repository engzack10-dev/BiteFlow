import { Router, Response } from 'express'
import { clerkClient } from '@clerk/express'
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js'
import { User, UserRole } from '../models/User.js'

export const authRouter = Router()

/**
 * GET /api/auth/me
 * Returns current authenticated user and server-verified role.
 */
authRouter.get(
  '/me',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const clerkId = req.auth!.userId

      let user = await User.findOne({ clerkId })

      // If user not in MongoDB, sync now
      if (!user) {
        let email = ''
        let name = ''

        try {
          const clerkUser = await clerkClient.users.getUser(clerkId)
          email = clerkUser.emailAddresses[0]?.emailAddress || ''
          name = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || clerkUser.username || ''
        } catch (err) {
          console.error('[auth/me] Error fetching Clerk user details:', err)
        }

        const adminEmails = (process.env.ADMIN_EMAILS || '')
          .split(',')
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean)

        const isInitialAdmin = email && adminEmails.includes(email.toLowerCase())
        const assignedRole: UserRole = isInitialAdmin ? 'admin' : 'customer'

        user = await User.create({
          clerkId,
          email: email || `${clerkId}@biteflow.local`,
          name,
          role: assignedRole,
        })
      }

      res.json({
        user: {
          clerkId: user.clerkId,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.createdAt,
        },
      })
    } catch (error) {
      console.error('[auth/me] Error:', error)
      res.status(500).json({ error: 'Failed to retrieve authenticated user profile' })
    }
  }
)

/**
 * POST /api/auth/sync
 * Syncs user data from client/Clerk and returns server-verified user record.
 */
authRouter.post(
  '/sync',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const clerkId = req.auth!.userId

      let email = ''
      let name = ''

      try {
        const clerkUser = await clerkClient.users.getUser(clerkId)
        email = clerkUser.emailAddresses[0]?.emailAddress || ''
        name = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || clerkUser.username || ''
      } catch (err) {
        console.error('[auth/sync] Error fetching Clerk user details:', err)
      }

      const adminEmails = (process.env.ADMIN_EMAILS || '')
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)

      const isInitialAdmin = email && adminEmails.includes(email.toLowerCase())

      let user = await User.findOne({ clerkId })

      if (!user) {
        user = await User.create({
          clerkId,
          email: email || `${clerkId}@biteflow.local`,
          name,
          role: isInitialAdmin ? 'admin' : 'customer',
        })
      } else {
        // Update name and email if available, but NEVER allow client to change role
        if (email) user.email = email
        if (name) user.name = name
        // Promote to admin if newly added to ADMIN_EMAILS
        if (isInitialAdmin && user.role !== 'admin') {
          user.role = 'admin'
        }
        await user.save()
      }

      res.json({
        success: true,
        user: {
          clerkId: user.clerkId,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      })
    } catch (error) {
      console.error('[auth/sync] Error:', error)
      res.status(500).json({ error: 'Failed to synchronize authenticated user' })
    }
  }
)
