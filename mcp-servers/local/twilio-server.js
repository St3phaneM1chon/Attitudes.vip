const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Configuration Twilio simulée
const twilioConfig = {
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  phoneNumber: process.env.TWILIO_PHONE_NUMBER || '+1234567890'
};

// Base de données simulée pour les messages
const messages = [];
const phoneNumbers = [];

app.use(express.json({ limit: '10mb' }));

// Endpoint de santé
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'twilio-mcp',
    configured: !!(twilioConfig.accountSid && twilioConfig.authToken),
    phoneNumber: twilioConfig.phoneNumber
  });
});

// MCP Protocol endpoint principal
app.post('/mcp', async (req, res) => {
  const { method, params, id } = req.body;
  let result = {};
  
  try {
    switch(method) {
      // Envoi de SMS
      case 'messages.send':
        const message = {
          sid: 'SM' + Math.random().toString(36).substr(2, 32),
          to: params.to,
          from: params.from || twilioConfig.phoneNumber,
          body: params.body,
          status: 'sent',
          direction: 'outbound',
          created: new Date().toISOString()
        };
        messages.push(message);
        result = message;
        console.log('SMS envoyé:', message);
        break;
        
      // Envoi de SMS groupés (invitations mariage)
      case 'messages.sendBulk':
        const bulkMessages = params.recipients.map(recipient => ({
          sid: 'SM' + Math.random().toString(36).substr(2, 32),
          to: recipient.phone,
          from: twilioConfig.phoneNumber,
          body: params.template.replace('{name}', recipient.name),
          status: 'sent',
          direction: 'outbound',
          created: new Date().toISOString()
        }));
        messages.push(...bulkMessages);
        result = {
          sent: bulkMessages.length,
          messages: bulkMessages
        };
        break;
        
      // Liste des messages
      case 'messages.list':
        result = {
          messages: messages.slice(-50), // Derniers 50 messages
          total: messages.length
        };
        break;
        
      // Vérification d'un numéro
      case 'lookups.phoneNumber':
        result = {
          phoneNumber: params.phoneNumber,
          nationalFormat: params.phoneNumber,
          countryCode: 'FR',
          valid: true,
          carrier: {
            type: 'mobile',
            name: 'Orange France'
          }
        };
        break;
        
      // Achat d'un numéro
      case 'phoneNumbers.purchase':
        const newNumber = {
          sid: 'PN' + Math.random().toString(36).substr(2, 32),
          phoneNumber: '+33' + Math.floor(Math.random() * 900000000 + 100000000),
          friendlyName: params.friendlyName || 'Attitudes.vip',
          capabilities: {
            voice: true,
            sms: true,
            mms: false
          },
          created: new Date().toISOString()
        };
        phoneNumbers.push(newNumber);
        result = newNumber;
        break;
        
      // Configuration WhatsApp
      case 'whatsapp.send':
        const whatsappMsg = {
          sid: 'WM' + Math.random().toString(36).substr(2, 32),
          to: 'whatsapp:' + params.to,
          from: 'whatsapp:' + twilioConfig.phoneNumber,
          body: params.body,
          mediaUrl: params.mediaUrl,
          status: 'sent',
          created: new Date().toISOString()
        };
        messages.push(whatsappMsg);
        result = whatsappMsg;
        break;
        
      // Informations de configuration
      case 'config.info':
        result = {
          configured: !!(twilioConfig.accountSid && twilioConfig.authToken),
          phoneNumber: twilioConfig.phoneNumber,
          capabilities: ['sms', 'whatsapp', 'lookup', 'bulk'],
          messagesCount: messages.length
        };
        break;
        
      default:
        result = { error: `Unknown method: ${method}` };
    }
    
    res.json({ 
      jsonrpc: '2.0', 
      result,
      id: id || 1 
    });
    
  } catch (error) {
    res.json({ 
      jsonrpc: '2.0', 
      error: {
        code: -32603,
        message: error.message
      },
      id: id || 1 
    });
  }
});

// Webhook endpoint pour les statuts
app.post('/webhooks/twilio', (req, res) => {
  console.log('Webhook Twilio reçu:', req.body);
  res.status(200).send('OK');
});

app.listen(port, () => {
  console.log(`Twilio MCP Server listening on port ${port}`);
  console.log(`Phone: ${twilioConfig.phoneNumber}`);
});