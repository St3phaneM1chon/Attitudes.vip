const { Sequelize, DataTypes } = require('sequelize')
const logger = require('../utils/logger')

// Configuration de la connexion
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  logging: (msg) => logger.debug(msg),
  pool: {
    max: 10,
    min: 2,
    acquire: 30000,
    idle: 10000
  },
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' ? {
      require: true,
      rejectUnauthorized: false
    } : false
  }
})

// Import des modèles
const User = require('./user')(sequelize, DataTypes)
const Client = require('./client')(sequelize, DataTypes)
const Wedding = require('./wedding')(sequelize, DataTypes)
const Invite = require('./invite')(sequelize, DataTypes)
const Vendor = require('./vendor')(sequelize, DataTypes)
const Payment = require('./payment')(sequelize, DataTypes)
const Notification = require('./notification')(sequelize, DataTypes)
const Session = require('./session')(sequelize, DataTypes)

// Définir les associations
const models = {
  User,
  Client,
  Wedding,
  Invite,
  Vendor,
  Payment,
  Notification,
  Session
}

// Associations User
User.belongsTo(Client, { foreignKey: 'clientId' })
User.hasMany(Wedding, { as: 'WeddingsAsOwner', foreignKey: 'ownerId' })
User.hasMany(Notification, { foreignKey: 'userId' })
User.hasMany(Session, { foreignKey: 'userId' })

// Associations Client (Multi-tenant)
Client.hasMany(User, { foreignKey: 'clientId' })
Client.hasMany(Wedding, { foreignKey: 'clientId' })
Client.hasMany(Vendor, { foreignKey: 'clientId' })

// Associations Wedding
Wedding.belongsTo(User, { as: 'Owner', foreignKey: 'ownerId' })
Wedding.belongsTo(Client, { foreignKey: 'clientId' })
Wedding.hasMany(Invite, { foreignKey: 'weddingId' })
Wedding.belongsToMany(Vendor, { 
  through: 'WeddingVendors',
  foreignKey: 'weddingId',
  otherKey: 'vendorId'
})
Wedding.hasMany(Payment, { foreignKey: 'weddingId' })

// Associations Invite
Invite.belongsTo(Wedding, { foreignKey: 'weddingId' })
Invite.belongsTo(User, { as: 'InvitedUser', foreignKey: 'userId' })

// Associations Vendor
Vendor.belongsTo(Client, { foreignKey: 'clientId' })
Vendor.belongsTo(User, { as: 'VendorUser', foreignKey: 'userId' })
Vendor.belongsToMany(Wedding, { 
  through: 'WeddingVendors',
  foreignKey: 'vendorId',
  otherKey: 'weddingId'
})
Vendor.hasMany(Payment, { foreignKey: 'vendorId' })

// Associations Payment
Payment.belongsTo(Wedding, { foreignKey: 'weddingId' })
Payment.belongsTo(Vendor, { foreignKey: 'vendorId' })
Payment.belongsTo(User, { as: 'Payer', foreignKey: 'userId' })

// Associations Notification
Notification.belongsTo(User, { foreignKey: 'userId' })

// Associations Session
Session.belongsTo(User, { foreignKey: 'userId' })

// Hooks globaux pour le multi-tenant
const addTenantScope = (model) => {
  model.addHook('beforeFind', (options) => {
    if (!options.skipTenantScope && options.where && !options.where.clientId) {
      // Ajouter le tenant si disponible dans le contexte
      const tenantId = options.tenantId || global.currentTenantId
      if (tenantId) {
        options.where.clientId = tenantId
      }
    }
  })
}

// Appliquer le scope tenant aux modèles concernés
[User, Wedding, Vendor].forEach(addTenantScope)

module.exports = {
  sequelize,
  Sequelize,
  ...models
}