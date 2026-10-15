import { Request, Response, NextFunction } from 'express'
import { getAuth, clerkClient } from '@clerk/express'
import { User, IUser, UserRole } from '../models/User.js'

export interface AuthenticatedRequest extends Request {
  user?: IUser
  auth?: any
}

export function resolveClerkAuth(req: Request) {
  try {
    if (process.env.NODE_ENV !== 'production' && req.headers['x-test-user-id']) {
      return {
        userId: req.headers['x-test-user-id'] as string,
        sessionId: 'test-session',
      }
    }
    if (typeof (req as any).auth === 'function') {
      return getAuth(req)
    }
    if ((req as any).auth && typeof (req as any).auth === 'object') {
      return (req as any).auth
    }
    return getAuth(req)
  } catch (err) {
    console.error('[auth] Error resolving Clerk auth from request:', err)
    return null
  }
}

/**
 * Middleware ensuring a valid Clerk session exists.
 * Returns 401 if unauthenticated.
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const auth = resolveClerkAuth(req)

  if (!auth || !auth.userId) {
    res.status(401).json({
      error: 'Unauthorized: Authentication token is missing or invalid',
    })
    return
  }

  // Preserve req.auth function if Clerk attached it, so subsequent middleware
  // (e.g. requireRole) calling getAuth(req) does not throw "req.auth is not a function".
  if (typeof (req as any).auth === 'function') {
    ;(req as any).auth.userId = auth.userId
    ;(req as any).auth.sessionId = auth.sessionId ?? undefined
  } else {
    req.auth = {
      userId: auth.userId,
      sessionId: auth.sessionId ?? undefined,
    }
  }

  next()
}

/**
 * Middleware ensuring the authenticated user has one of the allowed roles.
 * Returns 401 if unauthenticated, 403 if role check fails.
 */
export function requireRole(allowedRoles: UserRole[]) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const auth = resolveClerkAuth(req)

    if (!auth || !auth.userId) {
      res.status(401).json({
        error: 'Unauthorized: Authentication token is missing or invalid',
      })
      return
    }

    try {
      // Find user in database by clerkId
      let user = await User.findOne({ clerkId: auth.userId })

      // Auto-sync user if not yet in database
      if (!user) {
        let email = ''
        let name = ''

        try {
          const clerkUser = await clerkClient.users.getUser(auth.userId)
          email = clerkUser.emailAddresses[0]?.emailAddress || ''
          name = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || clerkUser.username || ''
        } catch {
          // If Clerk user fetch fails, continue with fallback
        }

        const adminEmails = (process.env.ADMIN_EMAILS || '')
          .split(',')
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean)

        const isInitialAdmin = email && adminEmails.includes(email.toLowerCase())
        const assignedRole: UserRole = isInitialAdmin ? 'admin' : 'customer'

        user = await User.create({
          clerkId: auth.userId,
          email: email || `${auth.userId}@biteflow.local`,
          name,
          role: assignedRole,
        })
      }

      if (!allowedRoles.includes(user.role)) {
        res.status(403).json({
          error: 'Forbidden: Insufficient privileges for this operation',
          requiredRoles: allowedRoles,
          currentRole: user.role,
        })
        return
      }

      req.user = user
      next()
    } catch (error) {
      console.error('[requireRole] Error resolving user role:', error)
      res.status(500).json({ error: 'Internal server error validating role' })
    }
  }
}
