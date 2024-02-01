import express from 'express'
import dotenv from 'dotenv'
import routes from './routes/index.js'
import { initPassport } from './config/passport.js'
import { initMongoose, disconnectMongoose } from './config/mongoose.js'
import loadGlobalMiddlewares from './middlewares/GlobalMiddlewaresLoader.js'
import { initSequelize, disconnectSequelize } from './config/sequelize.js'

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
  // To be used for future requirements
}

export { initializeApp, disconnectDatabase, initializeServer }
