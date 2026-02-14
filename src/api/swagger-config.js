/**
 * Configuration Swagger/OpenAPI
 * Documentation automatique de l'API
 */

const swaggerJsdoc = require('swagger-jsdoc')
const swaggerUi = require('swagger-ui-express')

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Attitudes.vip API',
    version: '1.0.0',
    description: 'API complète pour la plateforme de gestion de mariages Attitudes.vip',
    termsOfService: 'https://attitudes.vip/terms',
    contact: {
      name: 'API Support',
      email: 'api@attitudes.vip',
      url: 'https://attitudes.vip/support'
    },
    license: {
      name: 'Proprietary',
      url: 'https://attitudes.vip/license'
    }
  },
  servers: [
    {
      url: 'http://localhost:3000/api/v1',
      description: 'Development server'
    },
    {
      url: 'https://staging.attitudes.vip/api/v1',
      description: 'Staging server'
    },
    {
      url: 'https://api.attitudes.vip/v1',
      description: 'Production server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtenu via /auth/login'
      },
      apiKey: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'Clé API pour les intégrations externes'
      }
    },
    schemas: {
      // Schémas réutilisables
      Error: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false
          },
          error: {
            type: 'string',
            example: 'Error message'
          },
          code: {
            type: 'string',
            example: 'ERROR_CODE'
          }
        }
      },
      Pagination: {
        type: 'object',
        properties: {
          page: {
            type: 'integer',
            example: 1
          },
          limit: {
            type: 'integer',
            example: 20
          },
          total: {
            type: 'integer',
            example: 100
          },
          pages: {
            type: 'integer',
            example: 5
          }
        }
      },
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            example: '123e4567-e89b-12d3-a456-426614174000'
          },
          email: {
            type: 'string',
            format: 'email',
            example: 'user@example.com'
          },
          name: {
            type: 'string',
            example: 'John Doe'
          },
          role: {
            type: 'string',
            enum: ['customer', 'vendor', 'admin', 'client'],
            example: 'customer'
          },
          created_at: {
            type: 'string',
            format: 'date-time'
          }
        }
      },
      Wedding: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid'
          },
          couple_names: {
            type: 'string',
            example: 'Marie & Jean'
          },
          date: {
            type: 'string',
            format: 'date',
            example: '2024-08-15'
          },
          venue: {
            type: 'string',
            example: 'Château de Versailles'
          },
          guest_count: {
            type: 'integer',
            example: 150
          },
          budget: {
            type: 'number',
            example: 50000
          },
          status: {
            type: 'string',
            enum: ['planning', 'active', 'completed', 'cancelled'],
            example: 'planning'
          }
        }
      },
      Vendor: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid'
          },
          name: {
            type: 'string',
            example: 'Elite Photography'
          },
          type: {
            type: 'string',
            enum: ['photographer', 'dj', 'caterer', 'venue', 'florist', 'planner'],
            example: 'photographer'
          },
          description: {
            type: 'string'
          },
          base_price: {
            type: 'number',
            example: 2500
          },
          rating: {
            type: 'number',
            format: 'float',
            minimum: 0,
            maximum: 5,
            example: 4.8
          },
          review_count: {
            type: 'integer',
            example: 47
          }
        }
      }
    },
    responses: {
      UnauthorizedError: {
        description: 'Token d\'authentification manquant ou invalide',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      },
      NotFoundError: {
        description: 'Ressource non trouvée',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      },
      ValidationError: {
        description: 'Erreur de validation des données',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: {
                  type: 'boolean',
                  example: false
                },
                errors: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field: {
                        type: 'string'
                      },
                      message: {
                        type: 'string'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  tags: [
    {
      name: 'Authentication',
      description: 'Endpoints d\'authentification et gestion des sessions'
    },
    {
      name: 'Users',
      description: 'Gestion des utilisateurs'
    },
    {
      name: 'Weddings',
      description: 'Gestion des mariages'
    },
    {
      name: 'Vendors',
      description: 'Gestion des prestataires'
    },
    {
      name: 'Bookings',
      description: 'Réservations et planification'
    },
    {
      name: 'Payments',
      description: 'Paiements et transactions'
    },
    {
      name: 'Notifications',
      description: 'Système de notifications'
    },
    {
      name: 'Analytics',
      description: 'Statistiques et rapports'
    }
  ]
}

const options = {
  definition: swaggerDefinition,
  apis: [
    './src/routes/*.js',
    './src/routes/**/*.js',
    './src/api/docs/*.yaml'
  ]
}

const swaggerSpec = swaggerJsdoc(options)

// Configuration personnalisée de Swagger UI
const swaggerUiOptions = {
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 20px 0 }
    .swagger-ui .info .title { color: #7C3AED }
  `,
  customSiteTitle: 'Attitudes.vip API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    tryItOutEnabled: true
  }
}

function setupSwagger (app) {
  // Documentation JSON
  app.get('/api/v1/swagger.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json')
    res.send(swaggerSpec)
  })

  // Documentation UI
  app.use(
    '/api/v1/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, swaggerUiOptions)
  )

  // Redirection racine API vers docs
  app.get('/api/v1', (req, res) => {
    res.redirect('/api/v1/docs')
  })

  console.log('📚 API Documentation available at /api/v1/docs')
}

module.exports = {
  setupSwagger,
  swaggerSpec
}
