const router = require('express').Router()

router.get('/profile', async (req, res, next) => {
  try {
    res.json({ message: 'User profile endpoint' })
  } catch (error) {
    next(error)
  }
})

module.exports = router