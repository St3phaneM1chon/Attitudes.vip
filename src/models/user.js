const bcrypt = require('bcrypt')

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true // Peut être null pour OAuth
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM(
        'cio', 'admin', 'client', 'customer', 'invite',
        'dj', 'photographe', 'traiteur', 'wedding_planner',
        'patissier', 'location', 'decorateur', 'fleuriste'
      ),
      defaultValue: 'customer'
    },
    phone: {
      type: DataTypes.STRING,
      validate: {
        is: /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{4,6}$/
      }
    },
    language: {
      type: DataTypes.STRING(5),
      defaultValue: 'fr'
    },
    timezone: {
      type: DataTypes.STRING,
      defaultValue: 'America/Montreal'
    },
    avatar: {
      type: DataTypes.STRING
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    isEmailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    emailVerificationToken: {
      type: DataTypes.STRING
    },
    passwordResetToken: {
      type: DataTypes.STRING
    },
    passwordResetExpires: {
      type: DataTypes.DATE
    },
    lastLoginAt: {
      type: DataTypes.DATE
    },
    failedLoginAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    lockedUntil: {
      type: DataTypes.DATE
    },
    preferences: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    // OAuth fields
    googleId: DataTypes.STRING,
    facebookId: DataTypes.STRING,
    twitterId: DataTypes.STRING,
    appleId: DataTypes.STRING,
    // Multi-tenant
    clientId: {
      type: DataTypes.UUID,
      allowNull: true
    }
  }, {
    tableName: 'users',
    timestamps: true,
    paranoid: true, // Soft delete
    indexes: [
      { fields: ['email'] },
      { fields: ['clientId'] },
      { fields: ['role'] },
      { fields: ['isActive'] }
    ],
    hooks: {
      beforeSave: async (user) => {
        // Hash le mot de passe si modifié
        if (user.changed('password') && user.password) {
          const salt = await bcrypt.genSalt(10)
          user.password = await bcrypt.hash(user.password, salt)
        }
      }
    }
  })

  // Méthodes d'instance
  User.prototype.comparePassword = async function(password) {
    if (!this.password) return false
    return bcrypt.compare(password, this.password)
  }

  User.prototype.incrementFailedLogins = async function() {
    this.failedLoginAttempts += 1
    
    // Verrouiller après 5 tentatives
    if (this.failedLoginAttempts >= 5) {
      this.lockedUntil = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
    }
    
    await this.save()
  }

  User.prototype.resetFailedLogins = async function() {
    this.failedLoginAttempts = 0
    this.lockedUntil = null
    this.lastLoginAt = new Date()
    await this.save()
  }

  User.prototype.isLocked = function() {
    return this.lockedUntil && this.lockedUntil > new Date()
  }

  User.prototype.getFullName = function() {
    return `${this.firstName} ${this.lastName}`
  }

  User.prototype.toJSON = function() {
    const values = { ...this.get() }
    delete values.password
    delete values.emailVerificationToken
    delete values.passwordResetToken
    delete values.passwordResetExpires
    return values
  }

  return User
}