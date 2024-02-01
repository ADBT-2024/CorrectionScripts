import dotenv from 'dotenv'
import express from 'express'
import mongoose from 'mongoose'
import container from './config/container.js'
import { disconnectMongoose, initMongoose } from './config/mongoose.js'
import { initPassport } from './config/passport.js'
import { disconnectSequelize, initSequelize } from './config/sequelize.js'
import loadGlobalMiddlewares from './middlewares/GlobalMiddlewaresLoader.js'
import { ProductSequelize, RestaurantSequelize } from './repositories/sequelize/models/models.js'
import RestaurantMongoose from './repositories/mongoose/models/RestaurantMongoose.js'
import routes from './routes/index.js'
import { Sequelize } from 'sequelize'

const initializeApp = async () => {
  dotenv.config()
  const app = express()
  loadGlobalMiddlewares(app)
  routes(app)
  initPassport()
  app.connection = await initializeDatabase()
  await postInitializeDatabase(app)
  return app
}

const initializeServer = async (enableConsoleLog = false) => {
  controlConsoleLog(enableConsoleLog)
  try {
    const app = await initializeApp()
    const port = process.env.APP_PORT || 3000
    const server = await app.listen(port)
    console.log('DeliverUS-Advanced listening at http://localhost:' + server.address().port)
    return { server, app }
  } catch (error) {
    console.error(error)
  }
}

const initializeDatabase = async () => {
  let connection
  try {
    if (process.env.DATABASE_TECHNOLOGY === 'mongoose') {
      connection = await initMongoose()
      console.log('INFO - DocumentOriented/MongoDB/Mongoose technology connected.')
    } else if (process.env.DATABASE_TECHNOLOGY === 'sequelize') {
      connection = await initSequelize()
      console.log('INFO - Relational/MariaDB/Sequelize technology connected.')
    }
  } catch (error) {
    console.error(error)
  }
  return connection
}

const disconnectDatabase = async (app) => {
  try {
    if (process.env.DATABASE_TECHNOLOGY === 'mongoose') {
      await disconnectMongoose(app.connection)
      console.log('INFO - DocumentOriented/MongoDB/Mongoose disconnected.')
    } else if (process.env.DATABASE_TECHNOLOGY === 'sequelize') {
      await disconnectSequelize(app.connection)
      console.log('INFO - Relational/MariaDB/Sequelize technology disconnect.')
    }
  } catch (error) {
    console.error(error)
  } finally {
    controlConsoleLog(true)
  }
}

const controlConsoleLog = (enable) => {
  if (!enable) {
    global.originalConsoleLog = console.log
    console.log = () => {}
  } else {
    console.log = global.originalConsoleLog || console.log
  }
}

const postInitializeDatabase = async (app) => {
  const computeAvgPrices = async () => {
    const restaurantRepository = container.resolve('restaurantRepository')
    const restaurants = await restaurantRepository.findAll()
    return Promise.all(restaurants.map(async (restaurant) => {
      if (process.env.DATABASE_TECHNOLOGY === 'mongoose') {
        await _mongooseRecomputeAndSaveAvg(restaurant)
      } else if (process.env.DATABASE_TECHNOLOGY === 'sequelize') {
        await _sequelizeRecomputeAndSaveAvg(restaurant)
      }
    }))
  }
  await computeAvgPrices()
}

const _mongooseRecomputeAndSaveAvg = async (restaurant) => {
  try {
    const aggregationResult = await RestaurantMongoose.aggregate([
      {
        $match:
        {
          _id: new mongoose.Types.ObjectId(restaurant.id) // Convertir la cadena del ID en ObjectId
        }
      },
      {
        $project:
        {
          products: 1
        }
      },
      {
        $unwind: '$products'
      },
      {
        $group:
        {
          _id: '$_id',
          avgProductsPrice: {
            $avg: '$products.price'
          }
        }
      }
    ])
    await RestaurantMongoose.updateOne({ _id: restaurant.id }, { avgPrice: aggregationResult[0]?.avgProductsPrice })
  } catch (err) {
    console.log(err)
  }
}

const _sequelizeRecomputeAndSaveAvg = async (restaurant) => {
  // Computar la media del precio de los productos del restaurante
  const result = await ProductSequelize.findAll({
    where: { restaurantId: restaurant.id },
    attributes: [[Sequelize.fn('AVG', Sequelize.col('price')), 'avgPrice']]
  })
  const avgPrice = result && result[0] ? result[0].getDataValue('avgPrice') : null
  await RestaurantSequelize.update({ avgPrice }, { where: { id: restaurant.id } })
}

export { disconnectDatabase, initializeApp, initializeServer }
