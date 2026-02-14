module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define('Notification', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    type: {
      type: DataTypes.ENUM(
        'info', 'success', 'warning', 'error',
        'invitation', 'reminder', 'payment',
        'booking', 'message', 'update'
      ),
      defaultValue: 'info'
    },
    channel: {
      type: DataTypes.ENUM('in-app', 'email', 'sms', 'push'),
      defaultValue: 'in-app'
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    data: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    readAt: {
      type: DataTypes.DATE
    },
    sentAt: {
      type: DataTypes.DATE
    },
    scheduledFor: {
      type: DataTypes.DATE
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
      defaultValue: 'medium'
    },
    expiresAt: {
      type: DataTypes.DATE
    },
    // Relations
    userId: {
      type: DataTypes.UUID,
      allowNull: false
    }
  }, {
    tableName: 'notifications',
    timestamps: true,
    paranoid: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['isRead'] },
      { fields: ['type'] },
      { fields: ['scheduledFor'] }
    ]
  })

  // Méthodes
  Notification.prototype.markAsRead = async function() {
    this.isRead = true
    this.readAt = new Date()
    await this.save()
  }

  Notification.prototype.send = async function() {
    // Logique d'envoi selon le canal
    switch (this.channel) {
      case 'email':
        // Envoyer par email
        break
      case 'sms':
        // Envoyer par SMS
        break
      case 'push':
        // Envoyer notification push
        break
      default:
        // Notification in-app déjà créée
    }
    
    this.sentAt = new Date()
    await this.save()
  }

  return Notification
}