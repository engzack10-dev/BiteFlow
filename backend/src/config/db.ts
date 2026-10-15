import mongoose from 'mongoose'

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/biteflow'
  try {
    await mongoose.connect(uri)
    const sanitizedUri = uri.replace(/\/\/[^@]+@/, '//***:***@')
    console.log(`[MongoDB] Connected successfully to ${sanitizedUri}`)
  } catch (error) {
    console.error('[MongoDB] Connection error:', error)
    throw error
  }
}
