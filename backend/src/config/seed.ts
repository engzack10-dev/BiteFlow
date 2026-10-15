import { Category } from '../models/Category.js'
import { Product } from '../models/Product.js'
import { RestaurantSettings } from '../models/RestaurantSettings.js'

export async function seedInitialSettings(): Promise<void> {
  try {
    const settingsCount = await RestaurantSettings.countDocuments()
    if (settingsCount > 0) {
      return // Already initialized, never overwrite administrator changes
    }

    console.log('[Seed] Initializing default BiteFlow restaurant settings...')
    await RestaurantSettings.create({
      restaurantName: 'BiteFlow',
      contactPhone: '+252-61xxxxxxx',
      contactEmail: 'kitchen@biteflow.com',
      operatingHours: '6:00 AM – 11:30 PM',
      restaurantStatus: 'OPEN',
      deliveryNotice: 'Free delivery on all orders within local delivery zones.',
      isDeliveryActive: true,
      currency: 'USD',
      updatedBy: 'system',
    })
    console.log('[Seed] Restaurant settings initialization complete!')
  } catch (error) {
    console.error('[Seed] Failed to initialize restaurant settings:', error)
  }
}

export async function seedInitialMenu(): Promise<void> {
  try {
    const categoryCount = await Category.countDocuments()
    if (categoryCount > 0) {
      return // Already seeded
    }

    console.log('[Seed] Seeding initial BiteFlow categories and menu products...')

    const burgers = await Category.create({
      name: 'Burgers',
      description: 'Handcrafted gourmet burgers with premium ingredients',
      isActive: true,
    })

    const beverages = await Category.create({
      name: 'Beverages',
      description: 'Refreshing craft sodas, sparkling drinks, and cocktails',
      isActive: true,
    })

    const pizzas = await Category.create({
      name: 'Artisan Pizzas',
      description: 'Wood-fired sourdough pizzas with artisanal toppings',
      isActive: true,
    })

    const bowls = await Category.create({
      name: 'Bowls & Salads',
      description: 'Fresh organic greens, grain bowls, and seasonal proteins',
      isActive: true,
    })

    await Product.create([
      {
        name: 'Delicious Burger',
        description: 'Juicy grilled beef patty, melted aged cheddar, lettuce, fresh tomato, house aioli on toasted sesame bun.',
        price: 299.99,
        image: '/delicious-burger.jpg',
        category: burgers._id,
        isAvailable: true,
      },
      {
        name: 'Mix Fruits Cocktail',
        description: 'Sparkling tropical fruit soda with mango, strawberry, and citrus juices.',
        price: 99.99,
        image: '/mix-fruits-cocktail.jpg',
        category: beverages._id,
        isAvailable: true,
      },
      {
        name: 'Truffle Mushroom Pizza',
        description: 'Slow-fermented sourdough, fresh mozzarella, black truffle reduction, and roasted chanterelles.',
        price: 349.99,
        image: '/delicious-burger.jpg',
        category: pizzas._id,
        isAvailable: true,
      },
      {
        name: 'Mediterranean Salmon Bowl',
        description: 'Pan-seared wild salmon, quinoa, kalamata olives, heirloom cherry tomatoes, and lemon herb vinaigrette.',
        price: 319.99,
        image: '/mix-fruits-cocktail.jpg',
        category: bowls._id,
        isAvailable: true,
      },
    ])

    console.log('[Seed] Menu seed complete!')
  } catch (error) {
    console.error('[Seed] Failed to seed initial menu:', error)
  }
}

