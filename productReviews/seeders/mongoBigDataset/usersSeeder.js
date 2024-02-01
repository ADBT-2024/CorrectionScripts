import mongoose from 'mongoose'
import generateUsers from '../common/usersGenerator.cjs'

const seedUsers = async (nUsers) => {
  const collection = mongoose.connection.db.collection('users')
  try {
    await collection.drop()
  } catch (err) {
    console.error(`Orders collection could not be dropped. Details: ${err}`)
  } const users = await generateUsers(nUsers)
  await collection.insertMany(users)
  console.log('Users collection seeded! :)')
}

export { seedUsers }
