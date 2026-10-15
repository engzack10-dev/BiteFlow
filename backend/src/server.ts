import dotenv from 'dotenv'
dotenv.config()

import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import { clerkMiddleware } from '@clerk/express'
import { connectDB } from './config/db.js'
import { validateEnv } from './config/env.js'
import { authRouter } from './routes/auth.routes.js'
import { adminRouter } from './routes/admin.routes.js'
import { orderRouter } from './routes/order.routes.js'
import { paymentRouter } from './routes/payment.routes.js'
import { categoryRouter } from './routes/category.routes.js'
import { productRouter } from './routes/product.routes.js'
import { publicFeedbackRouter } from './routes/feedback.routes.js'
import { publicSettingsRouter } from './routes/settings.routes.js'
import { seedInitialMenu, seedInitialSettings } from './config/seed.js'

// Validate environment configuration at boot
validateEnv()

const app = express()
const PORT = process.env.PORT || 5000

// 1. CORS Middleware
app.use(
  cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-test-user-id', 'x-test-bypass-rate-limit'],
  })
)

// 2. Body Parser
app.use(express.json())

// 3. Clerk Global Middleware (attaches auth context to req)
app.use(clerkMiddleware())

// 4. API Routes
app.get('/api/health', (_req: Request, res: Response) => {
  const isDbConnected = mongoose.connection.readyState === 1
  const statusCode = isDbConnected ? 200 : 503

  res.status(statusCode).json({
    status: isDbConnected ? 'ok' : 'degraded',
    service: 'BiteFlow API',
    database: isDbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  })
})

app.use('/api/auth', authRouter)
app.use('/api/admin', adminRouter)
app.use('/api/orders', orderRouter)
app.use('/api/payments', paymentRouter)
app.use('/api/categories', categoryRouter)
app.use('/api/products', productRouter)
app.use('/api/feedback', publicFeedbackRouter)
app.use('/api/settings', publicSettingsRouter)

// 5. Global Error Handler (Sanitizes errors, maps token errors to 401, never leaks sensitive stack traces)
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (
    err.status === 401 ||
    err.statusCode === 401 ||
    err.name === 'ClerkAuthError' ||
    err.message?.includes('token') ||
    err.message?.includes('jwt') ||
    err.message?.includes('Unexpected end of data')
  ) {
    res.status(401).json({
      error: 'Unauthorized: Authentication token is malformed or invalid',
    })
    return
  }

  console.error('[Unhandled Error]:', err.message)
  res.status(500).json({
    error: 'Internal server error occurred',
  })
})

// 6. Bootstrap Server
async function startServer() {
  try {
    await connectDB()
    await seedInitialSettings()
    await seedInitialMenu()
    app.listen(PORT, () => {
      console.log(`[BiteFlow Backend] Server running at http://localhost:${PORT}`)
    })
  } catch (error) {
    console.error('[BiteFlow Backend] Failed to start server:', error)
    process.exit(1)
  }
}

startServer()
