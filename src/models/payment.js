module.exports = (sequelize, DataTypes) => {
  const Payment = sequelize.define('Payment', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'CAD'
    },
    status: {
      type: DataTypes.ENUM(
        'pending', 'processing', 'completed', 
        'failed', 'cancelled', 'refunded', 'partial_refund'
      ),
      defaultValue: 'pending'
    },
    type: {
      type: DataTypes.ENUM(
        'deposit', 'final', 'installment', 
        'refund', 'tip', 'extra'
      ),
      defaultValue: 'final'
    },
    method: {
      type: DataTypes.ENUM(
        'card', 'bank_transfer', 'cash', 
        'check', 'paypal', 'other'
      ),
      defaultValue: 'card'
    },
    stripePaymentIntentId: {
      type: DataTypes.STRING
    },
    stripeChargeId: {
      type: DataTypes.STRING
    },
    stripeRefundId: {
      type: DataTypes.STRING
    },
    description: {
      type: DataTypes.TEXT
    },
    invoiceNumber: {
      type: DataTypes.STRING,
      unique: true
    },
    dueDate: {
      type: DataTypes.DATE
    },
    paidAt: {
      type: DataTypes.DATE
    },
    fees: {
      type: DataTypes.JSONB,
      defaultValue: {
        platformFee: 0,
        processingFee: 0,
        vendorCommission: 0
      }
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    refundReason: {
      type: DataTypes.TEXT
    },
    refundedAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    // Relations
    weddingId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    vendorId: {
      type: DataTypes.UUID
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false
    }
  }, {
    tableName: 'payments',
    timestamps: true,
    paranoid: true,
    indexes: [
      { fields: ['weddingId'] },
      { fields: ['vendorId'] },
      { fields: ['userId'] },
      { fields: ['status'] },
      { fields: ['invoiceNumber'] }
    ],
    hooks: {
      beforeCreate: (payment) => {
        // Générer un numéro de facture
        if (!payment.invoiceNumber) {
          const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
          const random = Math.random().toString(36).substring(2, 6).toUpperCase()
          payment.invoiceNumber = `INV-${date}-${random}`
        }
      }
    }
  })

  // Méthodes
  Payment.prototype.calculateNetAmount = function() {
    const totalFees = Object.values(this.fees).reduce((sum, fee) => sum + fee, 0)
    return this.amount - totalFees
  }

  Payment.prototype.markAsPaid = async function(transactionId) {
    this.status = 'completed'
    this.paidAt = new Date()
    if (transactionId) {
      this.stripeChargeId = transactionId
    }
    await this.save()
  }

  Payment.prototype.refund = async function(amount, reason) {
    const refundAmount = amount || this.amount
    
    if (refundAmount > this.amount - this.refundedAmount) {
      throw new Error('Le montant du remboursement dépasse le montant payé')
    }

    this.refundedAmount = parseFloat(this.refundedAmount) + parseFloat(refundAmount)
    this.status = this.refundedAmount >= this.amount ? 'refunded' : 'partial_refund'
    this.refundReason = reason
    
    await this.save()
  }

  Payment.prototype.canBeRefunded = function() {
    return ['completed', 'partial_refund'].includes(this.status) && 
           this.refundedAmount < this.amount
  }

  return Payment
}