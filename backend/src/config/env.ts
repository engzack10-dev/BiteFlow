/**
 * Environment configuration and startup validation for BiteFlow backend.
 * Ensures required variables are present and fails fast with clear non-sensitive messages.
 */

export interface ValidatedEnv {
  PORT: number
  MONGODB_URI: string
  NODE_ENV: string
  CLERK_SECRET_KEY?: string
  CLERK_PUBLISHABLE_KEY?: string
  ADMIN_EMAILS: string[]
}

export function validateEnv(): ValidatedEnv {
  const nodeEnv = process.env.NODE_ENV || 'development'
  const port = parseInt(process.env.PORT || '5000', 10)

  if (isNaN(port) || port <= 0 || port > 65535) {
    throw new Error(`[Config Error] Invalid PORT environment variable: ${process.env.PORT}`)
  }

  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/biteflow'
  if (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
    throw new Error('[Config Error] MONGODB_URI must begin with mongodb:// or mongodb+srv://')
  }

  // In production, require CLERK_SECRET_KEY
  const clerkSecret = process.env.CLERK_SECRET_KEY
  if (nodeEnv === 'production' && !clerkSecret) {
    throw new Error('[Config Error] CLERK_SECRET_KEY is required in production environment')
  }

  const adminEmailsRaw = process.env.ADMIN_EMAILS || ''
  const adminEmails = adminEmailsRaw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)

  return {
    PORT: port,
    MONGODB_URI: mongoUri,
    NODE_ENV: nodeEnv,
    CLERK_SECRET_KEY: clerkSecret,
    CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY,
    ADMIN_EMAILS: adminEmails,
  }
}
