module.exports = (sequelize, DataTypes) => {
  const Invite = sequelize.define('Invite', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      validate: {
        isEmail: true
      }
    },
    phone: {
      type: DataTypes.STRING
    },
    status: {
      type: DataTypes.ENUM('pending', 'accepted', 'declined', 'maybe'),
      defaultValue: 'pending'
    },
    plusOne: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    plusOneName: {
      type: DataTypes.STRING
    },
    numberOfGuests: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    tableNumber: {
      type: DataTypes.STRING
    },
    dietaryRestrictions: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    specialNeeds: {
      type: DataTypes.TEXT
    },
    inviteCode: {
      type: DataTypes.STRING,
      unique: true
    },
    invitedAt: {
      type: DataTypes.DATE
    },
    respondedAt: {
      type: DataTypes.DATE
    },
    notes: {
      type: DataTypes.TEXT
    },
    tags: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    // Relations
    weddingId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    userId: {
      type: DataTypes.UUID
    }
  }, {
    tableName: 'invites',
    timestamps: true,
    paranoid: true,
    indexes: [
      { fields: ['weddingId'] },
      { fields: ['email'] },
      { fields: ['inviteCode'] },
      { fields: ['status'] }
    ],
    hooks: {
      beforeCreate: (invite) => {
        // Générer un code d'invitation unique
        if (!invite.inviteCode) {
          invite.inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase()
        }
      }
    }
  })

  // Méthodes
  Invite.prototype.getFullName = function() {
    return `${this.firstName} ${this.lastName}`
  }

  Invite.prototype.accept = async function(options = {}) {
    this.status = 'accepted'
    this.respondedAt = new Date()
    if (options.plusOneName) {
      this.plusOneName = options.plusOneName
    }
    if (options.numberOfGuests) {
      this.numberOfGuests = options.numberOfGuests
    }
    if (options.dietaryRestrictions) {
      this.dietaryRestrictions = options.dietaryRestrictions
    }
    await this.save()
  }

  Invite.prototype.decline = async function(reason) {
    this.status = 'declined'
    this.respondedAt = new Date()
    if (reason) {
      this.notes = reason
    }
    await this.save()
  }

  return Invite
}