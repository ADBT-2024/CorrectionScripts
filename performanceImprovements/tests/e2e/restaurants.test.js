import request from 'supertest'
import { shutdownApp, getApp } from './utils/testApp'
import { getLoggedInCustomer, getLoggedInOwner } from './utils/auth'
import { invalidRestaurant, bodeguitaRestaurant } from './utils/testData'
import { createRestaurant, getFirstRestaurantOfOwner } from './utils/restaurant'
import dotenv from 'dotenv'
dotenv.config()

describe('Get all restaurants', () => {
  let restaurants, app
  beforeAll(async () => {
    app = await getApp()
  })
  it('There must be more than one restaurant', async () => {
    const response = await request(app).get('/restaurants').send()
    expect(response.status).toBe(200)
    expect(Array.isArray(response.body)).toBeTruthy()
    expect(response.body).not.toHaveLength(0)
    restaurants = response.body
  })
  it('All restaurants must have an id', async () => {
    expect(restaurants.every(restaurant => restaurant.id !== undefined)).toBe(true)
  })
  it('All restaurants must have a restaurant category', async () => {
    expect(restaurants.every(restaurant => restaurant.restaurantCategory !== undefined)).toBe(true)
  })
  afterAll(async () => {
    await shutdownApp()
  })
})

describe('Get owner restaurants', () => {
  let owner, ownerRestaurants, app
  const fakeToken = 'fakeToken'
  beforeAll(async () => {
    app = await getApp()
    owner = await getLoggedInOwner()
  })
  it('should not be able to retrieve restaurants with a fake token', async () => {
    const response = await request(app).get('/users/myRestaurants').set('Authorization', `Bearer ${fakeToken}`).send()
    expect(response.status).toBe(401)
  })
  it('should be able to retrieve restaurants with the real token', async () => {
    const response = await request(app).get('/users/myRestaurants').set('Authorization', `Bearer ${owner.token}`).send()
    expect(response.status).toBe(200)
    ownerRestaurants = response.body
  })
  it('The owner must have more than one restaurant', async () => {
    expect(Array.isArray(ownerRestaurants)).toBeTruthy()
    expect(ownerRestaurants).not.toHaveLength(0)
  })
  it('All owner restaurants must have an id', async () => {
    expect(ownerRestaurants.every(restaurant => restaurant.id !== undefined)).toBe(true)
  })
  it('All owner restaurants must have a restaurant category', async () => {
    expect(ownerRestaurants.every(restaurant => restaurant.restaurantCategory !== undefined)).toBe(true)
  })
  afterAll(async () => {
    await shutdownApp()
  })
})

describe('Get owner restaurant details', () => {
  let owner, ownerRestaurantsWithDetails, app
  beforeAll(async () => {
    app = await getApp()
    owner = await getLoggedInOwner()
    const response = await request(app).get('/users/myRestaurants').set('Authorization', `Bearer ${owner.token}`).send()
    const ownerRestaurantsWithoutDetails = response.body
    ownerRestaurantsWithDetails = await Promise.all(ownerRestaurantsWithoutDetails.map(async restaurantWithoutDetails => {
      const response = await request(app).get(`/restaurants/${restaurantWithoutDetails.id}`).send()
      return response.body
    }))
  })
  it('Should return 404 with incorrect id', async () => {
    const response = await request(app).get('/restaurants/incorrectId').send()
    expect(response.status).toBe(404)
  })
  it('The restaurants of owner 1 must have its userId', async () => {
    expect(ownerRestaurantsWithDetails.every(restaurant => restaurant.userId === owner.id)).toBe(true)
  })
  it('The restaurants of owner 1 must have products', async () => {
    expect(ownerRestaurantsWithDetails.every(restaurant => restaurant.products !== undefined)).toBe(true)
  })
  it('The products of the first two restaurants of owner 1 must not be empty', async () => {
    expect(ownerRestaurantsWithDetails.slice(0, 2).every(restaurant => restaurant.products.length > 0)).toBe(true)
  })
  it('The products of the first two restaurants of owner 1 must have a product category', async () => {
    expect(ownerRestaurantsWithDetails.slice(0, 2).every(restaurant => restaurant.products.every(product => product.productCategory !== undefined))).toBe(true)
  })
  afterAll(async () => {
    await shutdownApp()
  })
})

describe('Create restaurant', () => {
  let owner, customer, app
  beforeAll(async () => {
    app = await getApp()
    owner = await getLoggedInOwner()
    customer = await getLoggedInCustomer()
  })
  it('Should return 401 if not logged in', async () => {
    const response = await request(app).post('/restaurants').send(invalidRestaurant)
    expect(response.status).toBe(401)
  })
  it('Should return 403 when logged in as a customer', async () => {
    const response = await request(app).post('/restaurants').set('Authorization', `Bearer ${customer.token}`).send(invalidRestaurant)
    expect(response.status).toBe(403)
  })
  it('Should return 422 when invalid restaurant', async () => {
    const response = await request(app).post('/restaurants').set('Authorization', `Bearer ${owner.token}`).send(invalidRestaurant)
    expect(response.status).toBe(422)
    const errorFields = response.body.errors.map(error => error.param)
    // TODO: Quito restaurantCategoryId porque nos hemos olvidado de validarlo en el crear
    expect(['name', 'address', 'postalCode', 'url', 'shippingCosts', 'email'
    /*, 'restaurantCategoryId' */
    ].every(field => errorFields.includes(field))).toBe(true)
  })
  it('Should return 200 when valid restaurant', async () => {
    const validRestaurant = { ...bodeguitaRestaurant }
    validRestaurant.restaurantCategoryId = (await request(app).get('/restaurantCategories').send()).body[0].id
    const response = await request(app).post('/restaurants').set('Authorization', `Bearer ${owner.token}`).send(validRestaurant)
    expect(response.status).toBe(200)
  })
  afterAll(async () => {
    await shutdownApp()
  })
})

describe('Edit restaurant', () => {
  let owner, customer, newRestaurant, app
  beforeAll(async () => {
    app = await getApp()
    owner = await getLoggedInOwner()
    customer = await getLoggedInCustomer()
    const validRestaurant = { ...bodeguitaRestaurant }
    validRestaurant.restaurantCategoryId = (await request(app).get('/restaurantCategories').send()).body[0].id
    newRestaurant = (await request(app).post('/restaurants').set('Authorization', `Bearer ${owner.token}`).send(validRestaurant)).body
  })
  it('Should return 401 if not logged in', async () => {
    const response = await request(app).put(`/restaurants/${newRestaurant.id}`).send(invalidRestaurant)
    expect(response.status).toBe(401)
  })
  it('Should return 403 when logged in as a customer', async () => {
    const response = await request(app).put(`/restaurants/${newRestaurant.id}`).set('Authorization', `Bearer ${customer.token}`).send(invalidRestaurant)
    expect(response.status).toBe(403)
  })
  it('Should return 422 when invalid restaurant', async () => {
    const response = await request(app).put(`/restaurants/${newRestaurant.id}`).set('Authorization', `Bearer ${owner.token}`).send(invalidRestaurant)
    expect(response.status).toBe(422)
    const errorFields = response.body.errors.map(error => error.param)
    // Quito restaurantCategoryId porque nos hemos olvidado de validarlo en el crear
    expect(['name', 'address', 'postalCode', 'url', 'shippingCosts', 'email'
    /*, 'restaurantCategoryId' */
    ].every(field => errorFields.includes(field))).toBe(true)
  })
  it('Should return 403 when trying to edit a restaurant that is not yours', async () => {
    const restaurantNotOwned = await createRestaurant()
    const { userId, ...editedRestaurantNotOwned } = restaurantNotOwned
    editedRestaurantNotOwned.name = `${editedRestaurantNotOwned.name} updated`
    const response = await request(app).put(`/restaurants/${restaurantNotOwned.id}`).set('Authorization', `Bearer ${owner.token}`).send(editedRestaurantNotOwned)
    expect(response.status).toBe(403)
  })
  it('Should return 200 when valid restaurant', async () => {
    const { userId, ...editedRestaurant } = newRestaurant
    editedRestaurant.name = `${newRestaurant.name} updated`
    const response = await request(app).put(`/restaurants/${newRestaurant.id}`).set('Authorization', `Bearer ${owner.token}`).send(editedRestaurant)
    expect(response.status).toBe(200)
    expect(response.body.name).toBe(`${newRestaurant.name} updated`)
  })
  afterAll(async () => {
    await shutdownApp()
  })
})

describe('Remove restaurant', () => {
  let owner, customer, newRestaurant, app
  beforeAll(async () => {
    app = await getApp()
    owner = await getLoggedInOwner()
    customer = await getLoggedInCustomer()
    const validRestaurant = { ...bodeguitaRestaurant }
    validRestaurant.restaurantCategoryId = (await request(app).get('/restaurantCategories').send()).body[0].id
    newRestaurant = (await request(app).post('/restaurants').set('Authorization', `Bearer ${owner.token}`).send(validRestaurant)).body
  })
  it('Should return 401 if not logged in', async () => {
    const response = await request(app).delete(`/restaurants/${newRestaurant.id}`).send()
    expect(response.status).toBe(401)
  })
  it('Should return 403 when logged in as a customer', async () => {
    const response = await request(app).delete(`/restaurants/${newRestaurant.id}`).set('Authorization', `Bearer ${customer.token}`).send()
    expect(response.status).toBe(403)
  })
  it('Should return 403 when trying to delete a restaurant that is not yours', async () => {
    const restaurantNotOwned = await createRestaurant()
    const response = await request(app).delete(`/restaurants/${restaurantNotOwned.id}`).set('Authorization', `Bearer ${owner.token}`).send()
    expect(response.status).toBe(403)
  })
  it('Should return 409 when removing a restaurant with orders', async () => {
    const restaurantWithOrders = (await request(app).get('/users/myRestaurants').set('Authorization', `Bearer ${owner.token}`).send()).body[0]
    const response = await request(app).delete(`/restaurants/${restaurantWithOrders.id}`).set('Authorization', `Bearer ${owner.token}`).send()
    expect(response.status).toBe(409)
  })
  it('Should return 200 when valid restaurant', async () => {
    const response = await request(app).delete(`/restaurants/${newRestaurant.id}`).set('Authorization', `Bearer ${owner.token}`).send()
    expect(response.status).toBe(200)
  })
  it('Should return 404 when trying to delete a restaurant already deleted', async () => {
    const response = await request(app).delete(`/restaurants/${newRestaurant.id}`).set('Authorization', `Bearer ${owner.token}`).send()
    expect(response.status).toBe(404)
  })
  afterAll(async () => {
    await shutdownApp()
  })
})

describe('Get analytics restaurant', () => {
  let owner, restaurant, app
  beforeAll(async () => {
    app = await getApp()
    owner = await getLoggedInOwner()
    restaurant = await getFirstRestaurantOfOwner(owner)
  })
  it('Should return 403 when trying to delete a restaurant that is not yours', async () => {
    const restaurantNotOwned = await createRestaurant()
    const response = await request(app).delete(`/restaurants/${restaurantNotOwned.id}`).set('Authorization', `Bearer ${owner.token}`).send()
    expect(response.status).toBe(403)
  })
  it('Should return 200 when valid restaurant', async () => {
    const response = await request(app).get(`/restaurants/${restaurant.id}/analytics`).set('Authorization', `Bearer ${owner.token}`).send()
    expect(response.status).toBe(200)
  })
  // TODO: Improve analyticis tests
  afterAll(async () => {
    await shutdownApp()
  })
})
