import { Router, Request, Response } from 'express'
import { RestaurantSettings } from '../models/RestaurantSettings.js'

export const publicSettingsRouter = Router()

/**
 * GET /api/settings
 * Public endpoint returning active restaurant operational details and public branding.
 * Accessible by both guests and authenticated customers.
 */
publicSettingsRouter.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    let settings = await RestaurantSettings.findOne()
    if (!settings) {
      settings = await RestaurantSettings.create({
        restaurantName: 'BiteFlow',
        contactPhone: '+252-61xxxxxxx',
        contactEmail: 'kitchen@biteflow.com',
        operatingHours: '6:00 AM – 11:30 PM',
        restaurantStatus: 'OPEN',
        deliveryNotice: 'Free delivery on all orders within local delivery zones.',
        isDeliveryActive: true,
        currency: 'USD',
      })
    }

    res.json({
      success: true,
      settings: {
        restaurantName: settings.restaurantName,
        contactPhone: settings.contactPhone,
        contactEmail: settings.contactEmail,
        operatingHours: settings.operatingHours,
        restaurantStatus: settings.restaurantStatus,
        deliveryNotice: settings.deliveryNotice,
        isDeliveryActive: settings.isDeliveryActive,
        currency: settings.currency || 'USD',
      },
    })
  } catch (error) {
    console.error('[GET /api/settings] Error:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch restaurant settings' })
  }
})
