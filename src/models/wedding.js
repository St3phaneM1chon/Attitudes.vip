module.exports = (sequelize, DataTypes) => {
  const Wedding = sequelize.define('Wedding', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    venue: {
      type: DataTypes.STRING,
      allowNull: false
    },
    venueAddress: {
      type: DataTypes.JSONB,
      defaultValue: {
        street: '',
        city: '',
        state: '',
        country: '',
        postalCode: '',
        coordinates: null
      }
    },
    ceremonyTime: {
      type: DataTypes.TIME
    },
    receptionTime: {
      type: DataTypes.TIME
    },
    groomFirstName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    groomLastName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    brideFirstName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    brideLastName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    theme: {
      type: DataTypes.STRING
    },
    colorScheme: {
      type: DataTypes.JSONB,
      defaultValue: {
        primary: '#6366F1',
        secondary: '#EC4899',
        accent: '#F59E0B'
      }
    },
    estimatedGuests: {
      type: DataTypes.INTEGER,
      defaultValue: 100
    },
    budget: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'CAD'
    },
    description: {
      type: DataTypes.TEXT
    },
    coverPhoto: {
      type: DataTypes.STRING
    },
    photos: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    timeline: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    customs: {
      type: DataTypes.JSONB,
      defaultValue: {
        religious: false,
        culturalTraditions: [],
        dietaryRestrictions: [],
        accessibility: []
      }
    },
    privacy: {
      type: DataTypes.ENUM('public', 'private', 'invite-only'),
      defaultValue: 'private'
    },
    status: {
      type: DataTypes.ENUM('planning', 'upcoming', 'ongoing', 'completed', 'cancelled'),
      defaultValue: 'planning'
    },
    rsvpDeadline: {
      type: DataTypes.DATE
    },
    website: {
      type: DataTypes.STRING
    },
    hashtag: {
      type: DataTypes.STRING
    },
    settings: {
      type: DataTypes.JSONB,
      defaultValue: {
        allowPlusOne: true,
        childrenAllowed: true,
        rsvpRequired: true,
        guestMessaging: true,
        photoSharing: true,
        liveStream: false
      }
    },
    statistics: {
      type: DataTypes.JSONB,
      defaultValue: {
        invitesSent: 0,
        invitesAccepted: 0,
        invitesDeclined: 0,
        invitesPending: 0,
        totalSpent: 0,
        tasksCompleted: 0,
        tasksTotal: 0
      }
    },
    // Multi-tenant
    clientId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    ownerId: {
      type: DataTypes.UUID,
      allowNull: false
    }
  }, {
    tableName: 'weddings',
    timestamps: true,
    paranoid: true,
    indexes: [
      { fields: ['clientId'] },
      { fields: ['ownerId'] },
      { fields: ['date'] },
      { fields: ['status'] }
    ]
  })

  // Méthodes
  Wedding.prototype.getCoupleName = function() {
    return `${this.groomFirstName} & ${this.brideFirstName}`
  }

  Wedding.prototype.getDaysUntil = function() {
    const now = new Date()
    const weddingDate = new Date(this.date)
    const diffTime = weddingDate - now
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  Wedding.prototype.isUpcoming = function() {
    return this.getDaysUntil() > 0 && this.getDaysUntil() <= 30
  }

  Wedding.prototype.updateStatistics = async function() {
    const [invites, payments] = await Promise.all([
      sequelize.models.Invite.findAll({ where: { weddingId: this.id } }),
      sequelize.models.Payment.sum('amount', { where: { weddingId: this.id, status: 'completed' } })
    ])

    this.statistics = {
      invitesSent: invites.length,
      invitesAccepted: invites.filter(i => i.status === 'accepted').length,
      invitesDeclined: invites.filter(i => i.status === 'declined').length,
      invitesPending: invites.filter(i => i.status === 'pending').length,
      totalSpent: payments || 0,
      tasksCompleted: this.statistics.tasksCompleted || 0,
      tasksTotal: this.statistics.tasksTotal || 0
    }

    await this.save()
  }

  return Wedding
}