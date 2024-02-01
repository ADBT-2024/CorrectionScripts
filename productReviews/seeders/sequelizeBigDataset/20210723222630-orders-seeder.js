const { nOrders } = require('../common/datasetSizes.cjs')
const generateOrders = require('../common/ordersGenerator.cjs')
const cliProgress = require('cli-progress')

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // if max_allowed_packt raises an exception, run the following as root
    // 'SET GLOBAL max_allowed_packet=67108864;')

    const chunkSize = (nOrders / 10) <= 50000 ? (nOrders / 10) : 50000
    console.log(`nOrders: ${nOrders}. Chunk size: ${chunkSize}`)

    const progressBar = new cliProgress.SingleBar({
      format: '{title} |{bar}| {percentage}% | ETA: {eta_formatted}',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    })
    progressBar.start(nOrders, 0, { title: 'Inserting Orders' })

    for (let i = 0; i < nOrders / chunkSize; i++) {
      let orders = await generateOrders(chunkSize, 'sequelize', queryInterface)
      const orderProducts = extractOrderProductsFromOrders(orders)
      orders = removeProductFromOrders(orders)
      await queryInterface.bulkInsert('Orders', orders, {})
      await queryInterface.bulkInsert('OrderProducts', orderProducts, {})
      progressBar.increment(chunkSize)
    }
    progressBar.stop()
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
        await sequelize.query('TRUNCATE TABLE OrderProducts', options)
        await sequelize.query('TRUNCATE TABLE Orders', options)
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', options)
      })
    } catch (error) {
      console.error(error)
    }
  }
}
function removeProductFromOrders (orders) {
  orders = orders.map(order => {
    const orderWithoutProducts = Object.assign({}, order)
    delete orderWithoutProducts.products
    return orderWithoutProducts
  })
  return orders
}

function extractOrderProductsFromOrders (orders) {
  return orders.flatMap(order => order.products.map(product => ({
    orderId: product.orderId,
    productId: product.productId,
    quantity: product.quantity,
    unityPrice: product.unityPrice
  }))
  )
}
