/**
 * Routes des dashboards
 * Gestion du routage selon le type d'utilisateur
 */

const express = require('express')
const router = express.Router()
const { authenticate } = require('../middleware/auth')
const { authorize } = require('../middleware/authorize')
const path = require('path')

// Middleware pour vérifier l'accès au dashboard
const checkDashboardAccess = async (req, res, next) => {
  const { user } = req

  if (!user) {
    return res.redirect('/login')
  }

  // Vérifier que l'utilisateur a accès à un mariage
  if (!user.current_wedding_id && user.role !== 'admin') {
    return res.redirect('/onboarding')
  }

  next()
}

// Route principale - Redirection selon le rôle
router.get('/', authenticate, checkDashboardAccess, (req, res) => {
  const { user } = req

  // Rediriger selon le rôle
  switch (user.role) {
    case 'admin':
      res.redirect('/dashboard/admin')
      break
    case 'couple:owner':
    case 'couple:partner':
      res.redirect('/dashboard/customer')
      break
    case 'vendor:dj':
      res.redirect('/dashboard/dj')
      break
    case 'vendor:photographer':
      res.redirect('/dashboard/photographer')
      break
    case 'vendor:caterer':
      res.redirect('/dashboard/caterer')
      break
    case 'wedding:planner':
      res.redirect('/dashboard/wedding-planner')
      break
    case 'guest':
      res.redirect('/dashboard/guest')
      break
    default:
      res.status(403).json({ error: 'Rôle non reconnu' })
  }
})

// Dashboard Customer (Couples)
router.get('/customer',
  authenticate,
  authorize(['couple:owner', 'couple:partner']),
  checkDashboardAccess,
  (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/dashboards/customer.html'))
  }
)

// Dashboard DJ
router.get('/dj',
  authenticate,
  authorize(['vendor:dj']),
  checkDashboardAccess,
  (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/dashboards/dj.html'))
  }
)

// Dashboard Admin
router.get('/admin',
  authenticate,
  authorize(['admin', 'tenant:admin']),
  (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/dashboards/admin.html'))
  }
)

// Dashboard Wedding Planner
router.get('/wedding-planner',
  authenticate,
  authorize(['wedding:planner']),
  checkDashboardAccess,
  (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/dashboards/wedding-planner.html'))
  }
)

// Dashboard Photographe
router.get('/photographer',
  authenticate,
  authorize(['vendor:photographer']),
  checkDashboardAccess,
  (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/dashboards/photographer.html'))
  }
)

// Dashboard Traiteur
router.get('/caterer',
  authenticate,
  authorize(['vendor:caterer']),
  checkDashboardAccess,
  (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/dashboards/caterer.html'))
  }
)

// Dashboard Invité
router.get('/guest',
  authenticate,
  authorize(['guest:standard', 'guest:vip']),
  checkDashboardAccess,
  (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/dashboards/guest.html'))
  }
)

// API pour les données du dashboard
router.get('/api/stats/:weddingId',
  authenticate,
  async (req, res) => {
    try {
      const { weddingId } = req.params
      const { user } = req

      // Vérifier l'accès au mariage
      const hasAccess = await checkWeddingAccess(user.id, weddingId)
      if (!hasAccess) {
        return res.status(403).json({ error: 'Accès refusé' })
      }

      // Récupérer les statistiques selon le rôle
      const stats = await getDashboardStats(weddingId, user.role)

      res.json(stats)
    } catch (error) {
      console.error('Erreur récupération stats:', error)
      res.status(500).json({ error: 'Erreur serveur' })
    }
  }
)

// Fonction pour vérifier l'accès au mariage
async function checkWeddingAccess (userId, weddingId) {
  // Implémenter la vérification selon votre logique
  // Ex: vérifier dans la table user_weddings
  return true // Placeholder
}

// Fonction pour récupérer les stats du dashboard
async function getDashboardStats (weddingId, userRole) {
  const stats = {
    wedding: {
      id: weddingId
      // Données de base du mariage
    }
  }

  // Ajouter des stats spécifiques selon le rôle
  switch (userRole) {
    case 'couple:owner':
    case 'couple:partner':
      stats.guests = await getGuestStats(weddingId)
      stats.budget = await getBudgetStats(weddingId)
      stats.tasks = await getTaskStats(weddingId)
      stats.vendors = await getVendorStats(weddingId)
      break

    case 'vendor:dj':
      stats.schedule = await getEventSchedule(weddingId)
      stats.musicRequests = await getMusicRequests(weddingId)
      stats.equipment = await getEquipmentStatus(weddingId)
      break

    case 'vendor:photographer':
      stats.albums = await getPhotoAlbums(weddingId)
      stats.schedule = await getPhotoSchedule(weddingId)
      break

    // Autres rôles...
  }

  return stats
}

// Placeholder pour les fonctions de stats
async function getGuestStats (weddingId) {
  return {
    total: 150,
    confirmed: 120,
    pending: 20,
    declined: 10
  }
}

async function getBudgetStats (weddingId) {
  return {
    total: 50000,
    spent: 35000,
    remaining: 15000
  }
}

async function getTaskStats (weddingId) {
  return {
    total: 50,
    completed: 30,
    inProgress: 10,
    pending: 10
  }
}

async function getVendorStats (weddingId) {
  return {
    total: 8,
    confirmed: 6,
    pending: 2
  }
}

async function getEventSchedule (weddingId) {
  return [
    { time: '14:00', event: 'Cérémonie' },
    { time: '15:00', event: 'Cocktail' },
    { time: '19:00', event: 'Dîner' },
    { time: '22:00', event: 'Soirée dansante' }
  ]
}

async function getMusicRequests (weddingId) {
  return []
}

async function getEquipmentStatus (weddingId) {
  return {
    sound: 'OK',
    lights: 'OK',
    microphones: 'OK'
  }
}

async function getPhotoAlbums (weddingId) {
  return []
}

async function getPhotoSchedule (weddingId) {
  return []
}

module.exports = router
