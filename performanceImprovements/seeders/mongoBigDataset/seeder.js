import mongoose from 'mongoose'
import { getMongoDBConnectionURI } from '../../../config/mongoose.js'
import { nOrders, nRestaurants, nUsers } from '../common/datasetSizes.cjs'
import { seedOrders } from './ordersSeeder.js'
import { seedProductCategories } from './productCategoriesSeeder.js'
import { seedRestaurantCategories } from './restaurantCategoriesSeeder.js'
import { seedRestaurants } from './restaurantsSeeder.js'
import { seedUsers } from './usersSeeder.js'

async function seedDB () {
  await mongoose.connect(getMongoDBConnectionURI())
  try {
    await seedUsers(nUsers)
    await seedRestaurantCategories()
    await seedProductCategories()
    await seedRestaurants(nRestaurants)
    await seedOrders(nOrders)
    mongoose.connection.close()
  } catch (err) {
    console.error(err.stack)
  }
}

seedDB()
