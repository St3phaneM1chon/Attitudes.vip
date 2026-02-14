const router = require('express').Router()

router.post('/intent', async (req, res, next) => {
  try {
    res.json({ message: 'Create payment intent endpoint' })
  } catch (error) {
    next(error)
  }
})

module.exports = router