const router = require('express').Router()
const { AppError, errorCodes } = require('../middleware/error-handler')

// Routes d'authentification placeholder
router.post('/register', async (req, res, next) => {
  try {
    // TODO: Implémenter l'inscription
    res.json({ message: 'Register endpoint' })
  } catch (error) {
    next(error)
  }
})

router.post('/login', async (req, res, next) => {
  try {
    // TODO: Implémenter la connexion
    res.json({ message: 'Login endpoint' })
  } catch (error) {
    next(error)
  }
})

router.post('/logout', async (req, res, next) => {
  try {
    // TODO: Implémenter la déconnexion
    res.json({ message: 'Logout endpoint' })
  } catch (error) {
    next(error)
  }
})

module.exports = router