/**
 * Client d'authentification Attitudes.vip
 * Gère l'authentification côté frontend pour tous les dashboards
 */

class AuthClient {
  constructor () {
    this.baseUrl = window.location.origin
    this.token = this.getStoredToken()
    this.user = null
    this.isAuthenticated = false

    // Initialisation
    this.init()
  }

  // Initialisation du client
  async init () {
    if (this.token) {
      try {
        await this.verifyToken()
      } catch (error) {
        this.logout()
      }
    } else {
      this.redirectToLogin()
    }
  }

  // Récupération du token stocké
  getStoredToken () {
    return localStorage.getItem('authToken') ||
           this.getTokenFromUrl() ||
           this.getTokenFromCookie()
  }

  // Extraction du token depuis l'URL
  getTokenFromUrl () {
    const urlParams = new URLSearchParams(window.location.search)
    return urlParams.get('token')
  }

  // Extraction du token depuis les cookies
  getTokenFromCookie () {
    const cookies = document.cookie.split(';')
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=')
      if (name === 'authToken') {
        return value
      }
    }
    return null
  }

  // Stockage du token
  storeToken (token) {
    this.token = token
    localStorage.setItem('authToken', token)

    // Stockage en cookie pour compatibilité
    document.cookie = `authToken=${token}; path=/; max-age=${24 * 60 * 60}; secure; samesite=strict`
  }

  // Vérification du token
  async verifyToken () {
    try {
      const response = await fetch(`${this.baseUrl}/auth/verify`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        this.user = data.user
        this.isAuthenticated = true
        this.onAuthSuccess(data.user)
        return data.user
      } else {
        throw new Error('Token invalide')
      }
    } catch (error) {
      console.error('Erreur de vérification du token:', error)
      throw error
    }
  }

  // Authentification OAuth2
  authenticate (provider) {
    const authUrl = `${this.baseUrl}/auth/${provider}`
    window.location.href = authUrl
  }

  // Déconnexion
  logout () {
    this.token = null
    this.user = null
    this.isAuthenticated = false

    // Nettoyage du stockage
    localStorage.removeItem('authToken')
    document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'

    // Redirection vers la page de login
    this.redirectToLogin()
  }

  // Redirection vers la page de login
  redirectToLogin () {
    const currentUrl = encodeURIComponent(window.location.href)
    window.location.href = `${this.baseUrl}/login?redirect=${currentUrl}`
  }

  // Vérification des permissions
  hasPermission (permission) {
    if (!this.user || !this.user.permissions) {
      return false
    }

    return this.user.permissions.includes('*') ||
           this.user.permissions.includes(permission)
  }

  // Vérification du rôle
  hasRole (role) {
    if (!this.user) {
      return false
    }

    return this.user.role === role || this.user.role === 'cio'
  }

  // Vérification de l'accès au tenant
  hasTenantAccess (tenant) {
    if (!this.user) {
      return false
    }

    return this.user.role === 'cio' ||
           this.user.tenant === tenant ||
           this.user.tenant === 'attitudes-vip'
  }

  // Requête API authentifiée
  async apiRequest (url, options = {}) {
    if (!this.token) {
      throw new Error('Token manquant')
    }

    const defaultOptions = {
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    }

    const finalOptions = { ...defaultOptions, ...options }

    try {
      const response = await fetch(url, finalOptions)

      if (response.status === 401) {
        // Token expiré
        this.logout()
        return
      }

      if (response.status === 403) {
        // Permissions insuffisantes
        this.onPermissionDenied()
        return
      }

      return response
    } catch (error) {
      console.error('Erreur API:', error)
      throw error
    }
  }

  // Refresh du token
  async refreshToken () {
    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          refreshToken: this.token
        })
      })

      if (response.ok) {
        const data = await response.json()
        this.storeToken(data.token)
        return data.token
      } else {
        throw new Error('Échec du refresh token')
      }
    } catch (error) {
      console.error('Erreur refresh token:', error)
      this.logout()
    }
  }

  // Gestion des événements d'authentification
  onAuthSuccess (user) {
    // Événement personnalisé pour notifier les autres composants
    window.dispatchEvent(new CustomEvent('auth:success', {
      detail: { user }
    }))

    // Mise à jour de l'interface utilisateur
    this.updateUI(user)
  }

  onPermissionDenied () {
    window.dispatchEvent(new CustomEvent('auth:permission-denied'))

    // Affichage d'un message d'erreur
    this.showError('Vous n\'avez pas les permissions nécessaires pour cette action.')
  }

  // Mise à jour de l'interface utilisateur
  updateUI (user) {
    // Mise à jour du nom d'utilisateur
    const userNameElements = document.querySelectorAll('[data-auth="user-name"]')
    userNameElements.forEach(element => {
      element.textContent = user.name
    })

    // Mise à jour de l'avatar
    const avatarElements = document.querySelectorAll('[data-auth="user-avatar"]')
    avatarElements.forEach(element => {
      if (user.avatar) {
        element.src = user.avatar
        element.style.display = 'block'
      }
    })

    // Affichage/masquage des éléments selon les permissions
    this.updatePermissionBasedUI(user)
  }

  // Mise à jour de l'UI selon les permissions
  updatePermissionBasedUI (user) {
    // Masquage des éléments sans permission
    document.querySelectorAll('[data-require-permission]').forEach(element => {
      const requiredPermission = element.getAttribute('data-require-permission')
      if (!this.hasPermission(requiredPermission)) {
        element.style.display = 'none'
      }
    })

    // Masquage des éléments selon le rôle
    document.querySelectorAll('[data-require-role]').forEach(element => {
      const requiredRole = element.getAttribute('data-require-role')
      if (!this.hasRole(requiredRole)) {
        element.style.display = 'none'
      }
    })

    // Mise à jour du menu de navigation
    this.updateNavigation(user)
  }

  // Mise à jour de la navigation
  updateNavigation (user) {
    const navItems = document.querySelectorAll('[data-nav-item]')
    navItems.forEach(item => {
      const requiredRole = item.getAttribute('data-nav-role')
      const requiredPermission = item.getAttribute('data-nav-permission')

      let shouldShow = true

      if (requiredRole && !this.hasRole(requiredRole)) {
        shouldShow = false
      }

      if (requiredPermission && !this.hasPermission(requiredPermission)) {
        shouldShow = false
      }

      item.style.display = shouldShow ? 'block' : 'none'
    })
  }

  // Affichage d'un message d'erreur
  showError (message) {
    // Création d'un toast d'erreur
    const toast = document.createElement('div')
    toast.className = 'error-toast'
    toast.textContent = message
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ef4444;
      color: white;
      padding: 1rem;
      border-radius: 0.5rem;
      z-index: 1000;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    `

    document.body.appendChild(toast)

    // Suppression automatique après 5 secondes
    setTimeout(() => {
      toast.remove()
    }, 5000)
  }

  // Gestion des erreurs réseau
  handleNetworkError (error) {
    console.error('Erreur réseau:', error)

    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      this.showError('Erreur de connexion. Vérifiez votre connexion internet.')
    }
  }

  // Configuration des intercepteurs pour les requêtes fetch
  setupInterceptors () {
    const originalFetch = window.fetch

    window.fetch = async (url, options = {}) => {
      try {
        const response = await originalFetch(url, options)

        if (response.status === 401) {
          // Tentative de refresh du token
          await this.refreshToken()

          // Retry de la requête originale
          if (this.token) {
            const newOptions = { ...options }
            if (newOptions.headers) {
              newOptions.headers.Authorization = `Bearer ${this.token}`
            }
            return originalFetch(url, newOptions)
          }
        }

        return response
      } catch (error) {
        this.handleNetworkError(error)
        throw error
      }
    }
  }
}

// Export pour utilisation dans les modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AuthClient
} else {
  // Utilisation globale dans le navigateur
  window.AuthClient = AuthClient

  // Initialisation automatique si le script est chargé
  document.addEventListener('DOMContentLoaded', () => {
    window.authClient = new AuthClient()
    window.authClient.setupInterceptors()
  })
}
