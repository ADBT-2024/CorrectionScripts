import request from 'supertest'
import { shutdownApp, getApp } from './utils/testApp'
import { getLoggedInCustomer, getLoggedInOwner, getNewLoggedInCustomer } from './utils/auth'
import { getFirstRestaurantOfOwner } from './utils/restaurant'
import { createProduct, getNewPaellaProductData, productHasCorrectAvgStars } from './utils/product'
import { getNewReviewData } from './utils/review'
import dotenv from 'dotenv'
dotenv.config()

describe('Reviews: Products must have avgStars', () => {
  let products
  beforeAll(async () => {
    const owner = await getLoggedInOwner()
    const restaurant = await getFirstRestaurantOfOwner(owner)
    const response = (await request(await getApp()).get(`/restaurants/${restaurant.id}/products`).send())
    products = response.body
  })
  it('All products must have avgStars', async () => {
    expect(products.every(product => productHasCorrectAvgStars(product))).toBe(true)
  })
  afterAll(async () => {
    await shutdownApp()
  })
})

describe('Reviews: Product details must have avgStars', () => {
  let products, app
  beforeAll(async () => {
    app = await getApp()
    const owner = await getLoggedInOwner()
    products = (await request(app).get(`/restaurants/${(await getFirstRestaurantOfOwner(owner)).id}/products`).send()).body
    const productDetailResponses = await Promise.all(products.map(async product => await request(app).get(`/products/${product.id}`).send()))
    products = productDetailResponses.map(productDetailResponse => productDetailResponse.body)
  })
  it('The products must have avgStars', async () => {
    expect(products.every(product => productHasCorrectAvgStars(product))).toBe(true)
  })
  it('The products must have an array of reviews', async () => {
    expect(products.every(product => product.reviews !== undefined)).toBe(true)
    expect(products.every(product => Array.isArray(product.reviews))).toBe(true)
  })
  it('The product reviews must have an id, title, body, userId, and stars', async () => {
    expect(products.every(product => product.reviews.every(review => review.id !== undefined))).toBe(true)
    expect(products.every(product => product.reviews.every(review => review.title !== undefined))).toBe(true)
    expect(products.every(product => product.reviews.every(review => review.body !== undefined))).toBe(true)
    expect(products.every(product => product.reviews.every(review => review.stars !== undefined))).toBe(true)
    expect(products.every(product => product.reviews.every(review => review.userId !== undefined))).toBe(true)
    expect(products.every(product => product.reviews.every(review => review.stars >= 0 && review.stars <= 5))).toBe(true)
  })
  afterAll(async () => {
    await shutdownApp()
  })
})

describe('Reviews: avgStars should not have value when creating product', () => {
  let owner, productData, createdProduct
  beforeAll(async () => {
    owner = await getLoggedInOwner()
    const restaurant = await getFirstRestaurantOfOwner(owner)
    productData = await getNewPaellaProductData(restaurant)
    createdProduct = (await request(await getApp()).post('/products').set('Authorization', `Bearer ${owner.token}`).send(productData)).body
  })
  it('avgStars should not be a number', async () => {
    // Check that avgStars is null or undefined
    expect(createdProduct.avgStars).not.toEqual(expect.anything())
  })
  afterAll(async () => {
    await shutdownApp()
  })
})

describe('Reviews: Create product review', () => {
  let owner, customer, productToBeReviewed, reviewData, app
  beforeAll(async () => {
    app = await getApp()
    owner = await getLoggedInOwner()
    const restaurant = await getFirstRestaurantOfOwner(owner)
    customer = await getLoggedInCustomer()
    productToBeReviewed = await createProduct(owner, restaurant)
    reviewData = getNewReviewData()
  })
  it('Should return 401 if not logged in', async () => {
    const response = await request(app).post(`/products/${productToBeReviewed.id}/reviews`).send(reviewData)
    expect(response.status).toBe(401)
  })
  it('Should return 403 when logged in as an owner', async () => {
    const response = await request(app).post(`/products/${productToBeReviewed.id}/reviews`).set('Authorization', `Bearer ${owner.token}`).send(reviewData)
    expect(response.status).toBe(403)
  })
  it('Should return 422 when invalid review data', async () => {
    const invalidReview = { ...reviewData }
    delete invalidReview.title
    delete invalidReview.body
    invalidReview.stars = -1
    const response = await request(app).post(`/products/${productToBeReviewed.id}/reviews`).set('Authorization', `Bearer ${customer.token}`).send(invalidReview)
    expect(response.status).toBe(422)
    const errorFields = response.body.errors.map(error => error.param)
    expect(['title', 'body', 'stars'].every(field => errorFields.includes(field))).toBe(true)
  })
  it('Should return 200 when valid review data', async () => {
    const response = await request(app).post(`/products/${productToBeReviewed.id}/reviews`).set('Authorization', `Bearer ${customer.token}`).send(reviewData)
    expect(response.status).toBe(200)
    expect(response.body.title).toBe(reviewData.title)
    expect(response.body.body).toBe(reviewData.body)
    expect(response.body.stars).toBe(reviewData.stars)
    expect(response.body.id).toBeDefined()
    expect(response.body.userId).toBeDefined()
  })
  afterAll(async () => {
    await shutdownApp()
  })
})

describe('Reviews: Edit review', () => {
  let owner, customer, newReview, productToBeReviewed, app
  beforeAll(async () => {
    app = await getApp()
    owner = await getLoggedInOwner()
    customer = await getLoggedInCustomer()
    const restaurant = await getFirstRestaurantOfOwner(owner)
    productToBeReviewed = await createProduct(owner, restaurant)
    const reviewData = getNewReviewData()
    newReview = (await request(app).post(`/products/${productToBeReviewed.id}/reviews`).set('Authorization', `Bearer ${customer.token}`).send(reviewData)).body
  })
  it('Should return 401 if not logged in', async () => {
    const response = await request(app).put(`/products/${productToBeReviewed.id}/reviews/${newReview.id}`).send(getNewReviewData())
    expect(response.status).toBe(401)
  })
  it('Should return 403 when logged in as an owner', async () => {
    const response = await request(app).put(`/products/${productToBeReviewed.id}/reviews/${newReview.id}`).set('Authorization', `Bearer ${owner.token}`).send(getNewReviewData())
    expect(response.status).toBe(403)
  })
  it('Should return 403 when logged in as another customer', async () => {
    const anotherCustomer = await getNewLoggedInCustomer()
    const response = await request(app).put(`/products/${productToBeReviewed.id}/reviews/${newReview.id}`).set('Authorization', `Bearer ${anotherCustomer.token}`).send(getNewReviewData())
    expect(response.status).toBe(403)
  })
  it('Should return 422 when invalid review data', async () => {
    const invalidReview = { ...getNewReviewData() }
    delete invalidReview.title
    delete invalidReview.body
    invalidReview.stars = -1
    const response = await request(app).put(`/products/${productToBeReviewed.id}/reviews/${newReview.id}`).set('Authorization', `Bearer ${customer.token}`).send(invalidReview)
    expect(response.status).toBe(422)
    const errorFields = response.body.errors.map(error => error.param)
    expect(['title', 'body', 'stars'].every(field => errorFields.includes(field))).toBe(true)
  })
  it('Should return 200 when sending a valid edited review', async () => {
    const editedReview = { ...getNewReviewData() }
    editedReview.title = `${editedReview.title} updated`
    editedReview.body = `${editedReview.body} updated`
    editedReview.stars = 1
    const response = await request(app).put(`/products/${productToBeReviewed.id}/reviews/${newReview.id}`).set('Authorization', `Bearer ${customer.token}`).send(editedReview)
    expect(response.status).toBe(200)
    expect(response.body.title).toBe(editedReview.title)
    expect(response.body.body).toBe(editedReview.body)
    expect(response.body.stars).toBe(editedReview.stars)
    expect(response.body.id).toBe(newReview.id)
    expect(response.body.userId).toBe(newReview.userId)
  })
  afterAll(async () => {
    await shutdownApp()
  })
})

describe('Reviews: Remove review', () => {
  let owner, customer, newReview, productToBeReviewed, app
  beforeAll(async () => {
    app = await getApp()
    owner = await getLoggedInOwner()
    customer = await getLoggedInCustomer()
    const restaurant = await getFirstRestaurantOfOwner(owner)
    productToBeReviewed = await createProduct(owner, restaurant)
    const reviewData = getNewReviewData()
    newReview = (await request(app).post(`/products/${productToBeReviewed.id}/reviews`).set('Authorization', `Bearer ${customer.token}`).send(reviewData)).body
  })
  it('Should return 401 if not logged in', async () => {
    const response = await request(app).delete(`/products/${productToBeReviewed.id}/reviews/${newReview.id}`).send()
    expect(response.status).toBe(401)
  })
  it('Should return 403 when logged in as an owner', async () => {
    const response = await request(app).delete(`/products/${productToBeReviewed.id}/reviews/${newReview.id}`).set('Authorization', `Bearer ${owner.token}`).send()
    expect(response.status).toBe(403)
  })
  it('Should return 403 when trying to delete a review that belongs to another customer', async () => {
    const anotherCustomer = await getNewLoggedInCustomer()
    const response = await request(app).delete(`/products/${productToBeReviewed.id}/reviews/${newReview.id}`).set('Authorization', `Bearer ${anotherCustomer.token}`).send()
    expect(response.status).toBe(403)
  })
  it('Should return 404 when trying to delete a review that does not exist', async () => {
    const response = await request(app).delete(`/products/${productToBeReviewed.id}/reviews/invalidId`).set('Authorization', `Bearer ${customer.token}`).send()
    expect(response.status).toBe(404)
  })
  it('Should return 200', async () => {
    const response = await request(app).delete(`/products/${productToBeReviewed.id}/reviews/${newReview.id}`).set('Authorization', `Bearer ${customer.token}`).send()
    expect(response.status).toBe(200)
  })
  it('Should return 404 when trying to delete a review already deleted', async () => {
    const response = await request(app).delete(`/products/${productToBeReviewed.id}/reviews/${newReview.id}`).set('Authorization', `Bearer ${customer.token}`).send()
    expect(response.status).toBe(404)
  })

  afterAll(async () => {
    await shutdownApp()
  })
})

describe('Reviews: Check avgStars computation', () => {
  let customer, firstReview, secondReview, productToBeReviewed, app
  beforeAll(async () => {
    app = await getApp()
    const owner = await getLoggedInOwner()
    customer = await getLoggedInCustomer()
    const restaurant = await getFirstRestaurantOfOwner(owner)
    productToBeReviewed = await createProduct(owner, restaurant)
  })
  it('AvgStars should be null when no reviews', async () => {
    const productDetail = (await request(app).get(`/products/${productToBeReviewed.id}`).send()).body
    expect(productDetail.avgStars).toBe(null)
  })
  it('AvgStars should be 0 when 1 review with 0 stars', async () => {
    const reviewData = getNewReviewData()
    reviewData.stars = 0
    firstReview = (await request(app).post(`/products/${productToBeReviewed.id}/reviews`).set('Authorization', `Bearer ${customer.token}`).send(reviewData)).body
    const productDetail = (await request(app).get(`/products/${productToBeReviewed.id}`).send()).body
    expect(productDetail.avgStars).toBe(0)
  })
  it('AvgStars should be null after removing the only review', async () => {
    await request(app).delete(`/products/${productToBeReviewed.id}/reviews/${firstReview.id}`).set('Authorization', `Bearer ${customer.token}`).send()
    const productDetail = (await request(app).get(`/products/${productToBeReviewed.id}`).send()).body
    expect(productDetail.avgStars).toBe(null)
  })
  it('AvgStars should be 5 when adding a review with 5 stars', async () => {
    const reviewData = getNewReviewData()
    reviewData.stars = 5
    await request(app).post(`/products/${productToBeReviewed.id}/reviews`).set('Authorization', `Bearer ${customer.token}`).send(reviewData)
    const productDetail = (await request(app).get(`/products/${productToBeReviewed.id}`).send()).body
    expect(productDetail.avgStars).toBe(5)
  })
  it('AvgStars should be 3.5 when adding a second review with 2 stars', async () => {
    const reviewData = getNewReviewData()
    reviewData.stars = 2
    secondReview = (await request(app).post(`/products/${productToBeReviewed.id}/reviews`).set('Authorization', `Bearer ${customer.token}`).send(reviewData)).body
    const productDetail = (await request(app).get(`/products/${productToBeReviewed.id}`).send()).body
    expect(productDetail.avgStars).toBe(3.5)
  })
  it('AvgStars should be 4 when editing the second review to 3 stars', async () => {
    const reviewData = getNewReviewData()
    reviewData.stars = 3
    await request(app).put(`/products/${productToBeReviewed.id}/reviews/${secondReview.id}`).set('Authorization', `Bearer ${customer.token}`).send(reviewData)
    const productDetail = (await request(app).get(`/products/${productToBeReviewed.id}`).send()).body
    expect(productDetail.avgStars).toBe(4)
  })
  it('AvgStars should be 5 when removing the second review', async () => {
    await request(app).delete(`/products/${productToBeReviewed.id}/reviews/${secondReview.id}`).set('Authorization', `Bearer ${customer.token}`).send()
    const productDetail = (await request(app).get(`/products/${productToBeReviewed.id}`).send()).body
    expect(productDetail.avgStars).toBe(5)
  })
  afterAll(async () => {
    await shutdownApp()
  })
})

describe('Reviews: Get owner restaurant details', () => {
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
  it('The products must have avgStars', async () => {
    expect(ownerRestaurantsWithDetails.every(restaurant => restaurant.products.every(product => product.avgStars !== undefined))).toBe(true)
    expect(ownerRestaurantsWithDetails.every(restaurant => restaurant.products.every(product => product.avgStars >= 0 && product.avgStars <= 5))).toBe(true)
  })
  afterAll(async () => {
    await shutdownApp()
  })
})
