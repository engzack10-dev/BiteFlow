import mongoose from 'mongoose'
import { Category } from '../models/Category.js'
import { Product } from '../models/Product.js'

async function syncMenu() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/biteflow'
  await mongoose.connect(uri)
  console.log('[Sync] Connected to MongoDB')

  // Find or create Pizza, Burger, Chicken, Beverages categories
  let pizzaCat = await Category.findOne({ name: { $regex: /pizza/i } })
  if (pizzaCat) {
    pizzaCat.name = 'Pizza'
    pizzaCat.description = 'Wood-fired artisanal pizzas with gourmet crusts and fresh mozzarella'
    await pizzaCat.save()
  } else {
    pizzaCat = await Category.create({
      name: 'Pizza',
      description: 'Wood-fired artisanal pizzas with gourmet crusts and fresh mozzarella',
      isActive: true,
    })
  }

  let burgerCat = await Category.findOne({ name: { $regex: /burger/i } })
  if (burgerCat) {
    burgerCat.name = 'Burger'
    burgerCat.description = 'Handcrafted gourmet beef and chicken burgers with secret sauce'
    await burgerCat.save()
  } else {
    burgerCat = await Category.create({
      name: 'Burger',
      description: 'Handcrafted gourmet beef and chicken burgers with secret sauce',
      isActive: true,
    })
  }

  let chickenCat = await Category.findOne({ name: { $regex: /chicken/i } })
  if (!chickenCat) {
    chickenCat = await Category.findOne({ name: { $regex: /bowl/i } })
  }
  if (chickenCat) {
    chickenCat.name = 'Chicken'
    chickenCat.description = 'Succulent flame-grilled chicken breasts, crispy wings, and rice plates'
    await chickenCat.save()
  } else {
    chickenCat = await Category.create({
      name: 'Chicken',
      description: 'Succulent flame-grilled chicken breasts, crispy wings, and rice plates',
      isActive: true,
    })
  }

  let beverageCat = await Category.findOne({ name: { $regex: /beverage/i } })
  if (!beverageCat) {
    beverageCat = await Category.create({
      name: 'Beverages',
      description: 'Chilled soft drinks, iced lemon colas, and fresh citrus juices',
      isActive: true,
    })
  }

  // Update or insert products with the user's high-res images
  // 1. Pizza Product
  let pizzaProd = await Product.findOne({ name: { $regex: /pizza/i } })
  if (pizzaProd) {
    pizzaProd.name = 'Artisan Pepperoni Pizza'
    pizzaProd.description = 'Loaded with pepperoni, fresh mozzarella, black olives, bell peppers, and slow-simmered marinara sauce.'
    pizzaProd.image = '/artisan-pizza.jpg'
    pizzaProd.category = pizzaCat._id
    pizzaProd.price = 349.99
    await pizzaProd.save()
  } else {
    await Product.create({
      name: 'Artisan Pepperoni Pizza',
      description: 'Loaded with pepperoni, fresh mozzarella, black olives, bell peppers, and slow-simmered marinara sauce.',
      price: 349.99,
      image: '/artisan-pizza.jpg',
      category: pizzaCat._id,
      isAvailable: true,
    })
  }

  // 2. Burger Product
  let burgerProd = await Product.findOne({ name: { $regex: /burger/i } })
  if (burgerProd) {
    burgerProd.name = 'Classic Gourmet Cheeseburger'
    burgerProd.description = 'Double seared beef patty, melted cheddar, crisp lettuce, ripe tomatoes, and golden fries with dipping sauce.'
    burgerProd.image = '/burger-fresh.jpg'
    burgerProd.category = burgerCat._id
    burgerProd.price = 299.99
    await burgerProd.save()
  } else {
    await Product.create({
      name: 'Classic Gourmet Cheeseburger',
      description: 'Double seared beef patty, melted cheddar, crisp lettuce, ripe tomatoes, and golden fries with dipping sauce.',
      price: 299.99,
      image: '/burger-fresh.jpg',
      category: burgerCat._id,
      isAvailable: true,
    })
  }

  // 3. Chicken Product
  let chickenProd = await Product.findOne({ name: { $regex: /chicken/i } })
  if (chickenProd) {
    chickenProd.name = 'Grilled Chicken Steak Feast'
    chickenProd.description = 'Herb-crusted tender chicken breast served with aromatic seasoned rice, crisp garden salad, and garlic aioli.'
    chickenProd.image = '/chicken-plate.jpg'
    chickenProd.category = chickenCat._id
    chickenProd.price = 329.99
    await chickenProd.save()
  } else {
    await Product.create({
      name: 'Grilled Chicken Steak Feast',
      description: 'Herb-crusted tender chicken breast served with aromatic seasoned rice, crisp garden salad, and garlic aioli.',
      price: 329.99,
      image: '/chicken-plate.jpg',
      category: chickenCat._id,
      isAvailable: true,
    })
  }

  // 4. Beverage Product - Cola
  let colaProd = await Product.findOne({ name: { $regex: /coca|cola/i } })
  if (colaProd) {
    colaProd.image = '/coca-cola.jpg'
    colaProd.category = beverageCat._id
    await colaProd.save()
  } else {
    await Product.create({
      name: 'Chilled Classic Coca-Cola',
      description: 'Ice-cold bubbly Coca-Cola served with fresh lemon slices and chilled glass.',
      price: 79.99,
      image: '/coca-cola.jpg',
      category: beverageCat._id,
      isAvailable: true,
    })
  }

  // 5. Beverage Product - Orange Juice
  let orangeProd = await Product.findOne({ name: { $regex: /orange|juice|cocktail/i } })
  if (orangeProd) {
    orangeProd.name = 'Freshly Squeezed Orange Juice'
    orangeProd.description = 'Pure 100% freshly pressed valencia oranges served chilled with a fresh orange wedge.'
    orangeProd.image = '/orange-juice.jpg'
    orangeProd.category = beverageCat._id
    orangeProd.price = 99.99
    await orangeProd.save()
  } else {
    await Product.create({
      name: 'Freshly Squeezed Orange Juice',
      description: 'Pure 100% freshly pressed valencia oranges served chilled with a fresh orange wedge.',
      price: 99.99,
      image: '/orange-juice.jpg',
      category: beverageCat._id,
      isAvailable: true,
    })
  }

  console.log('[Sync] Menu sync complete! Categories: Pizza, Burger, Chicken, Beverages')
  await mongoose.disconnect()
}

syncMenu().catch(console.error)
