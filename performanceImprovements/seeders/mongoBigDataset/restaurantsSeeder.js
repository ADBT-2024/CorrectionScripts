import mongoose from 'mongoose'
import generateRestaurants from '../common/restaurantsGenerator.cjs'

const seedRestaurants = async (nRestaurants) => {
  const collection = mongoose.connection.db.collection('restaurants')
  try {
    await collection.drop()
  } catch (err) {
    console.error('Restaurants collection could not be dropped')
  }
  const restaurants = await generateRestaurants(nRestaurants)
  await collection.insertMany(restaurants)
  console.log('Restaurants collection seeded! :)')
}

export { seedRestaurants }
