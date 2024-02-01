import { review } from './testData'

const getNewReviewData = (stars) => {
  const newReview = { ...review }
  if (stars) { newReview.stars = stars }
  return newReview
}

export { getNewReviewData }
