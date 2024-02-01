import os from 'os'
import dotenv from 'dotenv'
dotenv.config()

const appPort = process.env.APP_HOST || 3000

const processFileUris = (object, uriPropertyNames) => {
  uriPropertyNames.forEach(prop => {
    if (Object.prototype.hasOwnProperty.call(object, prop)) {
      const uri = object[prop]
      if (uri && getUriType(uri) === 'relative') {
        const absoluteUri = getAbsoluteFileUri(uri)
        object[prop] = absoluteUri
      }
    }
  })
}
const getAbsoluteFileUri = (relativeFilePath) => {
  let absoluteFileUrl = ''
  const addresses = getIPV4Addresses()
  if (addresses[0]) {
    absoluteFileUrl = `http://${addresses[0]}:${appPort}/${relativeFilePath}`
  } else {
    absoluteFileUrl = `http://localhost:${appPort}/${relativeFilePath}`
  }

  return absoluteFileUrl
}

const getIPV4Addresses = () => {
  const interfaces = os.networkInterfaces()
  const addresses = []

  for (const key in interfaces) {
    for (const iface of interfaces[key]) {
    // Filtramos solo las direcciones IPv4 que no son de loopback
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address)
      }
    }
  }
  return addresses
}

function isExternalUri (uri) {
  const protocol = uri.split(':')[0]
  return protocol === 'http' || protocol === 'https' || protocol === 'ftp'
}

function getUriType (uri) {
  return isExternalUri(uri) ? 'external' : 'relative'
}

export { processFileUris }
