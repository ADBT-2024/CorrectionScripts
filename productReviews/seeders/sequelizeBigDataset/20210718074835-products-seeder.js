const { QueryTypes } = require('sequelize')
const { generateProducts, generateRandomNumberOfProducts } = require('../common/productsGenerator.cjs')

module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add seed commands here.
     *
     * Example:
     * await queryInterface.bulkInsert('People', [{
     *   name: 'John Doe',
     *   isBetaMember: false
     * }], {})
    */

    const restaurants = await queryInterface.sequelize.query('SELECT Restaurants.id, RestaurantCategories.name as restaurantCategoryName FROM Restaurants LEFT JOIN RestaurantCategories ON(Restaurants.restaurantCategoryId = RestaurantCategories.id)', { type: QueryTypes.SELECT })
    let products = []
    await Promise.all(restaurants.map(async (restaurant) => {
      const restaurantProducts = await generateProducts(restaurant.id, generateRandomNumberOfProducts(), restaurant.restaurantCategoryName, 'sequelize', queryInterface)
      products = products.concat(restaurantProducts)
    }))

    await queryInterface.bulkInsert('Products', products, {})
  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {})
     */
    const { sequelize } = queryInterface
    try {
      await sequelize.transaction(async (transaction) => {
        const options = { transaction }
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', options)
        await sequelize.query('TRUNCATE TABLE Products', options)
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', options)
      })
    } catch (error) {
      console.error(error)
    }
  }

}
