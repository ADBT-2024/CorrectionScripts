import Sequelize from 'sequelize'

const databaseHost = process.env.DATABASE_HOST
const databasePort = process.env.DATABASE_PORT
const databaseUsername = process.env.DATABASE_USERNAME
const databasePassword = process.env.DATABASE_PASSWORD
const databaseName = process.env.DATABASE_NAME

const initSequelize = async () => {
  const sequelizeConnection = new Sequelize(databaseName, databaseUsername, databasePassword, {
    host: databaseHost,
    port: databasePort,
    dialect: 'mariadb',
    dialectOptions: {
      allowPublicKeyRetrieval: true
    }
    // logging: false
  })
  await sequelizeConnection.authenticate()
  return sequelizeConnection
}

const disconnectSequelize = async (connection) => {
  return connection.close()
}

export { initSequelize, disconnectSequelize }
