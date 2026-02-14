const router = require('express').Router()

router.get('/', async (req, res, next) => {
  try {
    res.json({ message: 'List weddings endpoint' })
  } catch (error) {
    next(error)
  }
})

router.post('/', async (req, res, next) => {
  try {
    res.json({ message: 'Create wedding endpoint' })
  } catch (error) {
    next(error)
  }
})

module.exports = router