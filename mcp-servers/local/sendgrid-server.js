const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Configuration SendGrid simulée
const sendgridConfig = {
  apiKey: process.env.SENDGRID_API_KEY,
  fromEmail: process.env.SENDGRID_FROM_EMAIL || 'noreply@attitudes.vip',
  fromName: process.env.SENDGRID_FROM_NAME || 'Attitudes.vip'
};

// Base de données simulée
const emails = [];
const templates = [];
const lists = [];

app.use(express.json({ limit: '10mb' }));

// Endpoint de santé
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'sendgrid-mcp',
    configured: !!sendgridConfig.apiKey,
    fromEmail: sendgridConfig.fromEmail
  });
});

// MCP Protocol endpoint principal
app.post('/mcp', async (req, res) => {
  const { method, params, id } = req.body;
  let result = {};
  
  try {
    switch(method) {
      // Envoi d'email simple
      case 'mail.send':
        const email = {
          id: 'msg_' + Math.random().toString(36).substr(2, 9),
          to: params.to,
          from: {
            email: params.from?.email || sendgridConfig.fromEmail,
            name: params.from?.name || sendgridConfig.fromName
          },
          subject: params.subject,
          content: params.content,
          status: 'sent',
          created: new Date().toISOString()
        };
        emails.push(email);
        result = email;
        console.log('Email envoyé:', email.subject, 'à', email.to);
        break;
        
      // Envoi d'email avec template
      case 'mail.sendTemplate':
        const templateEmail = {
          id: 'msg_' + Math.random().toString(36).substr(2, 9),
          to: params.to,
          from: {
            email: sendgridConfig.fromEmail,
            name: sendgridConfig.fromName
          },
          templateId: params.templateId,
          dynamicData: params.dynamicData,
          status: 'sent',
          created: new Date().toISOString()
        };
        emails.push(templateEmail);
        result = templateEmail;
        break;
        
      // Envoi groupé (invitations)
      case 'mail.sendMultiple':
        const bulkEmails = params.personalizations.map(person => ({
          id: 'msg_' + Math.random().toString(36).substr(2, 9),
          to: person.to,
          from: {
            email: sendgridConfig.fromEmail,
            name: sendgridConfig.fromName
          },
          subject: params.subject,
          dynamicData: person.dynamicData,
          status: 'sent',
          created: new Date().toISOString()
        }));
        emails.push(...bulkEmails);
        result = {
          sent: bulkEmails.length,
          messages: bulkEmails
        };
        break;
        
      // Création de template
      case 'templates.create':
        const template = {
          id: 'tpl_' + Math.random().toString(36).substr(2, 9),
          name: params.name,
          subject: params.subject,
          htmlContent: params.htmlContent,
          plainContent: params.plainContent,
          category: params.category || 'wedding',
          created: new Date().toISOString()
        };
        templates.push(template);
        result = template;
        break;
        
      // Liste des templates
      case 'templates.list':
        result = {
          templates: templates,
          total: templates.length
        };
        break;
        
      // Création de liste de contacts
      case 'lists.create':
        const list = {
          id: 'lst_' + Math.random().toString(36).substr(2, 9),
          name: params.name,
          description: params.description,
          contactCount: 0,
          created: new Date().toISOString()
        };
        lists.push(list);
        result = list;
        break;
        
      // Ajout de contacts à une liste
      case 'contacts.add':
        const contacts = params.contacts.map(contact => ({
          id: 'cnt_' + Math.random().toString(36).substr(2, 9),
          email: contact.email,
          firstName: contact.firstName,
          lastName: contact.lastName,
          customFields: contact.customFields || {},
          listIds: [params.listId],
          created: new Date().toISOString()
        }));
        result = {
          added: contacts.length,
          contacts: contacts
        };
        break;
        
      // Statistiques
      case 'stats.global':
        result = {
          sent: emails.length,
          delivered: Math.floor(emails.length * 0.98),
          opens: Math.floor(emails.length * 0.65),
          clicks: Math.floor(emails.length * 0.25),
          bounces: Math.floor(emails.length * 0.02),
          spamReports: 0
        };
        break;
        
      // Configuration
      case 'config.info':
        result = {
          configured: !!sendgridConfig.apiKey,
          fromEmail: sendgridConfig.fromEmail,
          fromName: sendgridConfig.fromName,
          capabilities: ['transactional', 'marketing', 'templates', 'lists'],
          emailsSent: emails.length,
          templatesCount: templates.length
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

// Webhook endpoint pour les événements
app.post('/webhooks/sendgrid', (req, res) => {
  console.log('Webhook SendGrid reçu:', req.body);
  // Traiter les événements (delivered, opened, clicked, etc.)
  res.status(200).send('OK');
});

app.listen(port, () => {
  console.log(`SendGrid MCP Server listening on port ${port}`);
  console.log(`From: ${sendgridConfig.fromEmail}`);
});