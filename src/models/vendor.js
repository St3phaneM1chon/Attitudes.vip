module.exports = (sequelize, DataTypes) => {
  const Vendor = sequelize.define('Vendor', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    businessName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    category: {
      type: DataTypes.ENUM(
        'dj', 'photographe', 'videographer', 'traiteur', 
        'patissier', 'fleuriste', 'decorateur', 'location',
        'wedding_planner', 'maquillage', 'coiffure', 'transport',
        'animation', 'securite', 'other'
      ),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true
      }
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false
    },
    website: {
      type: DataTypes.STRING
    },
    address: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    serviceArea: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    pricing: {
      type: DataTypes.JSONB,
      defaultValue: {
        currency: 'CAD',
        startingPrice: 0,
        pricingModel: 'fixed', // fixed, hourly, package
        packages: []
      }
    },
    availability: {
      type: DataTypes.JSONB,
      defaultValue: {
        blackoutDates: [],
        workingHours: {},
        leadTime: 30 // jours
      }
    },
    portfolio: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    certifications: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    insurance: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    rating: {
      type: DataTypes.DECIMAL(2, 1),
      defaultValue: 0
    },
    reviewCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    features: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    languages: {
      type: DataTypes.JSONB,
      defaultValue: ['fr']
    },
    socialMedia: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    status: {
      type: DataTypes.ENUM('pending', 'active', 'inactive', 'suspended'),
      defaultValue: 'pending'
    },
    verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    commission: {
      type: DataTypes.DECIMAL(4, 2),
      defaultValue: 15.00 // Pourcentage
    },
    stripeAccountId: {
      type: DataTypes.STRING
    },
    settings: {
      type: DataTypes.JSONB,
      defaultValue: {
        autoAcceptBookings: false,
        instantBooking: false,
        cancellationPolicy: 'flexible',
        responseTime: 24 // heures
      }
    },
    statistics: {
      type: DataTypes.JSONB,
      defaultValue: {
        totalBookings: 0,
        completedBookings: 0,
        cancelledBookings: 0,
        totalRevenue: 0,
        responseRate: 100,
        acceptanceRate: 0
      }
    },
    // Relations
    clientId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    userId: {
      type: DataTypes.UUID
    }
  }, {
    tableName: 'vendors',
    timestamps: true,
    paranoid: true,
    indexes: [
      { fields: ['clientId'] },
      { fields: ['userId'] },
      { fields: ['category'] },
      { fields: ['status'] },
      { fields: ['verified'] }
    ]
  })

  // Méthodes
  Vendor.prototype.isAvailable = function(date) {
    const dateStr = date.toISOString().split('T')[0]
    return !this.availability.blackoutDates.includes(dateStr)
  }

  Vendor.prototype.calculatePrice = function(options = {}) {
    const { hours, guests, services } = options
    
    switch (this.pricing.pricingModel) {
      case 'hourly':
        return (this.pricing.hourlyRate || 0) * (hours || 1)
      case 'package':
        // Trouver le package approprié
        const selectedPackage = this.pricing.packages.find(p => 
          p.minGuests <= guests && p.maxGuests >= guests
        )
        return selectedPackage ? selectedPackage.price : this.pricing.startingPrice
      default:
        return this.pricing.startingPrice
    }
  }

  Vendor.prototype.updateStatistics = async function() {
    const bookings = await sequelize.models.Payment.findAll({
      where: { vendorId: this.id }
    })

    this.statistics = {
      totalBookings: bookings.length,
      completedBookings: bookings.filter(b => b.status === 'completed').length,
      cancelledBookings: bookings.filter(b => b.status === 'cancelled').length,
      totalRevenue: bookings
        .filter(b => b.status === 'completed')
        .reduce((sum, b) => sum + parseFloat(b.amount), 0),
      responseRate: this.statistics.responseRate || 100,
      acceptanceRate: bookings.length > 0 
        ? (this.statistics.completedBookings / bookings.length) * 100 
        : 0
    }

    await this.save()
  }

  return Vendor
}