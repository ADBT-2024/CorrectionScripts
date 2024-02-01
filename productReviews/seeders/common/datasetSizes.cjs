const dotenv = require('dotenv')

dotenv.config()

const getDatasetSize = () => {
  if (process.env.DATABASE_PROTOCOL === 'mongodb+srv') { return 2 }
  return 10
}

const getSeedingSizesDTO = () => {
  return {
    nUsers: 50 * getDatasetSize(),
    nRestaurants: 200 * getDatasetSize(),
    nOrders: 100000 * getDatasetSize()
  }
}

const { nUsers, nRestaurants, nOrders } = getSeedingSizesDTO()

module.exports = { nUsers, nRestaurants, nOrders }
