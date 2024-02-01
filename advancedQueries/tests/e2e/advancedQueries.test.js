import request from 'supertest'
import { shutdownApp, getApp } from './utils/testApp'
import { getLoggedInCustomer, getLoggedInOwner, getNewLoggedInCustomer } from './utils/auth'
import { createRestaurant, getFirstRestaurantOfOwner } from './utils/restaurant'
import { createProduct, getNewPaellaProductData } from './utils/product'
import { createOrder, getNewOrderData } from './utils/order'
import moment from 'moment'
import { bodeguitaRestaurant, generateFakeUser } from './utils/testData.js'

describe('Advanced Queries: Search orders by product name', () => {
  let newCustomer, otherCustomer, owner, productToBeSearched, orderToBeFound, orderToNotBeFound, app
  beforeAll(async () => {
    app = await getApp()
    newCustomer = await getNewLoggedInCustomer()
    owner = await getLoggedInOwner()
    const restaurant = await getFirstRestaurantOfOwner(owner)
    const productToBeSearchedData = await getNewPaellaProductData(restaurant)
    productToBeSearchedData.name = Math.random().toString(36).substring(2, 15)
    productToBeSearched = await createProduct(owner, restaurant, productToBeSearchedData)
    const orderDataToBeSearched = await getNewOrderData(restaurant)
    orderDataToBeSearched.products.push({ productId: productToBeSearched.id, quantity: 1 })
    orderToBeFound = await createOrder(newCustomer, restaurant, orderDataToBeSearched)
    orderToNotBeFound = await createOrder(newCustomer, restaurant, await getNewOrderData(restaurant))
    otherCustomer = await getNewLoggedInCustomer()
  })
  it('Should return 401 if not logged in', async () => {
    const response = await request(app).get('/orders/search?query=keyword').send()
    expect(response.status).toBe(401)
  })
  it('Should return 403 when logged in as an owner', async () => {
    const response = await request(app).get('/orders/search?query=keyword').set('Authorization', `Bearer ${owner.token}`).send()
    expect(response.status).toBe(403)
  })
  it('Should return 200 and both orders when searching without a query', async () => {
    const response = await request(app).get('/orders/search').set('Authorization', `Bearer ${newCustomer.token}`).send()
    expect(response.status).toBe(200)
    expect(response.body.length).toBe(2)
    expect(response.body.find(order => order.id === orderToBeFound.id)).toBeDefined()
    expect(response.body.find(order => order.id === orderToNotBeFound.id)).toBeDefined()
  })
  it('Should return 200 and an empty array when searching for a keyword that does not exists in products', async () => {
    const response = await request(app).get('/orders/search?query=notFoundKeyWord').set('Authorization', `Bearer ${newCustomer.token}`).send()
    expect(response.status).toBe(200)
    expect(response.body.length).toBe(0)
  })
  it('Should return 200 and an empty array when searching when searching with a keyword that matches an ordered product name from another customer', async () => {
    const response = await request(app).get(`/orders/search?query=${productToBeSearched.name}`).set('Authorization', `Bearer ${otherCustomer.token}`).send()
    expect(response.status).toBe(200)
    expect(response.body.length).toBe(0)
  })
  it('Should return 200 and the only the found order when searching with a keyword that matches an ordered product name', async () => {
    const response = await request(app).get(`/orders/search?query=${productToBeSearched.name}`).set('Authorization', `Bearer ${newCustomer.token}`).send()
    expect(response.status).toBe(200)
    expect(response.body.length).toBe(1)
    expect(response.body[0].id).toBe(orderToBeFound.id)
    expect(response.body[0].products.find(product => product.id === productToBeSearched.id)).toBeDefined()
    expect(response.body.every(order => order.id !== orderToNotBeFound.id)).toBe(true)
  })
  afterAll(async () => {
    await shutdownApp()
  })
})

describe('Advanced Queries: Search products', () => {
  let productToBeSearched, app
  beforeAll(async () => {
    app = await getApp()
    const owner = await getLoggedInOwner()
    const restaurant = await getFirstRestaurantOfOwner(owner)
    const productToBeSearchedData = await getNewPaellaProductData(restaurant)
    productToBeSearchedData.name = Math.random().toString(36).substring(2, 15)
    productToBeSearchedData.description = Math.random().toString(36).substring(2, 15)
    productToBeSearched = await createProduct(owner, restaurant, productToBeSearchedData)
  })
  it('Should return 200 when searching with a keyword', async () => {
    const response = await request(app).get('/products/search?query=keyword').send()
    expect(response.status).toBe(200)
    expect(response.body.find(product => product.id === productToBeSearched.id)).toBeUndefined()
  })
  it('Should return 200 when searching with a keyword that matches a product name', async () => {
    const response = await request(app).get(`/products/search?query=${productToBeSearched.name}`).send()
    expect(response.status).toBe(200)
    expect(response.body.length).toBeGreaterThan(0)
    expect(response.body.every(product => product.id !== undefined)).toBe(true)
    expect(response.body.every(product => product.productCategory !== undefined)).toBe(true)
    expect(response.body.find(product => product.id === productToBeSearched.id)).toBeDefined()
  })
  it('Should return 200 when searching with a keyword that matches a product description', async () => {
    const response = await request(app).get(`/products/search?query=${productToBeSearched.description}`).send()
    expect(response.status).toBe(200)
    expect(response.body.length).toBeGreaterThan(0)
    expect(response.body.every(product => product.id !== undefined)).toBe(true)
    expect(response.body.every(product => product.productCategory !== undefined)).toBe(true)
    expect(response.body.find(product => product.id === productToBeSearched.id)).toBeDefined()
  })
  afterAll(async () => {
    await shutdownApp()
  })
})

describe('Advanced Queries: Get Top 5 restaurants', () => {
  let topLastWeekRestaurants, topLastMonthRestaurants, topLastYearRestaurants, topLastWeekRestaurant, topLastMonthRestaurant, topLastYearRestaurant, app
  beforeAll(async () => {
    app = await getApp()
    const owner = await getLoggedInOwner()
    const customer = await getLoggedInCustomer()

    const validRestaurant = { ...bodeguitaRestaurant }
    validRestaurant.restaurantCategoryId = (await request(app).get('/restaurantCategories').send()).body[0].id
    validRestaurant.name = 'Top last week'
    topLastWeekRestaurant = (await request(app).post('/restaurants').set('Authorization', `Bearer ${owner.token}`).send(validRestaurant)).body
    validRestaurant.name = 'Top last month'
    topLastMonthRestaurant = (await request(app).post('/restaurants').set('Authorization', `Bearer ${owner.token}`).send(validRestaurant)).body
    validRestaurant.name = 'Top last year'
    topLastYearRestaurant = (await request(app).post('/restaurants').set('Authorization', `Bearer ${owner.token}`).send(validRestaurant)).body

    const oneWeekAgo = moment().subtract(1, 'days').set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
    const oneMonthAgo = moment().subtract(20, 'days').set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
    const oneYearAgo = moment().subtract(3, 'months').set({ hour: 0, minute: 0, second: 0, millisecond: 0 })

    const topLastWeekRestaurantOrderData = await getNewOrderData(topLastWeekRestaurant, 10001)
    topLastWeekRestaurantOrderData.createdAt = oneWeekAgo.toDate()
    topLastWeekRestaurantOrderData.startedAt = oneWeekAgo.toDate()
    await createOrder(customer, topLastWeekRestaurant, topLastWeekRestaurantOrderData)

    const topLastMonthRestaurantOrderData = await getNewOrderData(topLastMonthRestaurant, 20000)
    topLastMonthRestaurantOrderData.createdAt = oneMonthAgo.toDate()
    topLastMonthRestaurantOrderData.startedAt = oneMonthAgo.toDate()
    await createOrder(customer, topLastMonthRestaurant, topLastMonthRestaurantOrderData)

    const topLastYearRestaurantOrderData = await getNewOrderData(topLastYearRestaurant, 30000)
    topLastYearRestaurantOrderData.createdAt = oneYearAgo.toDate()
    topLastYearRestaurantOrderData.startedAt = oneYearAgo.toDate()
    await createOrder(customer, topLastYearRestaurant, topLastYearRestaurantOrderData)
  })
  it('The response should have three arrays of 5 elements maximum', async () => {
    const response = await request(app).get('/restaurants/top').send()
    expect(response.status).toBe(200)
    expect(response.body.topLastWeekRestaurants).toBeDefined()
    expect(response.body.topLastWeekRestaurants.length).toBeLessThanOrEqual(5)
    expect(response.body.topLastMonthRestaurants).toBeDefined()
    expect(response.body.topLastMonthRestaurants.length).toBeLessThanOrEqual(5)
    expect(response.body.topLastYearRestaurants).toBeDefined()
    expect(response.body.topLastYearRestaurants.length).toBeLessThanOrEqual(5)
    topLastWeekRestaurants = response.body.topLastWeekRestaurants
    topLastMonthRestaurants = response.body.topLastMonthRestaurants
    topLastYearRestaurants = response.body.topLastYearRestaurants
  })
  it('All restaurants must have an id', async () => {
    expect(topLastWeekRestaurants.every(restaurant => restaurant.id !== undefined)).toBe(true)
    expect(topLastMonthRestaurants.every(restaurant => restaurant.id !== undefined)).toBe(true)
    expect(topLastYearRestaurants.every(restaurant => restaurant.id !== undefined)).toBe(true)
  })
  it('Top restaurants should be the ones that I have created big orders', async () => {
    expect(topLastWeekRestaurants[0].id).toBe(topLastWeekRestaurant.id)
    expect(topLastMonthRestaurants[0].id).toBe(topLastMonthRestaurant.id)
    expect(topLastYearRestaurants[0].id).toBe(topLastYearRestaurant.id)
  })

  afterAll(async () => {
    await shutdownApp()
  })
})

describe('Advanced Queries: Get Top deliverers (fastest from sentAt to deliveredAt)', () => {
  let fastestRestaurants, fastestRestaurant, app
  beforeAll(async () => {
    app = await getApp()
    const owner = await getLoggedInOwner()
    const customer = await getLoggedInCustomer()

    const validRestaurant = { ...bodeguitaRestaurant }
    validRestaurant.restaurantCategoryId = (await request(app).get('/restaurantCategories').send()).body[0].id
    validRestaurant.name = 'Fastest restaurant'
    fastestRestaurant = (await request(app).post('/restaurants').set('Authorization', `Bearer ${owner.token}`).send(validRestaurant)).body
    const oneMinuteAgo = moment().subtract(1, 'minutes')
    const fastestRestaurantOrderData = await getNewOrderData(fastestRestaurant, 15)
    fastestRestaurantOrderData.createdAt = oneMinuteAgo.toDate()
    fastestRestaurantOrderData.startedAt = oneMinuteAgo.toDate()
    fastestRestaurantOrderData.sentAt = oneMinuteAgo.toDate()
    fastestRestaurantOrderData.deliveredAt = new Date()
    await createOrder(customer, fastestRestaurant, fastestRestaurantOrderData)
  })
  it('There must be at least one restaurant', async () => {
    const response = await request(app).get('/restaurants/topDeliverers').send()
    expect(response.status).toBe(200)
    expect(response.body.length).toBeGreaterThanOrEqual(1)
    fastestRestaurants = response.body
  })
  it('All restaurants must have an id', async () => {
    expect(fastestRestaurants.every(restaurant => restaurant.id !== undefined)).toBe(true)
  })
  it('Fastest delivery restaurant should be the previously created', async () => {
    expect(fastestRestaurants[0].id).toBe(fastestRestaurant.id)
  })

  afterAll(async () => {
    await shutdownApp()
  })
})

describe('Advanced Queries: Get Bottom deliverers (slowest from sentAt to deliveredAt)', () => {
  let slowestRestaurants, slowestRestaurant, app
  beforeAll(async () => {
    app = await getApp()
    const owner = await getLoggedInOwner()
    const customer = await getLoggedInCustomer()

    const validRestaurant = { ...bodeguitaRestaurant }
    validRestaurant.restaurantCategoryId = (await request(app).get('/restaurantCategories').send()).body[0].id
    validRestaurant.name = 'Slowest restaurant'
    slowestRestaurant = (await request(app).post('/restaurants').set('Authorization', `Bearer ${owner.token}`).send(validRestaurant)).body
    const slowestRestaurantOrderData = await getNewOrderData(slowestRestaurant, 15)
    const oneDayAgo = moment().subtract(1, 'days')
    slowestRestaurantOrderData.createdAt = oneDayAgo.toDate()
    slowestRestaurantOrderData.startedAt = oneDayAgo.toDate()
    slowestRestaurantOrderData.sentAt = oneDayAgo.toDate()
    slowestRestaurantOrderData.deliveredAt = new Date()
    await createOrder(customer, slowestRestaurant, slowestRestaurantOrderData)
  })
  it('There must be at least one restaurant', async () => {
    const response = await request(app).get('/restaurants/bottomDeliverers').send()
    expect(response.status).toBe(200)
    expect(response.body.length).toBeGreaterThanOrEqual(1)
    slowestRestaurants = response.body
  })
  it('All restaurants must have an id', async () => {
    expect(slowestRestaurants.every(restaurant => restaurant.id !== undefined)).toBe(true)
  })
  it('Slowest delivery restaurant should be the previously created', async () => {
    expect(slowestRestaurants[0].id).toBe(slowestRestaurant.id)
  })

  afterAll(async () => {
    await shutdownApp()
  })
})

describe('Advanced Queries: Search restaurants', () => {
  let foundRestaurants, createdRestaurant, selectedCategoryIdRestaurant, nonSelectedCategoryIdRestaurant, app
  beforeAll(async () => {
    app = await getApp()
    const owner = await getLoggedInOwner()
    const restaurantCategories = (await request(app).get('/restaurantCategories').send()).body
    selectedCategoryIdRestaurant = restaurantCategories[0].id
    nonSelectedCategoryIdRestaurant = restaurantCategories[1].id
    const validRestaurant = { ...bodeguitaRestaurant }
    validRestaurant.restaurantCategoryId = selectedCategoryIdRestaurant
    validRestaurant.name = '41010 Restaurant'
    validRestaurant.postalCode = '41010'
    createdRestaurant = (await request(app).post('/restaurants').set('Authorization', `Bearer ${owner.token}`).send(validRestaurant)).body
    const expensiveProductData = await getNewPaellaProductData(createdRestaurant)
    expensiveProductData.price = 10000
    await createProduct(owner, createdRestaurant, expensiveProductData)

    const customer = await getLoggedInCustomer()
    const slowestOrderData = await getNewOrderData(createdRestaurant, 15)
    const oneYearAgo = moment().subtract(1, 'year')
    const twoYearAgo = moment().subtract(2, 'year')

    slowestOrderData.createdAt = twoYearAgo.toDate()
    slowestOrderData.startedAt = twoYearAgo.toDate()
    slowestOrderData.sentAt = oneYearAgo.toDate()
    slowestOrderData.deliveredAt = new Date()
    await createOrder(customer, createdRestaurant, slowestOrderData)
    await createRestaurant(owner)
  })
  it('The created restaurant should be present if no query params', async () => {
    const response = await request(app).get('/restaurants/search').send()
    expect(response.status).toBe(200)
    expect(response.body.find(restaurant => restaurant.id === createdRestaurant.id)).toBeDefined()
    foundRestaurants = response.body
  })
  it('All restaurants must have an id', async () => {
    expect(foundRestaurants.every(restaurant => restaurant.id !== undefined)).toBe(true)
  })
  it('The created restaurant should not be present if filtering for another postal code', async () => {
    const response = await request(app).get('/restaurants/search?postalCode=0000').send()
    expect(response.status).toBe(200)
    expect(response.body.find(restaurant => restaurant.id === createdRestaurant.id)).toBeUndefined()
  })
  it('The created restaurant should be present if filtering for its postal code', async () => {
    const response = await request(app).get('/restaurants/search?postalCode=41010').send()
    expect(response.status).toBe(200)
    expect(response.body.find(restaurant => restaurant.id === createdRestaurant.id)).toBeDefined()
  })
  it('The created restaurant should not be present if filtering by another restaurant category', async () => {
    const response = await request(app).get(`/restaurants/search?categoryId=${nonSelectedCategoryIdRestaurant}`).send()
    expect(response.status).toBe(200)
    expect(response.body.find(restaurant => restaurant.id === createdRestaurant.id)).toBeUndefined()
  })
  it('The created restaurant should be present if filtering by its restaurant category', async () => {
    const response = await request(app).get(`/restaurants/search?categoryId=${selectedCategoryIdRestaurant}`).send()
    expect(response.status).toBe(200)
    expect(response.body.find(restaurant => restaurant.id === createdRestaurant.id)).toBeDefined()
  })
  it('The created restaurant should not be present if filtering by non expensive', async () => {
    const response = await request(app).get('/restaurants/search?expensive=false').send()
    expect(response.status).toBe(200)
    expect(response.body.find(restaurant => restaurant.id === createdRestaurant.id)).toBeUndefined()
  })
  it('The created restaurant should be present if filtering by expensive', async () => {
    const response = await request(app).get('/restaurants/search?expensive=true').send()
    expect(response.status).toBe(200)
    expect(response.body.find(restaurant => restaurant.id === createdRestaurant.id)).toBeDefined()
  })
  it('The created restaurant should be the last one when sorting by delivery time', async () => {
    const response = await request(app).get('/restaurants/search?sortBy=deliveryTime').send()
    expect(response.status).toBe(200)
    expect(response.body[response.body.length - 1].id).toBe(createdRestaurant.id)
  })
  it('The created restaurant should be the last one when sorting by preparation time', async () => {
    const response = await request(app).get('/restaurants/search?sortBy=preparationTime').send()
    expect(response.status).toBe(200)
    expect(response.body[response.body.length - 1].id).toBe(createdRestaurant.id)
  })
  it('The created restaurant should be the unique one when filtering by everything and sorting by preparation time', async () => {
    const response = await request(app).get(`/restaurants/search?postalCode=41010&categoryId=${selectedCategoryIdRestaurant}&expensive=true&sortBy=preparationTime`).send()
    expect(response.status).toBe(200)
    expect(response.body.length).toBe(1)
    expect(response.body[0].id).toBe(createdRestaurant.id)
  })

  afterAll(async () => {
    await shutdownApp()
  })
})

describe('Advanced Queries: Search customer by postal code', () => {
  let customerToBeSearched, ownerToBeSearched, app
  beforeAll(async () => {
    app = await getApp()
    const customerToBeSearchedData = await generateFakeUser()
    customerToBeSearchedData.name = 'Customer from 41010'
    customerToBeSearchedData.postalCode = '41010'
    customerToBeSearched = (await request(app).post('/users/register').send(customerToBeSearchedData)).body
    const ownerToBeSearchedData = await generateFakeUser()
    ownerToBeSearchedData.name = 'Owner from 41010'
    ownerToBeSearchedData.postalCode = '41010'
    ownerToBeSearched = (await request(app).post('/users/registerOwner').send(ownerToBeSearchedData)).body
  })
  it('Should return 200 when searching without any query param', async () => {
    const response = await request(app).get('/users/search').send()
    expect(response.status).toBe(200)
    expect(response.body.length).toBeGreaterThan(0)
    expect(response.body.every(customer => customer.userType === 'customer')).toBe(true)
    expect(response.body.find(customer => customer.id === customerToBeSearched.id)).toBeDefined()
    expect(response.body.every(customer => customer.password === undefined)).toBe(true)
  })
  it('Should return 200 when searching any postal code', async () => {
    const response = await request(app).get('/users/search?postalCode=0000').send()
    expect(response.status).toBe(200)
    expect(response.body.every(customer => customer.userType === 'customer')).toBe(true)
    expect(response.body.find(customer => customer.id === customerToBeSearched.id)).toBeUndefined()
    expect(response.body.every(customer => customer.password === undefined)).toBe(true)
  })
  it('Should return the created customer when searching customers by postal code', async () => {
    const response = await request(app).get(`/users/search?postalCode=${customerToBeSearched.postalCode}`).send()
    expect(response.status).toBe(200)
    expect(response.body.length).toBeGreaterThan(0)
    expect(response.body.every(customer => customer.id !== undefined)).toBe(true)
    expect(response.body.find(customer => customer.id === customerToBeSearched.id)).toBeDefined()
    expect(response.body.every(customer => customer.userType === 'customer')).toBe(true)
    expect(response.body.find(customer => customer.id === ownerToBeSearched.id)).toBeUndefined()
    expect(response.body.every(customer => customer.password === undefined)).toBe(true)
  })

  afterAll(async () => {
    await shutdownApp()
  })
})

describe('Advanced Queries: Get Top customer by spent money from all their orders', () => {
  let topCustomer1, topCustomer2, createdOrderForTopCustomer1, app
  beforeAll(async () => {
    app = await getApp()
    const owner = await getLoggedInOwner()
    const newRestaurant = await createRestaurant(owner)

    topCustomer1 = await getNewLoggedInCustomer('Top customer 1')
    topCustomer2 = await getNewLoggedInCustomer('Top customer 2')
    const topCustomerOrderData1 = await getNewOrderData(newRestaurant, 75000)
    topCustomerOrderData1.createdAt = moment().subtract(5, 'years')
    topCustomerOrderData1.startedAt = moment().subtract(5, 'years').add(10, 'minutes')
    topCustomerOrderData1.sentAt = moment().subtract(5, 'years').add(20, 'minutes')
    topCustomerOrderData1.deliveredAt = moment().subtract(5, 'years').add(30, 'minutes')

    createdOrderForTopCustomer1 = await createOrder(topCustomer1, newRestaurant, topCustomerOrderData1)

    const topCustomerOrderData2 = await getNewOrderData(newRestaurant, 70000)
    topCustomerOrderData2.createdAt = moment().subtract(5, 'years')
    topCustomerOrderData2.startedAt = moment().subtract(5, 'years').add(10, 'minutes')
    topCustomerOrderData2.sentAt = moment().subtract(5, 'years').add(20, 'minutes')
    topCustomerOrderData2.deliveredAt = moment().subtract(5, 'years').add(30, 'minutes')

    await createOrder(topCustomer2, newRestaurant, topCustomerOrderData2)

    for (let i = 0; i < 10; i++) {
      const notTopCustomer = await getNewLoggedInCustomer()
      const orderData = await getNewOrderData(newRestaurant, 10)
      orderData.createdAt = moment().subtract(5, 'years')
      orderData.startedAt = moment().subtract(5, 'years').add(10, 'minutes')
      orderData.sentAt = moment().subtract(5, 'years').add(20, 'minutes')
      orderData.deliveredAt = moment().subtract(5, 'years').add(30, 'minutes')
      await createOrder(notTopCustomer, newRestaurant, orderData)
    }
  })
  it('Order for top customer 1 should be created', async () => {
    expect(createdOrderForTopCustomer1).toBeDefined()
    expect(createdOrderForTopCustomer1.id).toBeDefined()
    expect(createdOrderForTopCustomer1.userId).toBe(topCustomer1.id)
    expect(createdOrderForTopCustomer1.price).toBe(75000)
  })
  it('Should return 200 and both top created customers', async () => {
    const response = await request(app).get('/users/top').send()
    expect(response.status).toBe(200)
    expect(response.body.length).toBeGreaterThan(0)
    expect(response.body[0].id).toBe(topCustomer1.id)
    expect(response.body[1].id).toBe(topCustomer2.id)
    expect(response.body.every(customer => customer.userType === 'customer')).toBe(true)
    expect(response.body.every(customer => customer.password === undefined)).toBe(true)
  })

  afterAll(async () => {
    await shutdownApp()
  })
})
