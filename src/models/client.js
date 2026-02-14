module.exports = (sequelize, DataTypes) => {
  const Client = sequelize.define('Client', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        is: /^[a-z0-9-]+$/
      }
    },
    domain: {
      type: DataTypes.STRING,
      unique: true
    },
    logo: {
      type: DataTypes.STRING
    },
    primaryColor: {
      type: DataTypes.STRING(7),
      defaultValue: '#6366F1'
    },
    secondaryColor: {
      type: DataTypes.STRING(7),
      defaultValue: '#EC4899'
    },
    plan: {
      type: DataTypes.ENUM('free', 'starter', 'professional', 'enterprise'),
      defaultValue: 'free'
    },
    features: {
      type: DataTypes.JSONB,
      defaultValue: {
        maxWeddings: 1,
        maxInvites: 100,
        maxVendors: 10,
        customDomain: false,
        whiteLabel: false,
        analytics: false,
        api: false
      }
    },
    billingInfo: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    stripeCustomerId: {
      type: DataTypes.STRING
    },
    stripeSubscriptionId: {
      type: DataTypes.STRING
    },
    subscriptionStatus: {
      type: DataTypes.ENUM('active', 'trialing', 'past_due', 'canceled', 'unpaid'),
      defaultValue: 'trialing'
    },
    subscriptionEndsAt: {
      type: DataTypes.DATE
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    settings: {
      type: DataTypes.JSONB,
      defaultValue: {
        timezone: 'America/Montreal',
        language: 'fr',
        currency: 'CAD',
        dateFormat: 'DD/MM/YYYY',
        emailNotifications: true,
        smsNotifications: false
      }
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    }
  }, {
    tableName: 'clients',
    timestamps: true,
    paranoid: true,
    indexes: [
      { fields: ['slug'] },
      { fields: ['domain'] },
      { fields: ['isActive'] }
    ]
  })

  // Méthodes
  Client.prototype.canAddWedding = async function() {
    const weddingCount = await sequelize.models.Wedding.count({
      where: { clientId: this.id }
    })
    return weddingCount < this.features.maxWeddings
  }

  Client.prototype.canAddInvite = async function(weddingId) {
    const inviteCount = await sequelize.models.Invite.count({
      where: { weddingId }
    })
    return inviteCount < this.features.maxInvites
  }

  Client.prototype.canAddVendor = async function() {
    const vendorCount = await sequelize.models.Vendor.count({
      where: { clientId: this.id }
    })
    return vendorCount < this.features.maxVendors
  }

  Client.prototype.isFeatureEnabled = function(feature) {
    return this.features[feature] === true
  }

  return Client
}