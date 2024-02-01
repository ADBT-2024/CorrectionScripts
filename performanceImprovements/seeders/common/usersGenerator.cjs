const { faker } = require('@faker-js/faker')
const bcrypt = require('bcryptjs')

const generateUsers = async (nUsers) => {
  const users = []
  users.push((await generateKnownCustomer()))
  users.push((await generateKnownOwner()))

  for (let i = 0; i < nUsers; i++) {
    users.push((await generateFakeUser()))
  }
  return users
}

const generateKnownCustomer = async () => {
  const customer = await generateFakeUser()
  customer.email = 'customer1@customer.com'
  customer.password = await encryptPassword('secret')
  customer.userType = 'customer'

  return customer
}

const generateKnownOwner = async () => {
  const owner = await generateFakeUser()
  owner.email = 'owner1@owner.com'
  owner.password = await encryptPassword('secret')
  owner.userType = 'owner'

  return owner
}
const generateFakeUser = async () => {
  const firstName = faker.name.firstName()
  const lastName = faker.name.lastName()
  const email = faker.internet.email(firstName, lastName)
  const password = await encryptPassword(faker.internet.password())
  const phone = faker.phone.number()
  const avatar = faker.internet.avatar() + `?timestamp=${Math.floor(Math.random() * 100)}`
  const address = `${faker.address.streetAddress()}, ${faker.address.cityName()}, ${faker.address.country()}.`
  const postalCode = faker.address.zipCode()
  const userType = faker.helpers.arrayElement(['customer', 'owner'])
  const createdAt = new Date()
  const updatedAt = createdAt
  return { firstName, lastName, email, password, phone, avatar, address, postalCode, userType, createdAt, updatedAt }
}
const encryptPassword = async (password) => {
  try {
    const salt = await bcrypt.genSalt(5)
    const hashedPassword = await bcrypt.hash(password, salt)
    return hashedPassword
  } catch (err) {
    throw new Error(err)
  }
}

module.exports = generateUsers
