module.exports = (sequelize, DataTypes) => {
  const Session = sequelize.define('Session', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    token: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    refreshToken: {
      type: DataTypes.STRING,
      unique: true
    },
    ipAddress: {
      type: DataTypes.STRING
    },
    userAgent: {
      type: DataTypes.TEXT
    },
    device: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    location: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    lastActivityAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    // Relations
    userId: {
      type: DataTypes.UUID,
      allowNull: false
    }
  }, {
    tableName: 'sessions',
    timestamps: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['token'] },
      { fields: ['refreshToken'] },
      { fields: ['isActive'] },
      { fields: ['expiresAt'] }
    ]
  })

  // Méthodes
  Session.prototype.isExpired = function() {
    return new Date() > this.expiresAt
  }

  Session.prototype.updateActivity = async function() {
    this.lastActivityAt = new Date()
    await this.save()
  }

  Session.prototype.revoke = async function() {
    this.isActive = false
    await this.save()
  }

  return Session
}