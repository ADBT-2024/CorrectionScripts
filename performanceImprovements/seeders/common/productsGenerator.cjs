const { QueryTypes } = require('sequelize')
const { faker } = require('@faker-js/faker')
const mongoose = require('mongoose')

const generateProducts = async (restaurantId, nProducts, restaurantCategoryName, technology = 'mongoose', queryInterface = null) => {
  const products = []

  let productCategories
  if (technology === 'mongoose') {
    productCategories = await mongoose.connection.db.collection('productcategories').find({}).toArray()
  }

  for (let i = 0; i < nProducts; i++) {
    if (technology === 'mongoose') {
      const randomProductCategory = productCategories[Math.floor(Math.random() * productCategories.length)]
      products.push((await generateFakeProductMongoose(restaurantId, restaurantCategoryName, randomProductCategory)))
    } else if (technology === 'sequelize') {
      products.push((await generateFakeProductSequelize(restaurantId, restaurantCategoryName, queryInterface)))
    }
  }
  return products
}

const generateFakeProductMongoose = async (restaurantId, restaurantCategoryName, productCategory) => {
  const _id = new mongoose.Types.ObjectId()
  const { name, description, image, order, availability, createdAt, updatedAt } = generateCommonFakeProductProperties()

  const price = generatePrice(restaurantCategoryName, productCategory.name)

  return { _id, name, description, price, image, order, availability, _productCategoryId: productCategory._id, restaurantId, createdAt, updatedAt }
}

const generateFakeProductSequelize = async (restaurantId, restaurantCategoryName, queryInterface) => {
  const { name, description, image, order, availability, createdAt, updatedAt } = generateCommonFakeProductProperties()
  const productCategories = await queryInterface.sequelize.query('SELECT id,name FROM ProductCategories ORDER BY RAND() LIMIT 1', { type: QueryTypes.SELECT })
  const productCategoryId = productCategories[0].id
  const productCategoryName = productCategories[0].name

  const price = generatePrice(restaurantCategoryName, productCategoryName)
  return { name, description, price, image, order, availability, productCategoryId, restaurantId, createdAt, updatedAt }
}

const generateCommonFakeProductProperties = () => {
  const name = faker.commerce.productName()
  const description = faker.commerce.productDescription()
  const image = faker.image.food() + `?timestamp=${Math.floor(Math.random() * 100)}`
  const order = faker.datatype.number({ min: 1, max: 100 })
  const availability = faker.datatype.boolean()
  const createdAt = new Date()
  const updatedAt = createdAt
  return { name, description, image, order, availability, createdAt, updatedAt }
}

function generatePrice (restaurantCategory, productCategory) {
  const basePrice = {
    'Fast Food': 5,
    Casual: 10,
    'Fast Casual': 12,
    Contemporary: 20,
    'Fine Dining': 30,
    'Cafes and Coffee Shops': 4,
    'Specialty Drinks': 6,
    Buffet: 15,
    'Food Trucks': 8
  }[restaurantCategory]

  const multiplier = {
    Starters: 0.5,
    Sides: 0.4,
    Sandwiches: 0.7,
    'Main Courses': 1,
    Specialties: 1.2,
    Desserts: 0.8,
    Drinks: 0.3
  }[productCategory]

  const randomFactor = Math.floor(Math.random() * 41) * 0.05
  const price = basePrice * multiplier + randomFactor
  return parseFloat(price.toFixed(2))
}

function generateRandomNumberOfProducts () {
  const avg = 15
  const stdDev = 3
  const numProducts = Math.round(generateRandomNormalNumber(avg, stdDev))
  return numProducts < 1 ? 1 : numProducts
}

function generateRandomNormalNumber (avg, stdDev) {
  let u = 0; let v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
  return z * stdDev + avg
}

module.exports = { generateProducts, generateRandomNumberOfProducts }
