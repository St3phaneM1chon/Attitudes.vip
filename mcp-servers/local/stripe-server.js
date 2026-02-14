const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Simuler l'API Stripe pour le serveur MCP
const stripe = {
  apiKey: process.env.STRIPE_API_KEY,
  
  // Méthodes simulées
  customers: {
    create: async (data) => ({
      id: 'cus_' + Math.random().toString(36).substr(2, 9),
      ...data,
      created: Date.now()
    }),
    list: async () => ({
      data: [],
      has_more: false
    })
  },
  
  paymentIntents: {
    create: async (data) => ({
      id: 'pi_' + Math.random().toString(36).substr(2, 9),
      amount: data.amount,
      currency: data.currency || 'eur',
      status: 'requires_payment_method',
      created: Date.now()
    })
  },
  
  prices: {
    create: async (data) => ({
      id: 'price_' + Math.random().toString(36).substr(2, 9),
      unit_amount: data.unit_amount,
      currency: data.currency,
      product: data.product_data ? {
        id: 'prod_' + Math.random().toString(36).substr(2, 9),
        name: data.product_data.name,
        description: data.product_data.description
      } : data.product,
      created: Date.now()
    })
  },
  
  subscriptions: {
    create: async (data) => ({
      id: 'sub_' + Math.random().toString(36).substr(2, 9),
      ...data,
      status: 'active',
      created: Date.now()
    })
  }
};

app.use(express.json({ limit: '10mb' }));

// Endpoint de santé
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'stripe-mcp',
    configured: !!process.env.STRIPE_API_KEY,
    mode: process.env.STRIPE_API_KEY?.startsWith('sk_test') ? 'test' : 'live'
  });
});

// MCP Protocol endpoint principal
app.post('/mcp', async (req, res) => {
  const { method, params, id } = req.body;
  let result = {};
  
  try {
    switch(method) {
      // Gestion des clients
      case 'customers.create':
        result = await stripe.customers.create(params);
        break;
      case 'customers.list':
        result = await stripe.customers.list();
        break;
        
      // Gestion des paiements
      case 'paymentIntents.create':
        result = await stripe.paymentIntents.create(params);
        break;
        
      // Gestion des prix
      case 'prices.create':
        result = await stripe.prices.create(params);
        break;
        
      // Gestion des abonnements
      case 'subscriptions.create':
        result = await stripe.subscriptions.create(params);
        break;
        
      // Informations de configuration
      case 'config.info':
        result = {
          configured: !!process.env.STRIPE_API_KEY,
          mode: process.env.STRIPE_API_KEY?.startsWith('sk_test') ? 'test' : 'live',
          publicKey: process.env.STRIPE_PUBLIC_KEY || 'not_configured',
          webhookConfigured: !!process.env.STRIPE_WEBHOOK_SECRET
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

// Endpoint pour les webhooks Stripe
app.post('/webhooks/stripe', express.raw({type: 'application/json'}), (req, res) => {
  // Simuler la vérification de signature webhook
  const sig = req.headers['stripe-signature'];
  
  console.log('Webhook reçu:', {
    type: req.body.type,
    signature: !!sig
  });
  
  res.json({ received: true });
});

app.listen(port, () => {
  console.log(`Stripe MCP Server listening on port ${port}`);
  console.log(`Mode: ${process.env.STRIPE_API_KEY?.startsWith('sk_test') ? 'TEST' : 'LIVE'}`);
});