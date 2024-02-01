import mongoose from 'mongoose'
import generateRestaurantCategories from '../common/restaurantCategoriesGenerator.cjs'

const seedRestaurantCategories = async () => {
  const collection = mongoose.connection.db.collection('restaurantcategories')
  try {
    await collection.drop()
  } catch (err) {
    console.error(`RestaurantCategories collection could not be dropped. Details: ${err}`)
  } const restaurantCategories = await generateRestaurantCategories()
  await collection.insertMany(restaurantCategories)
  console.log('Restaurant categories collection seeded! :)')
}

export { seedRestaurantCategories }
