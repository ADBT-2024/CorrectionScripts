import { disconnectDatabase } from '#src/app'
import { initializeServer } from '../../../src/app'

let testServer = null
let testApp = null

const getApp = async () => {
  if (!testServer) {
    ({ server: testServer, app: testApp } = await initializeServer())
  }
  return testServer
}

const shutdownApp = async () => {
  if (testServer) {
    await testServer.close()
    await disconnectDatabase(testApp)
    testApp = null
    testServer = null
  }
}

const getIdType = () => {
  if (process.env.DATABASE_TECHNOLOGY === 'mongoose') {
    return String
  } else if (process.env.DATABASE_TECHNOLOGY === 'sequelize') {
    return Number
  } else {
    throw new Error('Unsupported database technology')
  }
}

export { getApp, shutdownApp, getIdType }
