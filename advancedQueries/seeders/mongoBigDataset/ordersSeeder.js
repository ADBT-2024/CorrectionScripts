import mongoose from 'mongoose'
import cliProgress from 'cli-progress'
import generateOrders from '../common/ordersGenerator.cjs'

const seedOrders = async (nOrders) => {
  const collection = mongoose.connection.db.collection('orders')
  try {
    await collection.drop()
  } catch (err) {
    console.error(`Orders collection could not be dropped. Details: ${err}`)
  }
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
    const orders = await generateOrders(chunkSize)
    await collection.insertMany(orders)
    progressBar.increment(chunkSize)
  }
  progressBar.stop()

  console.log('Orders collection seeded! :)')
}

export { seedOrders }
