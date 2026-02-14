const router = require('express').Router()

router.get('/:role', async (req, res, next) => {
  try {
    const { role } = req.params
    res.json({ message: `Dashboard for ${role}` })
  } catch (error) {
    next(error)
  }
})

module.exports = router