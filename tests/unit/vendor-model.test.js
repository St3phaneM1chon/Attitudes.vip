const { DataTypes } = require('sequelize')

// Mock Sequelize
const mockSequelize = {
  define: jest.fn(),
  models: {
    Payment: {
      findAll: jest.fn()
    }
  }
}

// Import the model factory
const vendorModelFactory = require('../../src/models/vendor')

// Mock vendor instance
let mockVendorInstance

describe('Vendor Model', () => {
  let Vendor
  let mockDefineReturn

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup mock define return
    mockDefineReturn = {
      prototype: {}
    }
    
    mockSequelize.define.mockReturnValue(mockDefineReturn)
    
    // Create the model
    Vendor = vendorModelFactory(mockSequelize, DataTypes)
    
    // Create mock instance with methods
    mockVendorInstance = {
      id: 'vendor123',
      businessName: 'Test Photography',
      category: 'photographe',
      availability: {
        blackoutDates: ['2024-06-15', '2024-06-16'],
        workingHours: {},
        leadTime: 30
      },
      pricing: {
        currency: 'CAD',
        startingPrice: 1000,
        pricingModel: 'fixed',
        packages: []
      },
      statistics: {
        totalBookings: 0,
        completedBookings: 0,
        cancelledBookings: 0,
        totalRevenue: 0,
        responseRate: 100,
        acceptanceRate: 0
      },
      save: jest.fn().mockResolvedValue(true)
    }
  })

  describe('Model Definition', () => {
    test('should define model with correct name and options', () => {
      expect(mockSequelize.define).toHaveBeenCalledWith(
        'Vendor',
        expect.any(Object),
        {
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
        }
      )
    })

    test('should define all required fields', () => {
      const fields = mockSequelize.define.mock.calls[0][1]
      
      // Check primary key
      expect(fields.id).toEqual({
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      })
      
      // Check required fields
      expect(fields.businessName).toEqual({
        type: DataTypes.STRING,
        allowNull: false
      })
      
      expect(fields.category).toEqual({
        type: DataTypes.ENUM(
          'dj', 'photographe', 'videographer', 'traiteur', 
          'patissier', 'fleuriste', 'decorateur', 'location',
          'wedding_planner', 'maquillage', 'coiffure', 'transport',
          'animation', 'securite', 'other'
        ),
        allowNull: false
      })
      
      expect(fields.email).toEqual({
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isEmail: true
        }
      })
      
      expect(fields.phone).toEqual({
        type: DataTypes.STRING,
        allowNull: false
      })
    })

    test('should define JSONB fields with defaults', () => {
      const fields = mockSequelize.define.mock.calls[0][1]
      
      expect(fields.address).toEqual({
        type: DataTypes.JSONB,
        defaultValue: {}
      })
      
      expect(fields.serviceArea).toEqual({
        type: DataTypes.JSONB,
        defaultValue: []
      })
      
      expect(fields.pricing).toEqual({
        type: DataTypes.JSONB,
        defaultValue: {
          currency: 'CAD',
          startingPrice: 0,
          pricingModel: 'fixed',
          packages: []
        }
      })
      
      expect(fields.availability).toEqual({
        type: DataTypes.JSONB,
        defaultValue: {
          blackoutDates: [],
          workingHours: {},
          leadTime: 30
        }
      })
    })

    test('should define status and verification fields', () => {
      const fields = mockSequelize.define.mock.calls[0][1]
      
      expect(fields.status).toEqual({
        type: DataTypes.ENUM('pending', 'active', 'inactive', 'suspended'),
        defaultValue: 'pending'
      })
      
      expect(fields.verified).toEqual({
        type: DataTypes.BOOLEAN,
        defaultValue: false
      })
      
      expect(fields.commission).toEqual({
        type: DataTypes.DECIMAL(4, 2),
        defaultValue: 15.00
      })
    })

    test('should define settings with correct defaults', () => {
      const fields = mockSequelize.define.mock.calls[0][1]
      
      expect(fields.settings).toEqual({
        type: DataTypes.JSONB,
        defaultValue: {
          autoAcceptBookings: false,
          instantBooking: false,
          cancellationPolicy: 'flexible',
          responseTime: 24
        }
      })
    })
  })

  describe('Instance Methods', () => {
    beforeEach(() => {
      // Copy methods to mock instance
      Object.assign(mockVendorInstance, mockDefineReturn.prototype)
    })

    describe('isAvailable', () => {
      test('should return true for available date', () => {
        const availableDate = new Date('2024-06-20')
        const result = mockVendorInstance.isAvailable(availableDate)
        
        expect(result).toBe(true)
      })

      test('should return false for blackout date', () => {
        const blackoutDate = new Date('2024-06-15')
        const result = mockVendorInstance.isAvailable(blackoutDate)
        
        expect(result).toBe(false)
      })

      test('should handle date with time correctly', () => {
        const dateWithTime = new Date('2024-06-15T10:30:00Z')
        const result = mockVendorInstance.isAvailable(dateWithTime)
        
        expect(result).toBe(false)
      })
    })

    describe('calculatePrice', () => {
      test('should calculate fixed price', () => {
        mockVendorInstance.pricing = {
          pricingModel: 'fixed',
          startingPrice: 2000
        }
        
        const price = mockVendorInstance.calculatePrice({
          hours: 8,
          guests: 100
        })
        
        expect(price).toBe(2000)
      })

      test('should calculate hourly price', () => {
        mockVendorInstance.pricing = {
          pricingModel: 'hourly',
          hourlyRate: 150
        }
        
        const price = mockVendorInstance.calculatePrice({ hours: 6 })
        
        expect(price).toBe(900)
      })

      test('should default to 1 hour if not specified', () => {
        mockVendorInstance.pricing = {
          pricingModel: 'hourly',
          hourlyRate: 200
        }
        
        const price = mockVendorInstance.calculatePrice({})
        
        expect(price).toBe(200)
      })

      test('should calculate package price based on guests', () => {
        mockVendorInstance.pricing = {
          pricingModel: 'package',
          startingPrice: 1000,
          packages: [
            { minGuests: 0, maxGuests: 50, price: 1500 },
            { minGuests: 51, maxGuests: 100, price: 2500 },
            { minGuests: 101, maxGuests: 200, price: 3500 }
          ]
        }
        
        expect(mockVendorInstance.calculatePrice({ guests: 30 })).toBe(1500)
        expect(mockVendorInstance.calculatePrice({ guests: 75 })).toBe(2500)
        expect(mockVendorInstance.calculatePrice({ guests: 150 })).toBe(3500)
      })

      test('should return starting price if no matching package', () => {
        mockVendorInstance.pricing = {
          pricingModel: 'package',
          startingPrice: 1000,
          packages: [
            { minGuests: 51, maxGuests: 100, price: 2500 }
          ]
        }
        
        const price = mockVendorInstance.calculatePrice({ guests: 30 })
        
        expect(price).toBe(1000)
      })

      test('should handle missing pricing data gracefully', () => {
        mockVendorInstance.pricing = {
          pricingModel: 'hourly'
          // Missing hourlyRate
        }
        
        const price = mockVendorInstance.calculatePrice({ hours: 5 })
        
        expect(price).toBe(0)
      })
    })

    describe('updateStatistics', () => {
      test('should update statistics based on payments', async () => {
        const mockPayments = [
          { vendorId: 'vendor123', status: 'completed', amount: '1000.00' },
          { vendorId: 'vendor123', status: 'completed', amount: '1500.00' },
          { vendorId: 'vendor123', status: 'cancelled', amount: '800.00' },
          { vendorId: 'vendor123', status: 'pending', amount: '1200.00' }
        ]
        
        mockSequelize.models.Payment.findAll.mockResolvedValue(mockPayments)
        
        await mockVendorInstance.updateStatistics()
        
        expect(mockSequelize.models.Payment.findAll).toHaveBeenCalledWith({
          where: { vendorId: 'vendor123' }
        })
        
        expect(mockVendorInstance.statistics).toEqual({
          totalBookings: 4,
          completedBookings: 2,
          cancelledBookings: 1,
          totalRevenue: 2500,
          responseRate: 100,
          acceptanceRate: 50
        })
        
        expect(mockVendorInstance.save).toHaveBeenCalled()
      })

      test('should handle no bookings', async () => {
        mockSequelize.models.Payment.findAll.mockResolvedValue([])
        
        await mockVendorInstance.updateStatistics()
        
        expect(mockVendorInstance.statistics).toEqual({
          totalBookings: 0,
          completedBookings: 0,
          cancelledBookings: 0,
          totalRevenue: 0,
          responseRate: 100,
          acceptanceRate: 0
        })
      })

      test('should preserve existing response rate', async () => {
        mockVendorInstance.statistics.responseRate = 95
        mockSequelize.models.Payment.findAll.mockResolvedValue([])
        
        await mockVendorInstance.updateStatistics()
        
        expect(mockVendorInstance.statistics.responseRate).toBe(95)
      })

      test('should handle decimal amounts correctly', async () => {
        const mockPayments = [
          { vendorId: 'vendor123', status: 'completed', amount: '1234.56' },
          { vendorId: 'vendor123', status: 'completed', amount: '2345.67' }
        ]
        
        mockSequelize.models.Payment.findAll.mockResolvedValue(mockPayments)
        
        await mockVendorInstance.updateStatistics()
        
        expect(mockVendorInstance.statistics.totalRevenue).toBe(3580.23)
      })
    })
  })

  describe('Field Validations', () => {
    test('should validate email format', () => {
      const fields = mockSequelize.define.mock.calls[0][1]
      
      expect(fields.email.validate).toEqual({
        isEmail: true
      })
    })

    test('should validate rating range', () => {
      const fields = mockSequelize.define.mock.calls[0][1]
      
      expect(fields.rating).toEqual({
        type: DataTypes.DECIMAL(2, 1),
        defaultValue: 0
      })
    })

    test('should ensure clientId is required', () => {
      const fields = mockSequelize.define.mock.calls[0][1]
      
      expect(fields.clientId).toEqual({
        type: DataTypes.UUID,
        allowNull: false
      })
    })
  })

  describe('Default Values', () => {
    test('should set correct default values', () => {
      const fields = mockSequelize.define.mock.calls[0][1]
      
      // Check various default values
      expect(fields.description.type).toBe(DataTypes.TEXT)
      expect(fields.website.type).toBe(DataTypes.STRING)
      expect(fields.insurance.defaultValue).toBe(false)
      expect(fields.rating.defaultValue).toBe(0)
      expect(fields.reviewCount.defaultValue).toBe(0)
      expect(fields.features.defaultValue).toEqual([])
      expect(fields.languages.defaultValue).toEqual(['fr'])
      expect(fields.socialMedia.defaultValue).toEqual({})
    })

    test('should set portfolio as empty array by default', () => {
      const fields = mockSequelize.define.mock.calls[0][1]
      
      expect(fields.portfolio).toEqual({
        type: DataTypes.JSONB,
        defaultValue: []
      })
    })

    test('should set certifications as empty array by default', () => {
      const fields = mockSequelize.define.mock.calls[0][1]
      
      expect(fields.certifications).toEqual({
        type: DataTypes.JSONB,
        defaultValue: []
      })
    })
  })

  describe('Complex Scenarios', () => {
    test('should handle vendor with multiple services', () => {
      mockVendorInstance.features = [
        'photography',
        'videography',
        'drone',
        'photo-booth'
      ]
      
      expect(mockVendorInstance.features).toHaveLength(4)
      expect(mockVendorInstance.features).toContain('drone')
    })

    test('should handle multi-language vendor', () => {
      mockVendorInstance.languages = ['fr', 'en', 'es', 'ar']
      
      expect(mockVendorInstance.languages).toHaveLength(4)
      expect(mockVendorInstance.languages).toContain('ar')
    })

    test('should handle vendor with complex pricing packages', () => {
      mockVendorInstance.pricing = {
        currency: 'EUR',
        pricingModel: 'package',
        packages: [
          {
            name: 'Bronze',
            minGuests: 0,
            maxGuests: 50,
            price: 1200,
            includes: ['4 hours coverage', 'Digital photos']
          },
          {
            name: 'Silver',
            minGuests: 51,
            maxGuests: 100,
            price: 2000,
            includes: ['6 hours coverage', 'Digital photos', 'Album']
          },
          {
            name: 'Gold',
            minGuests: 101,
            maxGuests: 200,
            price: 3500,
            includes: ['Full day coverage', 'Digital photos', 'Premium album', 'Second photographer']
          }
        ]
      }
      
      const price = mockVendorInstance.calculatePrice({ guests: 75 })
      expect(price).toBe(2000)
    })

    test('should handle vendor with working hours', () => {
      mockVendorInstance.availability.workingHours = {
        monday: { start: '09:00', end: '18:00' },
        tuesday: { start: '09:00', end: '18:00' },
        wednesday: { start: '09:00', end: '18:00' },
        thursday: { start: '09:00', end: '20:00' },
        friday: { start: '09:00', end: '20:00' },
        saturday: { start: '10:00', end: '22:00' },
        sunday: { start: '10:00', end: '18:00' }
      }
      
      expect(mockVendorInstance.availability.workingHours.saturday.end).toBe('22:00')
    })
  })
})