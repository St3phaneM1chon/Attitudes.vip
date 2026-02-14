const router = require('express').Router()

router.get('/', async (req, res, next) => {
  try {
    res.json({ message: 'List vendors endpoint' })
  } catch (error) {
    next(error)
  }
})

module.exports = router