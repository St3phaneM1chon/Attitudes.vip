# 💳 Exigences Stripe - Conformité Obligatoire

## 🔐 Sécurité PCI-DSS

### 1. Jamais Stocker de Données Cartes

```javascript
// ❌ INTERDIT - Violation PCI-DSS
const payment = {
  cardNumber: req.body.cardNumber,      // JAMAIS
  cvv: req.body.cvv,                    // JAMAIS
  expiryDate: req.body.expiry           // JAMAIS
};

// ✅ OBLIGATOIRE - Utiliser Stripe Elements
const stripe = Stripe(process.env.STRIPE_PUBLISHABLE_KEY);
const elements = stripe.elements();
const cardElement = elements.create('card');

// Tokenisation côté client
const { token, error } = await stripe.createToken(cardElement);
// Envoyer seulement le token au serveur
```

### 2. Webhooks Sécurisés

```javascript
// ✅ OBLIGATOIRE - Vérifier la signature
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

app.post('/stripe/webhooks', express.raw({type: 'application/json'}), (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  let event;
  try {
    // Vérification OBLIGATOIRE de la signature
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed');
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Traiter l'événement
  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentSuccess(event.data.object);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionCanceled(event.data.object);
      break;
  }
  
  res.json({received: true});
});
```

### 3. Strong Customer Authentication (SCA)

```javascript
// ✅ OBLIGATOIRE en Europe - 3D Secure
async function createPaymentIntent(amount, currency) {
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency,
    payment_method_types: ['card'],
    
    // SCA obligatoire
    confirmation_method: 'automatic',
    capture_method: 'automatic',
    
    // Metadata pour traçabilité
    metadata: {
      order_id: orderId,
      customer_id: customerId
    }
  });
  
  // Gérer l'authentification côté client
  const result = await stripe.confirmCardPayment(
    paymentIntent.client_secret,
    {
      payment_method: paymentMethodId,
      return_url: 'https://attitudes.vip/payment/confirm'
    }
  );
}
```

### 4. Gestion des Erreurs

```javascript
// ✅ OBLIGATOIRE - Gestion complète des erreurs
async function handleStripePayment(paymentMethodId, amount) {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'cad',
      payment_method: paymentMethodId,
      confirm: true
    });
    
    return { success: true, paymentIntent };
    
  } catch (error) {
    // Logger sans données sensibles
    logger.error('Stripe payment failed', {
      error: error.type,
      code: error.code,
      decline_code: error.decline_code,
      // PAS de données cartes
    });
    
    // Messages utilisateur appropriés
    switch (error.type) {
      case 'StripeCardError':
        return { 
          success: false, 
          userMessage: getLocalizedErrorMessage(error.code) 
        };
      case 'StripeInvalidRequestError':
        return { 
          success: false, 
          userMessage: 'Erreur de configuration' 
        };
      default:
        return { 
          success: false, 
          userMessage: 'Erreur de paiement' 
        };
    }
  }
}
```

### 5. Conformité KYC (Know Your Customer)

```javascript
// ✅ OBLIGATOIRE pour Stripe Connect
async function onboardConnectedAccount(accountData) {
  const account = await stripe.accounts.create({
    type: 'express', // ou 'standard', 'custom'
    country: 'CA',
    email: accountData.email,
    
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true }
    },
    
    business_type: accountData.businessType,
    
    // Informations requises
    business_profile: {
      mcc: accountData.mcc, // Merchant Category Code
      name: accountData.businessName,
      url: accountData.website
    },
    
    // Acceptation des ToS Stripe
    tos_acceptance: {
      date: Math.floor(Date.now() / 1000),
      ip: req.ip
    }
  });
  
  // Générer le lien d'onboarding
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: 'https://attitudes.vip/stripe/refresh',
    return_url: 'https://attitudes.vip/stripe/return',
    type: 'account_onboarding'
  });
  
  return accountLink.url;
}
```

### 6. Remboursements et Litiges

```javascript
// ✅ OBLIGATOIRE - Gestion des remboursements
async function processRefund(paymentIntentId, amount, reason) {
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount, // En cents
      reason: reason, // 'duplicate', 'fraudulent', 'requested_by_customer'
      
      metadata: {
        refunded_by: adminId,
        refund_reason_details: detailedReason
      }
    });
    
    // Logger pour audit
    await auditLog.record({
      action: 'REFUND_PROCESSED',
      paymentIntent: paymentIntentId,
      amount: amount,
      reason: reason,
      admin: adminId
    });
    
    return refund;
    
  } catch (error) {
    // Gérer les cas d'erreur
    if (error.code === 'charge_already_refunded') {
      throw new Error('Paiement déjà remboursé');
    }
    throw error;
  }
}

// Gestion des litiges (disputes)
async function handleDispute(dispute) {
  // Répondre dans les 7 jours
  await stripe.disputes.update(dispute.id, {
    evidence: {
      customer_communication: customerEmails,
      receipt: orderReceipt,
      service_documentation: serviceProof,
      shipping_documentation: shippingProof,
      refund_policy: refundPolicyUrl
    }
  });
}
```

### 7. Abonnements et Facturation

```javascript
// ✅ OBLIGATOIRE - Gestion correcte des abonnements
async function createSubscription(customerId, priceId) {
  // Créer ou récupérer le client
  let customer = await stripe.customers.retrieve(customerId)
    .catch(() => null);
    
  if (!customer) {
    customer = await stripe.customers.create({
      email: userEmail,
      metadata: { user_id: userId }
    });
  }
  
  // Créer l'abonnement
  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: priceId }],
    
    // Période d'essai
    trial_period_days: 14,
    
    // Comportement en cas d'échec
    payment_behavior: 'default_incomplete',
    payment_settings: {
      save_default_payment_method: 'on_subscription'
    },
    
    // Metadata
    metadata: {
      user_id: userId,
      plan_name: planName
    }
  });
  
  return subscription;
}

// Gestion des échecs de paiement
async function handleFailedPayment(invoice) {
  // Retry automatique configuré dans Stripe Dashboard
  // Après échecs, webhook 'customer.subscription.deleted'
  
  await notifyCustomer(invoice.customer, {
    type: 'payment_failed',
    action_required: true,
    update_payment_url: generatePaymentUpdateUrl(invoice.customer)
  });
}
```

### 8. Conformité Fiscale

```javascript
// ✅ OBLIGATOIRE - Taxes automatiques
const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  line_items: [{
    price: priceId,
    quantity: 1
  }],
  
  // Calcul automatique des taxes
  automatic_tax: {
    enabled: true
  },
  
  // Adresse de facturation requise
  billing_address_collection: 'required',
  
  // Collecte du numéro fiscal si B2B
  tax_id_collection: {
    enabled: true
  },
  
  customer_update: {
    address: 'auto',
    name: 'auto'
  }
});
```

### 9. Logs et Audit

```javascript
// ✅ OBLIGATOIRE - Traçabilité complète
const stripeLogger = {
  logPayment: async (event, result) => {
    await auditLog.create({
      timestamp: new Date(),
      event_type: event,
      stripe_id: result.id,
      amount: result.amount,
      currency: result.currency,
      status: result.status,
      // PAS de données sensibles
      metadata: {
        customer_id: result.customer,
        payment_method_type: result.payment_method_types
      }
    });
  },
  
  // Conserver selon PCI-DSS
  retention: {
    successful_payments: '7 years',
    failed_attempts: '1 year',
    disputes: '7 years after resolution'
  }
};
```

### 10. Rate Limiting

```javascript
// ✅ OBLIGATOIRE - Respecter les limites Stripe
const rateLimiter = {
  // Limites par défaut
  limits: {
    api_calls: '100 requests per second',
    webhook_events: 'No limit but process async',
    bulk_operations: '100 items per request'
  },
  
  // Implémentation
  implementation: rateLimit({
    windowMs: 1000, // 1 seconde
    max: 100, // 100 requêtes
    handler: (req, res) => {
      res.status(429).json({
        error: 'Too many requests to Stripe API'
      });
    }
  })
};
```

## 📋 Checklist Stripe

- [ ] Jamais stocker de données cartes
- [ ] Webhooks avec vérification de signature
- [ ] SCA/3D Secure implémenté
- [ ] Gestion d'erreurs complète
- [ ] KYC pour Connect
- [ ] Processus de remboursement
- [ ] Gestion des abonnements
- [ ] Taxes automatiques configurées
- [ ] Logs conformes PCI-DSS
- [ ] Rate limiting respecté

## 🚨 Violations = Suspension

Non-conformité peut entraîner :
- 🚫 Suspension du compte Stripe
- 💸 Amendes PCI-DSS (5k-100k$/mois)
- ⚖️ Responsabilité en cas de fraude
- 📰 Perte de réputation